import { fetchLeaderboard } from "../../api/leaderboard-api.js";
import { fetchTag } from "../../api/tag-api.js";
import { fetchUserScore } from "../../api/user-api.js";
import { startPoints } from "../../api/game-starter-api.js";
import { fetchMapData } from "../../api/map-api.js";
import { renderMapLeaderboard } from "../../renderers/leaderboard-renderer.js";
import { requireToken } from "../../utils/auth.js";

let title = document.getElementById("mapName");
let author = document.getElementById("mapAuthor");
let date = document.getElementById("mapDate");
let description = document.getElementById("mapDescription");
let thumbnail = document.getElementById("mapThumbnail");
let tagContainer = document.getElementById("tag-container");
let thumbnailLoader = document.getElementById("icon-loader");

let movingModeValue = null;
let mapName;
let mapSrcName;
let category;
let codes;
let startInProgress = false;

let tagsData = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById('playButton').addEventListener('click', startPointsMode);

  await loadMapData();
  await loadMapPreview();
  await loadUserScore();
  await loadLeaderboard();
});

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat) return;

  const activeElement = document.activeElement;
  const interactiveTags = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
  if (activeElement && interactiveTags.includes(activeElement.tagName)) return;

  const playButton = document.getElementById("playButton");
  if (!playButton || playButton.disabled || startInProgress || document.body.classList.contains("loading")) {
    return;
  }

  event.preventDefault();
  playButton.click();
});

window.addEventListener("pageshow", () => {
  startInProgress = false;
  const playButton = document.getElementById("playButton");
  if (playButton) playButton.disabled = false;
  setLoadingScreenActive(false);
});

async function loadMapPreview() {
  console.log("Codes: " + codes);

  if (!codes) {
    const mapContainer = document.getElementById("map-container");
    mapContainer.style.display = "none";
    return;
  }

  if (category === "Country") {
    loadCountryPreview([mapSrcName], category);
  } else {
    loadCountryPreview(codes, category);
  }
}

async function loadLeaderboard() {
  const period = "total";
  const playersCount = 15;
  const topPlayers = await fetchLeaderboard(mapSrcName, period, playersCount);

  renderMapLeaderboard("leaderboard-list", topPlayers, formatTimeInMS);
}

async function loadMapData() {
  try {
    if (!title || !author || !date || !description || !thumbnail || !tagContainer) {
      console.error("Some elements are missing in the DOM!");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const map = params.get("map");

    if (!map) {
      console.warn("No map specified in URL.");
      return;
    }

    const data = await fetchMapData(map);
    if (!data) {
      console.error("Failed to fetch map data");
      return;
    }

    title.textContent = data.mapData.name;
    author.innerHTML = "by <strong>" + data.mapData.author + "</strong>";
    date.textContent = "Created: " + data.mapData.date;
    description.textContent = data.mapData.description;
    thumbnail.src = data.mapData.image;

    mapSrcName = data.mapData.srcName;
    mapName = data.mapData.name;

    category = data.mapData.category;
    codes = data.codes;

    tagContainer.innerHTML = "";

    // Icon placeholder
    thumbnail.classList.add("loaded");

    thumbnailLoader.style.opacity = 0;
    setTimeout(() => {
      thumbnailLoader.style.display = "none";
    }, 50);

    // Loads all tags
    loadTags(data);
  } catch (error) {
    console.error("Error loading map data:", error);
  }
}

function loadTags(data) {
  const difficultySpan = document.createElement('span');
  difficultySpan.className = 'tag';
  difficultySpan.innerHTML = "Map Difficulty: <b>" + data.mapData.difficulty + "</b>";
  tagContainer.appendChild(difficultySpan);

  data.mapData.tags.forEach(async (tagName) => {
    // TODO: Get the tag desc along with the map data, or at least get all at once and do not loop the requests.
    const tagDescription = await getTagDescription(tagName);

    const tagSpan = document.createElement('span');
    tagSpan.className = 'tag';
    tagSpan.textContent = tagName;
    tagSpan.title = tagDescription;

    tagContainer.appendChild(tagSpan);
  });
}

async function loadUserScore() {
  if (!codes) return;

  const token = requireToken();
  if (!token) return;

  const data = await fetchUserScore(mapSrcName);
  if (!data) {
    console.error("Failed to fetch user data");
    return;
  }

  setUserScore(data.highestScore);
}

async function getTagDescription(name) {
  const description = await fetchTag(name);
if (!description) {
    console.error("Failed to fetch tag description");
    return "No description.";
  }

  return description;
}

const timeRange = document.getElementById('timeRange');
const timeValue = document.getElementById('timeValue');


function formatTimeInSec(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  let result = '';

  if (min > 0) result += `${min}m`;
  if (sec > 0) {
    if (result.length > 0) result += ' ';
    result += `${sec}s`;
  }

  if (result === '') result = '0s';
  return result;
}

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

function setUserScore(score, maxScore = 25000) {
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

  // Glassy/shiny overlay
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

async function startPointsMode() {
  if (startInProgress) return;

  const movingModeValue = document.getElementById("gameType").value;
  const roundLength = Number(document.getElementById("timeRange").value) || 120;

  if (!movingModeValue) {
    alert("Please select a game mode.");
    return;
  }

  startInProgress = true;
  const playButton = document.getElementById("playButton");
  playButton.disabled = true;
  setLoadingScreenActive(true);

  const data = await startPoints(mapSrcName, movingModeValue, roundLength);
  if (!data) {
    console.error("Failed to fetch game data");
    startInProgress = false;
    playButton.disabled = false;
    setLoadingScreenActive(false);
    return;
  }

  // Redirect immediately
  window.location.href = `/play/${data.gameId}`;
}

function setLoadingScreenActive(value) {
  const screen = document.getElementById('loading-screen');

  if (value) {
    // Disable transition to show it instantly
    screen.style.transition = 'none';
    screen.style.opacity = '1';
    screen.style.display = 'flex';
    document.body.classList.add("loading");
  } else {
    // Enable transition and fade out
    screen.style.transition = 'opacity 0.6s ease';
    screen.style.opacity = '0';
    document.body.classList.remove("loading");

    setTimeout(() => {
      screen.style.display = 'none';
    }, 600);
  }
}

function formatTimeInMS(ms) {
  const minutes = Math.floor(ms / 60000);          // total minutes
  const remainingMs = ms % 60000;                  // leftover milliseconds
  const seconds = remainingMs / 1000;              // convert to seconds (can be decimal)

  // Show up to 3 decimal places, remove trailing zeros
  const secondsStr = parseFloat(seconds.toFixed(3));

  return `${minutes} min ${secondsStr} sec`;
}
