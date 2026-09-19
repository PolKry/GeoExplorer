import { getMapsForPage, searchMaps } from "../../api/explore-page-api.js";
import { setFavMaps, getFavMaps } from "../../api/user-api.js";

let officialPage = 1;
let communityPage = 1;
let isSearchingOfficial = false;
let isSearchingCommunity = false;

const loadMoreOfficialBtn = document.getElementById("load-more-official");
const loadMoreCommunityBtn = document.getElementById("load-more-community");
const officialMapListDiv = document.getElementById("map-list-official");
const communityMapListDiv = document.getElementById("map-list-community");
const officialSearchInput = document.getElementById("map-search-official");
const communitySearchInput = document.getElementById("map-search-community");
const officialFavMapsToggle = document.getElementById("fav-maps-only-official-toggle");
const communityFavMapsToggle = document.getElementById("fav-maps-only-community-toggle");

const solidStartIcon = "/resources/images/solidStar.png";
const hollowStarIcon = "/resources/images/hollowStar.png";

let favMaps = [];

document.addEventListener("DOMContentLoaded", () => {
  cacheFavMaps();

  loadOfficialMaps(officialPage);
  loadCommunityMaps(communityPage);
});

function appendMapsTo(container, maps) {
  maps.forEach(map => {
    const card = document.createElement("div");
    card.className = "map-card";

    card.addEventListener("click", () => {
      window.location.href = `/menu/map.html?map=${encodeURIComponent(map.name)}`;
    });

    const img = document.createElement("img");
    img.className = "card-background";
    img.src = map.image || 'default-map-image.png';
    img.alt = map.name;

    const span = document.createElement("span");
    span.textContent = map.name;

    const favoriteIcon = document.createElement("img");
    favoriteIcon.className = "favorite-icon";
    favoriteIcon.alt = "Favorite icon";

    const isInFavorites = favMaps.includes(map.name);
    favoriteIcon.dataset.fav = isInFavorites;
    if (isInFavorites) {
      favoriteIcon.src = solidStartIcon;
    } else {
      favoriteIcon.src = hollowStarIcon;
    }

    favoriteIcon.addEventListener("click", (event) => {
      event.stopPropagation();

      if (favoriteIcon.dataset.fav === "true") {
        favoriteIcon.src = hollowStarIcon;
        favoriteIcon.dataset.fav = "false";
      } else {
        favoriteIcon.src = solidStartIcon;
        favoriteIcon.dataset.fav = "true";
      }

      addOrRemoveFavMap(map.name);
    });

    card.appendChild(img);
    card.appendChild(span);
    card.appendChild(favoriteIcon);
    container.appendChild(card);
  });
}

function clearMaps(container) {
  container.innerHTML = "";
}

async function loadOfficialMaps(page) {
  try {
    if (page === 1) {
      showLoading(officialMapListDiv);
    }

    const data = await getMapsForPage(page, "Official");

    if (page === 1) {
      clearMaps(officialMapListDiv);

      if (data.maps.length === 0) {
        showEmptyState(officialMapListDiv, "No official maps available.");
        loadMoreOfficialBtn.style.display = "none";
        return;
      }
    }

    appendMapsTo(officialMapListDiv, data.maps);

    loadMoreOfficialBtn.style.display = data.hasMore ? "block" : "none";

  } catch (err) {
    console.error("Error loading official maps:", err);
  }
}

async function loadCommunityMaps(page) {
  try {
    if (page === 1) {
      showLoading(communityMapListDiv);
    }

    const mapsData = await getMapsForPage(page, "Community");

    if (page === 1) {
      clearMaps(communityMapListDiv);

      if (mapsData.maps.length === 0) {
        showEmptyState(
          communityMapListDiv,
          "No community maps yet. Create one or check back later!"
        );
        loadMoreCommunityBtn.style.display = "none";
        return;
      }
    }

    appendMapsTo(communityMapListDiv, mapsData.maps);

    loadMoreCommunityBtn.style.display = mapsData.hasMore ? "block" : "none";

  } catch (err) {
    console.error("Error loading community maps:", err);
  }
}

