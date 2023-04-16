/*
BOUNDS_INDIA = [[61.1113787, 2.5546079], [101.395561, 39.6745457]]

function updateMapIndia(map) {
    const indiaExtent = ol.extent.boundingExtent(BOUNDS_INDIA);
    const indiaCenter = ol.extent.getCenter(indiaExtent);
    const size = map.getSize();
    let view = map.getView();
    const resolution = view.getResolutionForExtent(indiaExtent, size);
    const zoom = view.getZoomForResolution(resolution);
    const intZoom = Math.floor(zoom);
    view.setZoom(intZoom);
    view.setMinZoom(intZoom);
    view.setCenter(indiaCenter);
    view.fit(indiaExtent);
}
*/

    /*

    // NOTE: didn't work
    let fControl = new ol.control.FullScreen();
    var adjustToPrevState = (e) => {
        console.log(e);
        const map = e.target.getMap();
        if (!map) {
            return;
        }
        let view = map.getView();
        let { viewState, extent } = view.getViewStateAndExtent();
        view.fit(extent);
    };
    fControl.on('enterfullscreen', adjustToPrevState);
    fControl.on('leavefullscreen', adjustToPrevState);

    */

