import 'elm-pep';
import '/node_modules/ol/ol.css';
import '/node_modules/ol-ext/dist/ol-ext.css'; // TODO: too big?
import '/assets/css/maps/SOI/compare.css';

import { Map, View, Feature } from 'ol';
import { Style, Fill, Stroke } from 'ol/style';
import { useGeographic } from 'ol/proj';
import { Polygon } from 'ol/geom';
import { Vector as VectorSource, XYZ } from 'ol/source';
import { Vector as VectorLayer, Tile, Group } from 'ol/layer';
import { GeoJSON } from 'ol/format';
import { Zoom as ZoomControl, FullScreen as FullScreenControl } from 'ol/control';

import ClipMap from 'ol-ext/interaction/ClipMap';
import Synchronize from 'ol-ext/interaction/Synchronize';
import SwipeMap from 'ol-ext/control/SwipeMap';
import LayerSwitcher from 'ol-ext/control/LayerSwitcher';

import { makeLink, updateMap, getInteractions } from './ol_common';

const GRID_LAYER_INDEX = 'SOI OSM Index Grid';

const boundaryStyle = new Style({
    stroke: new Stroke({
        color: 'black',
        width: 2,
    }),
    fill: new Fill({
        color: 'rgba(255,255,255,0.0)',
    }),
});

const gridStyle = new Style({
    stroke: new Stroke({
        color: 'black',
        width: 1,
    }),
    fill: new Fill({
        color: 'rgba(255,255,255,0.0)',
    }),
});

function getMap(target, layers) {
    return new Map({
        controls: [],
        interactions: getInteractions(),
        target: target,
        view: new View({
            //smoothExtentConstraint: false,
            zoom: 2,
            maxZoom: 16,
            center: [0, 0]
        }),
    });
}

function getSOILayer() {
    const attribution = makeLink('https://onlinemaps.surveyofindia.gov.in/FreeMapSpecification.aspx', '1:50000 Open Series Maps') +
                        ' &copy; ' +
                        makeLink('https://www.surveyofindia.gov.in/pages/copyright-policy', 'Survey Of India');
    const src = new XYZ({
        url: 'https://storage.googleapis.com/soi_data/export/tiles/{z}/{x}/{y}.webp',
        attributions: [attribution],
    });
    return new Tile({
        visible: true,
        background: 'grey',
        source: src,
        maxZoom: 15,
    });
}

function getGridSource() {
    const src = new VectorSource({
        format: new GeoJSON(),
        url: 'https://storage.googleapis.com/soi_data/index.geojson',
        overlaps: false,
        attributions: [
            makeLink("https://onlinemaps.surveyofindia.gov.in/FreeOtherMaps.aspx", "SOI OSM Index(simplified)")
        ]
    });
    return src;
}

function getIndiaOutlineSource(map1, map2, container, statusFn) {
    const url = 'https://storage.googleapis.com/soi_data/polymap15m_area.geojson';
    const src = new VectorSource({
        format: new GeoJSON(),
        url: url,
        overlaps: false,
        attributions: [
            makeLink("https://surveyofindia.gov.in/pages/outline-maps-of-india", "SOI India Outline")
        ]
    });

    const srcLabel = 'India Outline';
 
    src.on('featuresloadstart', (e) => {
        statusFn(`Loading ${srcLabel} features..`, false);
    });
    src.on('featuresloadend', (e) => {
        statusFn(``, false);
        updateMap(map1, container, src.getExtent());
        updateMap(map2, container, src.getExtent());
    });
    src.on('featuresloaderror', (e) => {
        statusFn(`Failed to load ${srcLabel}`, true);
    });
    return src;
}


