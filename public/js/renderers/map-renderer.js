import {
    fetchWorldGeoJson,
    fetchReducedGeoJson
} from "../api/map-api.js";

// Render the basic map section
export async function renderMapSection(mapData) {
    try {
        const title = document.getElementById("mapName");
        const author = document.getElementById("mapAuthor");
        const date = document.getElementById("mapDate");
        const description = document.getElementById("mapDescription");
        const thumbnail = document.getElementById("mapThumbnail");
        const thumbnailLoader = document.getElementById("icon-loader");

        if (!title || !author || !date || !description || !thumbnail) {
            console.error("Some elements are missing in the DOM!");
            return;
        }

        title.textContent = mapData.name;
        author.innerHTML = "by <strong>" + mapData.author + "</strong>";
        date.textContent = "Created: " + mapData.date;
        description.textContent = mapData.description;
        thumbnail.src = mapData.image;

        // Icon placeholder
        thumbnail.classList.add("loaded");

        thumbnailLoader.style.opacity = 0;
        setTimeout(() => {
            thumbnailLoader.style.display = "none";
        }, 50);
    } catch (error) {
        console.error("Error loading map data:", error);
    }
}

export function renderTags(tags, difficulty) {
    const difficultySpan = document.createElement('span');
    const tagContainer = document.getElementById("tag-container");

    difficultySpan.className = 'tag';
    difficultySpan.innerHTML = "Map Difficulty: <b>" + difficulty + "</b>";
    tagContainer.appendChild(difficultySpan);
    tags.forEach(async (tag) => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.textContent = tag.name;
        tagSpan.title = tag.description;

        tagContainer.appendChild(tagSpan);
    });
}

// Render the map preview with highlighted countries
export function renderCountryPreview(codes = [], category) {
    const previewLoader = document.getElementById("preview-loader");

    if (!Array.isArray(codes) || codes.length === 0) {
        return;
    }

    const staticMap = L.map("static-map", {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        touchZoom: false,
        keyboard: false,
        attributionControl: false,
        worldCopyJump: true
    }).setView([0, 0], 2);

    staticMap.createPane("backgroundPane");
    staticMap.createPane("highlightPane");

    staticMap.getPane("backgroundPane").style.zIndex = 200;
    staticMap.getPane("highlightPane").style.zIndex = 400;

    const stripePattern = new L.StripePattern({
        color: "#666",
        weight: 2,
        opacity: 0.5,
        angle: 45
    });

    stripePattern.addTo(staticMap);

    loadWorldLayer(staticMap, stripePattern);
    loadHighlightLayer(staticMap, codes, category);

    staticMap.whenReady(() => {
        staticMap.invalidateSize(true);
        staticMap.getContainer().classList.add("loaded");

        if (previewLoader) {
            previewLoader.style.opacity = 0;

            setTimeout(() => {
                previewLoader.style.display = "none";
            }, 50);
        }

        console.log("Map is fully initialized and sized");
    });

    return staticMap;
}

function loadWorldLayer(map, stripePattern) {
    fetchWorldGeoJson()
        .then(world => {
            L.geoJSON(world, {
                pane: "backgroundPane",
                style: () => ({
                    fillPattern: stripePattern,
                    fillOpacity: 1,
                    color: "#444",
                    weight: 1
                })
            }).addTo(map);
        })
        .catch(error => {
            console.error("Failed to load world map:", error);
        });
}

