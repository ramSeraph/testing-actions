import 'elm-pep';
import '/node_modules/ol/ol.css';
import '/node_modules/ol-ext/dist/ol-ext.css'; // TODO: too big?
import '/assets/css/maps/SOI/status.css';

import { Map, View, Feature } from 'ol';
import { Style, Fill, Stroke } from 'ol/style';
import { useGeographic } from 'ol/proj';
import { Polygon } from 'ol/geom';
import { Vector as VectorSource } from 'ol/source';
import { Vector as VectorLayer } from 'ol/layer';
import { GeoJSON } from 'ol/format';

import LegendItem from 'ol-ext/legend/Item';
import Legend from 'ol-ext/legend/Legend';
import LegendControl from 'ol-ext/control/Legend';
import Popup from 'ol-ext/overlay/Popup';

import { getStatusData, makeLink } from './common';
import { DEFAULT_PADDING, updateMap, getInteractions, getControls, getTextStyle } from './ol_common';


// TODO: move to pmtiles
// TODO: highlight sheet on hover
//
// unlikely to be fixed
// TODO: legend/popup should block click events.. 
// TODO: adjust viewport on fullscreen.. show what was being shown before

const INDEX_URL = 'https://storage.googleapis.com/soi_data/index.geojson';
// STATES_URL = 'https://raw.githubusercontent.com/datameet/maps/master/website/docs/data/geojson/states.geojson';

const INDEX_ATTRIBUTION = makeLink("https://onlinemaps.surveyofindia.gov.in/FreeOtherMaps.aspx", "SOI OSM Index") +
                          "(simplified), Data: " +
                          makeLink('https://onlinemaps.surveyofindia.gov.in/FreeMapSpecification.aspx', '1:50000 Open Series Maps') +
                          ' &copy; ' +
                          makeLink('https://www.surveyofindia.gov.in/pages/copyright-policy', 'Survey Of India');
// STATES_ATTRIBUTION = makeLink("https://github.com/datameet/maps/blob/master/website/docs/data/geojson/states.geojson", "Datameet State boundaries");


const baseStyle = new Style({
    stroke: new Stroke({
        color: 'black',
        width: 0.5,
    }),
    fill: new Fill({
        color: 'rgba(255,255,255,0.9)',
    }),
});

const statesStyle = new Style({
    stroke: new Stroke({
        color: 'white',
        width: 2,
    }),
    fill: new Fill({
        color: 'rgba(255,255,255,0.0)',
    }),
});


const parsed_color = '#f4f4f4';
const found_color = '#b3b3b3';
const not_found_color = '#5e5e5e';

function getTilePopoverContent(sheetNo, statusMap) {
    const sheetInfo = statusMap[sheetNo];

    var html = `<b text-align="center">${sheetNo}</b><br>`
    if (sheetInfo === undefined) {
        return html;
    }
    if ('pdfUrl' in sheetInfo && sheetInfo['pdfUrl'] !== null) {
        html += ' ';
        html += `<a target="_blank" href=${sheetInfo['pdfUrl']}>pdf</a>`;
    }
    if ('gtiffUrl' in sheetInfo && sheetInfo['gtiffUrl'] !== null) {
        html += ' ';
        html += `<a target="_blank" href=${sheetInfo['gtiffUrl']}>gtiff</a>`;
    }
    //TODO: add link to demo map
    return html;
}


function getStyleFn(statusMap) {
    return (f) => {
        const sheetNo = f.get('EVEREST_SH');
        const sheetInfo = statusMap[sheetNo];
        if (sheetInfo === undefined) {
            baseStyle.getStroke().setColor('grey');
            baseStyle.getFill().setColor('rgba(255,255,255,0.0)');
        } else {
            const status = sheetInfo['status'];
            baseStyle.getStroke().setColor('black');
            var color;
            if (status === 'not_found') {
                color = not_found_color;
            } else if (status === 'found') {
                color = found_color;
            } else if (status === 'parsed') {
                color = parsed_color;
            }
            baseStyle.getFill().setColor(color);
        }
        return baseStyle;
    };
}

function getLegendCtrl(textStyle) {

    var legend = new Legend({
        'title': 'Legend',
        'size': [15, 15],
        // 'maxWidth':     
        'margin': 5,
        'textStyle': textStyle,
        'style': getStyleFn({
            'Available':     { 'status': 'parsed' },
            'Not Available': { 'status': 'not_found' },
            'Not Parsable':  { 'status': 'found' }
        })
    });
    const legendSymbolPoints = [[[0.0, 0.0], [0.0, 1.0], [1.0, 1.0], [1.0, 0.0], [0.0, 0.0]]];
    for (let s of ['Available', 'Not Available', 'Not Parsable', 'Info Unavailable']) {
        legend.addItem(new LegendItem({
            'title': s,
            'textStyle': textStyle,
            'feature': new Feature({
                'EVEREST_SH': s,
                'geometry': new Polygon(legendSymbolPoints)
            }),
        }));
    }
    const legendCtrl = new LegendControl({
        legend: legend,
        collapsed: true
    });

    return legendCtrl;
}

