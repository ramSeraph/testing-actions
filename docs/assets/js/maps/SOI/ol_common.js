import { createCenterConstraint } from 'ol/View';
import { Text, Fill } from 'ol/style';
import { FullScreen as FullScreenControl, defaults as controlDefaults } from 'ol/control';
import { Link, PinchRotate, defaults as interactionDefaults } from 'ol/interaction';
import { getSize as getExtentSize, getCenter as getExtentCenter } from 'ol/extent';
import { createProjection, fromUserExtent as convertFromUserExtent } from 'ol/proj';

export const DEFAULT_PADDING = Array(4).fill(50);

export function makeLink(url, text) {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

function hasUrlParams() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    // console.log("url_params", params);
    const keysForLink = [ 'x', 'y', 'z', 'r', 'l' ];
    for (const k of keysForLink) {
        if (params.has(k)) {
            return true;
        }
    }
    return false;
}

const areUrlParamsAlreadySet = hasUrlParams();

// copied from openlayers code
function getElementSize(el) {
    const computedStyle = getComputedStyle(el);
    const width =
        el.offsetWidth -
        parseFloat(computedStyle['borderLeftWidth']) -
        parseFloat(computedStyle['paddingLeft']) -
        parseFloat(computedStyle['paddingRight']) -
        parseFloat(computedStyle['borderRightWidth']);
    const height =
        el.offsetHeight -
        parseFloat(computedStyle['borderTopWidth']) -
        parseFloat(computedStyle['paddingTop']) -
        parseFloat(computedStyle['paddingBottom']) -
        parseFloat(computedStyle['borderBottomWidth']);
    return [width, height];
}

export function updateMap(map, el, extent) {
    const eCenter = getExtentCenter(extent);
    const eSize = getExtentSize(extent);

    // update map div size 
    const tSize = getElementSize(el);
    const expectedHeight = Math.ceil(eSize[1] * (tSize[0]/eSize[0]));
    el.style.height = `${expectedHeight}px`;
    map.updateSize();


    // constrain the zoom level
    let view = map.getView();
    const size = map.getSize();
    const resolution = view.getResolutionForExtent(extent, size);
    const zoom = view.getZoomForResolution(resolution);
    view.setMinZoom(zoom);

    // constrain extent as well
    let constraints = view.getConstraints();
    constraints.center = createCenterConstraint({
        extent: convertFromUserExtent(extent, createProjection('EPSG:3857')),
        constrainOnlyCenter: false
    });


    if (areUrlParamsAlreadySet) {
        return;
    }

    view.setCenter(eCenter);
    view.setZoom(zoom);
    view.fit(extent, { padding: DEFAULT_PADDING });
}

export function getControls() {
    let controls = controlDefaults();
    let fControl = new FullScreenControl();
    controls.push(fControl);
    return controls;
}

function removePinchRotate(interactions) {
    let pinchIndex = -1;
    for (let i = 0; i < interactions.getLength(); i++) {
        if (interactions.item(i) instanceof PinchRotate) {
            pinchIndex = i;
            break;
        }
    }
    if (pinchIndex !== -1) {
        interactions.removeAt(pinchIndex);
    }
}

export function getInteractions() {
    let interactions = interactionDefaults();
    interactions.push(new Link());
    removePinchRotate(interactions);
    return interactions;
}

function getDocStyle(el) {
    const style = getComputedStyle(el);
    const fontFamily = style['fontFamily'];
    const fontSize = style['fontSize'];
    const lineHeight = style['lineHeight'];
    const color = style['color'];
    const backgroundColor = style['backgroundColor'];
    return { fontFamily, fontSize, lineHeight, color, backgroundColor };
}

export function getTextStyle(el) {
    let { fontFamily, fontSize, lineHeight, color, backgroundColor } = getDocStyle(el);
    const olTextStyle  = new Text({
      font: `${fontSize}/${lineHeight} ${fontFamily}`,
      fill: new Fill({
        color: color
      }),
      backgroundFill: new Fill({
        color: backgroundColor
      })
    });
    return olTextStyle;
}