async function searchOfficialMaps(query) {
  isSearchingOfficial = true;
  clearMaps(officialMapListDiv);
  loadMoreOfficialBtn.style.display = "none";
  const onlyFavMaps = officialFavMapsToggle.checked;

  try {
    const data = await searchMaps(query, "Official", onlyFavMaps);

    if (data.maps.length > 0) {
      appendMapsTo(officialMapListDiv, data.maps);
    } else {
      showEmptyState(officialMapListDiv, "No maps found.");
    }
  } catch (err) {
    console.error("Error searching official maps:", err);
  }
}

async function searchCommunityMaps(query) {
  if (query.length > 20)
    return;

  isSearchingCommunity = true;
  clearMaps(communityMapListDiv);
  loadMoreCommunityBtn.style.display = "none";
  const onlyFavMaps = communityFavMapsToggle.checked;

  try {
    const data = await searchMaps(query, "Community", onlyFavMaps);

    if (data.maps.length > 0) {
      appendMapsTo(communityMapListDiv, data.maps);
    } else {
      showEmptyState(
        communityMapListDiv,
        "No community maps yet. Create one or check back later!"
      );
    }
  } catch (err) {
    console.error("Error searching community maps:", err);
  }
}

officialFavMapsToggle.addEventListener('change', () => {
  const query = officialSearchInput.value.trim();

  if (officialFavMapsToggle.checked) {
    searchOfficialMaps(query);
    return;
  }

  if (query === "") {
    // Exit search mode go back to page based loading
    isSearchingOfficial = false;
    officialPage = 1;
    clearMaps(officialMapListDiv);
    loadOfficialMaps(officialPage);
  } else {
    searchOfficialMaps(query);
  }
});

communityFavMapsToggle.addEventListener('change', () => {
  const query = communitySearchInput.value.trim();

  if (communityFavMapsToggle.checked) {
    searchCommunityMaps(query);
    return;
  }

  if (query === "") {
    isSearchingCommunity = false;
    communityPage = 1;
    clearMaps(communityMapListDiv);
    loadCommunityMaps(communityPage);
  } else {
    searchCommunityMaps(query);
  }
});

loadMoreOfficialBtn.addEventListener("click", () => {
  if (!isSearchingOfficial) {
    officialPage++;
    loadOfficialMaps(officialPage);
  }
});

loadMoreCommunityBtn.addEventListener("click", () => {
  if (!isSearchingCommunity) {
    communityPage++;
    loadCommunityMaps(communityPage);
  }
});

officialSearchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const query = officialSearchInput.value.trim();

  if (query === "" && !officialFavMapsToggle.checked) {
    isSearchingOfficial = false;
    clearMaps(officialMapListDiv);
    officialPage = 1;
    loadMoreOfficialBtn.style.display = "block";
    loadOfficialMaps(officialPage);
  } else {
    searchOfficialMaps(query);
  }
});

communitySearchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;

  const query = communitySearchInput.value.trim();

  if (query === "" && !communityFavMapsToggle.checked) {
    isSearchingCommunity = false;
    clearMaps(communityMapListDiv);
    communityPage = 1;
    loadMoreCommunityBtn.style.display = "block";
    loadCommunityMaps(communityPage);
  } else {
    searchCommunityMaps(query);
  }
});

async function cacheFavMaps() {
  try {
    favMaps = await getFavMaps();
  } catch (err) {
    console.error("Error loading favorite maps:", err);
  }
}

async function addOrRemoveFavMap(mapName) {
  if (!mapName) throw new Error("Map name is required to add or remove from favorites.");

  try {
    await setFavMaps(mapName);

    // Toggle locally
    if (favMaps.includes(mapName)) {
      favMaps = favMaps.filter(m => m !== mapName);
    } else {
      favMaps.push(mapName);
    }
  } catch (err) {
    console.error("Error updating favorite maps:", err);
  }
}

function showLoading(container) {
  container.innerHTML = `<div class="loading-skeleton"></div>`;
}

function showEmptyState(container, message) {
  container.innerHTML = `<div class="empty-placeholder">${message}</div>`;
}