document.addEventListener("DOMContentLoaded", () => {

    var statusElem = document.getElementById('call_status');
    var setStatus = (msg, err) => {
        var alreadyError = false;
        const prevMsg = statusElem.innerHTML;
        if (statusElem.hasAttribute("class")) {
            alreadyError = true;
        }
        if (err === true) {
            if (alreadyError === true) {
                msg = prevMsg + '<br>' + msg;
            } else {
                statusElem.setAttribute("class", "error");
            }
            statusElem.innerHTML = msg;
        } else if (alreadyError !== true) {
            statusElem.removeAttribute("class");
            statusElem.innerHTML = msg;
        }
    };

    var sheetStatusMap = {};
    getStatusData((err, data) => {
        if (err !== null) {
            console.log(err);
            setStatus("Failed to get status list", true);
        } else {
            Object.assign(sheetStatusMap, data);
            setStatus('', false);
        }
    });

    useGeographic();

    const map = new Map({
        interactions: getInteractions(),
        controls: getControls(),
        target: 'map',
        view:  new View({
            padding: DEFAULT_PADDING,
            showFullExtent: true,
            maxZoom: 9,
            center: [0, 0],
            zoom: 2,
        })
    });

    const createLayer = (url, srcLabel, attribution, style, statusFn) => {
    
        const src = new VectorSource({
            format: new GeoJSON(),
            url: url,
            overlaps: false,
            attributions: [ attribution ]
        });
        const layer = new VectorLayer({
            background: 'black',
            source: src,
            style: style
        });
    
        src.on('featuresloadstart', (e) => {
            statusFn(`Loading ${srcLabel} features..`, false);
        });
        src.on('featuresloadend', (e) => {
            statusFn(``, false);
            updateMap(map, map.getTargetElement(), src.getExtent());
        });
        src.on('featuresloaderror', (e) => {
            statusFn(`Failed to load ${srcLabel}`, true);
        });
        return layer;
    };

    const indexLayer = createLayer(INDEX_URL, 'Index', INDEX_ATTRIBUTION, getStyleFn(sheetStatusMap), setStatus);
    map.addLayer(indexLayer);

    // const statesLayer = createLayer(STATES_URL, 'State Boundaries', STATES_ATTRIBUTION, statesStyle, setStatus);
    // map.addLayer(statesLayer);


    function showPopup(e, pop, contentFn) {
        const features = map.getFeaturesAtPixel(e.pixel);
        const feature = features.length ? features[0] : undefined;
        if (feature === undefined) {
            pop.hide();
            return;
        }
        const html = contentFn(feature);
        if (html === null) {
            pop.hide();
            return;
        }
        pop.show(e.coordinate, html);
    }

    var popup = new Popup({
        popupClass: "tooltips black", //"tooltips", "warning" "black" "default", "tips", "shadow",
        closeBox: false,
        positioning: 'center-left',
        autoPan: {
          animation: { duration: 250 }
        }
    });
    map.addOverlay(popup);
    var tooltip = new Popup({
        popupClass: "tooltips black", //"tooltips", "warning" "black" "default", "tips", "shadow",
        closeBox: false,
        positioning: 'center-left',
        autoPan: {
          animation: { duration: 250 }
        }
    });

    let activePopupSheetNo = null;
    let activeTooltipSheetNo = null;
    map.addOverlay(tooltip);
    map.on('click', function(e) {
        showPopup(e, popup, (f) => {
            const sheetNo = f.get('EVEREST_SH');
            if (tooltip.getVisible() && sheetNo === activeTooltipSheetNo) {
                tooltip.hide();
            }
            activePopupSheetNo = sheetNo;
            return getTilePopoverContent(sheetNo, sheetStatusMap);
        });
    });
    map.on('pointermove', function(e) {
        showPopup(e, tooltip, (f) => {
            const sheetNo = f.get('EVEREST_SH');
            if (popup.getVisible() && sheetNo === activePopupSheetNo) {
                return null;
            }
            activeTooltipSheetNo = sheetNo;
            return `<b text-align="center">${sheetNo}</b>`;
        });
    });

    map.addControl(getLegendCtrl(getTextStyle(document.body)));
    map.on('loadstart', function () {
        setStatus('Loading Map..', false);
    });
    map.on('loadend', function () {
        setStatus('', false);
    });
});