function loadHighlightLayer(map, codes, category) {
    fetchReducedGeoJson()
        .then(reduced => {
            const highlighted = [];

            const highlightLayer = L.geoJSON(reduced, {
                pane: "highlightPane",
                style: feature => {
                    const code = feature.properties.ISO_A2_EH;

                    if (codes.includes(code)) {
                        highlighted.push(feature);

                        if (category === "Country") {
                            return {
                                fillColor: "#00ffae",
                                fillOpacity: 1,
                                stroke: false,
                                weight: 0,
                                interactive: false
                            };
                        }

                        return {
                            fillColor: "#00ffae",
                            fillOpacity: 1,
                            color: "#00b77dff",
                            weight: 1,
                            interactive: false
                        };
                    }

                    return {
                        fillOpacity: 0,
                        stroke: false,
                        weight: 0
                    };
                },
                onEachFeature: (feature, layer) => {
                    if (codes.includes(feature.properties.ISO_A2_EH)) {
                        layer.bringToFront();
                    }
                }
            }).addTo(map);

            if (highlighted.length) {
                if (category === "Country") {
                    const bounds = L.geoJSON(highlighted).getBounds();

                    map.fitBounds(bounds, {
                        animate: false,
                        paddingTopLeft: [20, 20],
                        paddingBottomRight: [20, 120]
                    });
                } else {
                    map.setView([0, 0], 1, {
                        animate: false
                    });
                }
            }
        })
        .catch(error => {
            console.error("Failed to load reduced map:", error);
        });
}

// Redering user score
const thresholds = {
    none: 0,
    bronze: 8000,
    silver: 15000,
    gold: 22000,
    diamond: 25000
};

const colors = {
    none: "#1d1d1dff",
    bronze: "#a57c5a",
    silver: "#b8b8b8",
    gold: "#e7c025ff",
    diamond: "#66cccc",
    empty: "#333",
    border: "#444"
};

function getTierColor(score) {
    if (score >= thresholds.diamond) return colors.diamond;
    if (score >= thresholds.gold) return colors.gold;
    if (score >= thresholds.silver) return colors.silver;
    if (score >= thresholds.bronze) return colors.bronze;
    if (score >= thresholds.none) return colors.none;
    return colors.empty;
}

function updateTierLabelPositions(maxScore = 25000) {
    document.getElementById("tierNone").style.left = `${(thresholds.none / maxScore) * 100}%`;
    document.getElementById("tierBronze").style.left = `${(thresholds.bronze / maxScore) * 100}%`;
    document.getElementById("tierSilver").style.left = `${(thresholds.silver / maxScore) * 100}%`;
    document.getElementById("tierGold").style.left = `${(thresholds.gold / maxScore) * 100}%`;
    document.getElementById("tierDiamond").style.left = `${(thresholds.diamond / maxScore) * 100}%`;
}

function updateTierSeparators(maxScore = 25000) {
    document.getElementById("sepBronze").style.left =
        (thresholds.bronze / maxScore * 100) + "%";

    document.getElementById("sepSilver").style.left =
        (thresholds.silver / maxScore * 100) + "%";

    document.getElementById("sepGold").style.left =
        (thresholds.gold / maxScore * 100) + "%";

    document.getElementById("sepDiamond").style.left =
        (thresholds.diamond / maxScore * 100) - 0.3 + "%";
}

export function renderUserScore(score, maxScore = 25000) {
    const thumb = document.getElementById("userScoreThumb");
    const track = document.querySelector(".slider-track");
    const valueText = document.getElementById("userScoreValue");

    updateTierLabelPositions(maxScore);
    updateTierSeparators(maxScore);

    const percent = Math.min(score / maxScore, 1) * 100;
    thumb.style.left = `${percent}%`;
    valueText.textContent = `${score.toLocaleString()} pts`;

    // Switch color according to thresholds
    const tierColor = getTierColor(score);

    // Base fill + empty
    const baseGradient = `linear-gradient(to right, 
    ${tierColor} 0%, 
    ${tierColor} ${percent}%, 
    ${colors.empty} ${percent}%, 
    ${colors.empty} 100%)`;

    // Overlay
    const glassOverlay = `
    linear-gradient(
      to bottom, 
      rgba(255,255,255,0.5) 0%, 
      rgba(255,255,255,0.15) 20%, 
      rgba(0,0,0,0.1) 80%, 
      rgba(0,0,0,0.0) 100%
    )
  `;

    track.style.background = `${baseGradient}, ${glassOverlay}`;
    track.style.backgroundBlendMode = "overlay";
    track.style.border = `2px solid ${colors.border}`;
    track.style.borderRadius = "10px";

    // Thumb glow
    thumb.style.boxShadow = `0 0 5px ${tierColor}, 0 3px 8px rgba(0,0,0,0.5)`;
}