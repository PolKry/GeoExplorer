import { fetchLeaderboard } from "../../api/leaderboard-api.js";
import { getHighestScore } from "../../api/user-api.js";
import { startPoints } from "../../api/game-starter-api.js";
import { fetchMapData } from "../../api/map-api.js";
import { renderMapLeaderboard } from "../../renderers/leaderboard-renderer.js";
import { formatTimeInSec, formatTimeInMS } from "../../utils/time.js";
import { renderMapSection, renderTags, renderCountryPreview, renderUserScore } from "../../renderers/map-renderer.js";
import { showLoadingScreen, hideLoadingScreen } from "../../components/loading-screen.js";
import { showMessage } from "../../utils/toast.js";

let movingModeValue = null;
let mapName;
let mapSrcName;
let category;
let codes;
let startInProgress = false;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("play-button").addEventListener("click", startPointsMode);

  await loadMapSection();
  await loadMapPreview();
  await loadUserScore();
  await loadLeaderboard();
});

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;

  const playButton = document.getElementById("play-button");
  if (!playButton || playButton.disabled || startInProgress || document.body.classList.contains("loading")) {
    return;
  }

  event.preventDefault();
  playButton.click();
});

window.addEventListener("pageshow", () => {
  startInProgress = false;

  const playButton = document.getElementById("play-button");
  if (playButton) {
    playButton.disabled = false;
  }

  hideLoadingScreen();
});

async function loadMapSection() {
  const params = new URLSearchParams(window.location.search);
  const map = params.get("map");

  if (!map) {
    console.warn("No map specified in URL.");
    return;
  }

  const data = await fetchMapData(map);
  console.log("Map Data:", data);
  if (!data) {
    console.error("Failed to fetch map data");
    return;
  }

  mapSrcName = data.srcName;
  mapName = data.name;

  category = data.category;
  codes = data.codes;

  renderMapSection(data);
  renderTags(data.tags, data.difficulty);
}

async function loadMapPreview() {
  console.log("Codes: " + codes);

  if (!codes) {
    const mapContainer = document.getElementById("map-container");
    mapContainer.style.display = "none";
    return;
  }

  if (category === "Country") {
    renderCountryPreview([mapSrcName], category);
  } else {
    renderCountryPreview(codes, category);
  }
}

async function loadLeaderboard() {
  const period = "total";
  const playersCount = 15;
  const topPlayers = await fetchLeaderboard(mapSrcName, period, playersCount);

  renderMapLeaderboard("leaderboard-list", topPlayers, formatTimeInMS);
}

async function loadUserScore() {
  if (!codes) throw new Error("Map codes are required to load user score.");

  const data = await getHighestScore(mapSrcName);
  if (!data) {
    console.error("Failed to fetch user data");
    return;
  }
    
  // Render the user's score (data.highestScore is the users top score for this map)
  renderUserScore(data.highestScore);
}

// Map Settings
const timeRange = document.getElementById('timeRange');
const timeValue = document.getElementById('timeValue');

timeRange.addEventListener('input', () => {
  if (timeRange.value == 5) {
    timeValue.textContent = "No time limit";
    return;
  }

  timeValue.textContent = formatTimeInSec(Number(timeRange.value));
});

timeValue.textContent = formatTimeInSec(Number(timeRange.value));

const select = document.getElementById('gameType');

document.addEventListener('click', function (e) {
  if (!select.contains(e.target)) {
    select.classList.remove('open');
  }
});


// Start the map
async function startPointsMode() {
  if (startInProgress) return;

  const movingModeValue = document.getElementById("gameType").value;
  const roundLength = Number(document.getElementById("timeRange").value) || 120;

  if (!movingModeValue) {
    showMessage("Please select a game mode.");
    return;
  }

  startInProgress = true;

  const playButton = document.getElementById("play-button");
  playButton.disabled = true;

  showLoadingScreen();

  const data = await startPoints(
    mapSrcName,
    movingModeValue,
    roundLength
  );
  
  if (!data) {
    console.error("Failed to fetch game data");

    startInProgress = false;
    playButton.disabled = false;

    hideLoadingScreen();
    return;
  }

  window.location.href = `/play/${data.gameId}`;
}