function getLayerGroup() {

    const osmLayer = new Tile({
        source: new XYZ({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', 
            attributions: [
                '&copy; ' + makeLink('https://www.openstreetmap.org/copyright', 'OpenStreetMap contributors') 
            ],
        }),
        baseLayer: true,
        visible: true,
        maxZoom: 19,
        title: 'OpenStreetMap',
    });
    const gStreetsLayer = new Tile({
        source: new XYZ({
            url: 'https://mt{0-3}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
            attributions: [
                'Map data &copy; 2023 Google'
            ]
        }),
        baseLayer: true,
        visible: false,
        maxZoom: 20,
        title: 'Google Streets',
    });
    const gHybridLayer = new Tile({
        source: new XYZ({
            url: 'https://mt{0-3}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
            attributions: [
                'Map data &copy; 2023 Google',
                'Imagery &copy; 2023 TerraMetrics'
            ]
        }),
        baseLayer: true,
        visible: false,
        maxZoom: 20,
        title: 'Google Hybrid',
    });
    const esriWorldLayer = new Tile({
        source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attributions: [
                'Tiles &copy; Esri',
                'Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, ' +
                'Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            ]
        }),
        baseLayer: true,
        visible: false,
        maxZoom: 20,
        title: 'ESRI Satellite',
    });
    const otmLayer = new Tile({
        source: new XYZ({
            url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png', 
            attributions: [
                'Map data: &copy; ' + makeLink('OpenStreetMap contributors'),
                makeLink('http://viewfinderpanoramas.org', 'SRTM'),
                'Map style: &copy; ' +
                makeLink('https://opentopomap.org', 'OpenTopoMap') +
                ' (' + makeLink('https://creativecommons.org/licenses/by-sa/3.0/', 'CC-BY-SA') + ')'
            ]
        }),
        baseLayer: true,
        visible: false,
        maxZoom: 17,
        title: 'OpenTopoMap'
    });

    return new Group({
        title: 'Base Layers',
        openInLayerSwitcher: true,
        layers: [
            gHybridLayer,
            gStreetsLayer,
            esriWorldLayer,
            otmLayer,
            osmLayer,
        ]
    });
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

    useGeographic();

    var map1 = getMap('map1');
    var map2 = getMap('map2');

    const soiLayer = getSOILayer();
    map1.addLayer(soiLayer);
    const layerGroup = getLayerGroup();
    map2.addLayer(layerGroup);

    var compareElem = document.getElementById('compare');
    var indiaOutlineSrc = getIndiaOutlineSource(map1, map2, compareElem, setStatus);
    var addOutlineLayer = (map) => {
        map.addLayer(new VectorLayer({
            title: 'SOI India Outline',
            visible: true,
            source: indiaOutlineSrc,
            style: boundaryStyle,
            displayInLayerSwitcher: false
        }));
    };
    addOutlineLayer(map1);
    addOutlineLayer(map2);

    const gridSrc = getGridSource();
    var getGridLayer = () => {
        return new VectorLayer({
            title: GRID_LAYER_INDEX,
            visible: false,
            source: gridSrc,
            style: gridStyle,
            displayInLayerSwitcher: true
        });
    };
    const gridLayer1 = getGridLayer();
    const gridLayer2 = getGridLayer();
    map1.addLayer(gridLayer1);
    map2.addLayer(gridLayer2);

    var clip = new ClipMap({ radius: 150 });
    var swipe = new SwipeMap({ right: true });
    var layerSwitcher = new LayerSwitcher({
        reordering: false,
        noScroll: true,
        mouseover: true,
    });
    layerSwitcher.on('layer:visible', (e) => {
        console.log('layer:visible', e);
        const l = e.layer;
        if (l.get('title') === GRID_LAYER_INDEX) {
            gridLayer1.setVisible(l.getVisible());
        }
    });
    layerSwitcher.on('select', (e) => {
        console.log(e);
    });
    map2.addControl(layerSwitcher);

    // TODO: maxZoom not working
    // TODO: add attributions
    // TODO: make disbaled zoom obvious( maybe fractional zooms are the problem?), lighten hovers
    // TODO: zoom snapping doesn't match between panes
    // TODO: layer switcher doesn't play well with slider
    // TODO: style layerswitcher
    // TODO: disable switching off base layers
    // TODO: add mode switcher
    // TODO: add legend
    // TODO: add overview map
    // TODO: add standalone mode
    // TODO: add hover support for grid
    const addControls = (map) => {
        map.addControl(new ZoomControl());
        map.addControl(new FullScreenControl({source: 'compare'}));
    };

    // addControls(map1);
    addControls(map2);

    map1.addInteraction(new Synchronize({ maps: [map2] }));
    map2.addInteraction(new Synchronize({ maps: [map1] }));

    var currentMode;
    function setMode(mode) {
        if (mode) {
            currentMode = mode;
            // Remove tools
            map2.removeControl(swipe);
            map2.removeInteraction(clip);
            // Set interactions
            switch (mode) {
                case 'swipev':
                case 'swipeh': {
                    map2.addControl(swipe);
                    swipe.set('orientation', (mode==='swipev' ? 'vertical' : 'horizontal'));
                    break;
                }
                case 'clip': {
                    map2.addInteraction(clip);
                    break;
                }
            }
            // Update position
            document.getElementById("compare").className = mode;
        }
        map1.updateSize();
        map2.updateSize();
    }
    setMode('swipev');
});
