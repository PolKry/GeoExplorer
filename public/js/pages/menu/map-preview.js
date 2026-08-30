let previewLoader = document.getElementById("preview-loader");
// TODO: when hovering over a country  the previous country will still be highlithed (brightness)
function loadCountryPreview(mapCodes = [], category) {
    if (!Array.isArray(mapCodes) || mapCodes.length === 0) {
        return;
    }

    const staticMap = L.map('static-map', {
        zoomControl: false,        // hide zoom buttons
        dragging: false,           // prevent panning
        scrollWheelZoom: false,    // disable scroll wheel zoom
        doubleClickZoom: false,    // disable zoom on double click
        boxZoom: false,            // disable zooming by dragging a box
        touchZoom: false,          // disable pinch zoom on touch devices
        keyboard: false,           // disable keyboard controls
        attributionControl: false, // hide attribution
        worldCopyJump: true
    }).setView([0, 0], 2);

    staticMap.createPane('backgroundPane');
    staticMap.createPane('highlightPane');

    staticMap.getPane('backgroundPane').style.zIndex = 200;
    staticMap.getPane('highlightPane').style.zIndex = 400;

    const stripePattern = new L.StripePattern({
        color: "#666",
        weight: 2,
        opacity: 0.5,
        angle: 45
    });

    stripePattern.addTo(staticMap);

    fetch('/data/world.geojson')
        .then(r => r.json())
        .then(world => {
            L.geoJSON(world, {
                pane: 'backgroundPane',
                style: () => ({
                    fillPattern: stripePattern,
                    fillOpacity: 1,
                    color: "#444",
                    weight: 1
                })
            }).addTo(staticMap);
        });

    fetch('/data/reduced.geojson')
        .then(r => r.json())
        .then(reduced => {
            const highlighted = [];

            const highlightLayer = L.geoJSON(reduced, {
                pane: 'highlightPane',
                style: feature => {
                    const code = feature.properties.ISO_A2_EH;

                    if (mapCodes.includes(code)) {
                        highlighted.push(feature);
                        if (category === "Country") {
                            return {
                                fillColor: "#00ffae",
                                fillOpacity: 1,
                                stroke: false,
                                weight: 0,
                                interactive: false
                            };
                        } else {
                            return {
                                fillColor: "#00ffae",
                                fillOpacity: 1,
                                color: "#00b77dff", // dark green border
                                weight: 1,
                                interactive: false
                            };
                        }
                    }

                    return {
                        fillOpacity: 0,
                        stroke: false,
                        weight: 0
                    };
                },
                onEachFeature: (feature, layer) => {
                    if (mapCodes.includes(feature.properties.ISO_A2_EH)) {
                        layer.bringToFront();
                    }
                }
            }).addTo(staticMap);

            if (highlighted.length) {
                if (category === "Country") {
                    const bounds = L.geoJSON(highlighted).getBounds();
                    staticMap.fitBounds(bounds, {
                        animate: false,
                        paddingTopLeft: [20, 20],
                        paddingBottomRight: [20, 120]
                    });
                } else {
                    staticMap.setView([0, 0], 1, {
                        animate: false
                    });
                }

            }
        });

    staticMap.whenReady(() => {
        staticMap.invalidateSize(true);
        staticMap.getContainer().classList.add("loaded");
        previewLoader.style.opacity = 0;
        setTimeout(() => {
            previewLoader.style.display = "none";
        }, 50);

        console.log('Map is fully initialized and sized');
    });
}