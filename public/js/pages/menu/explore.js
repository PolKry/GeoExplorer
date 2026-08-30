import { apiFetch } from "../../api/http.js";

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

let favMaps = [];

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
      favoriteIcon.src = "/Resources/Images/solidStar.png";
    } else {
      favoriteIcon.src = "/Resources/Images/hollowStar.png";
    }

    favoriteIcon.addEventListener("click", (event) => {
      event.stopPropagation();

      if (favoriteIcon.dataset.fav === "true") {
        favoriteIcon.src = "/Resources/Images/hollowStar.png";
        favoriteIcon.dataset.fav = "false";
      } else {
        favoriteIcon.src = "/Resources/Images/solidStar.png";
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

    const res = await apiFetch(`/api/maps?page=${page}`);
    const data = await res.json();

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

    const res = await apiFetch(`/api/maps/community?page=${page}`);
    const data = await res.json();

    if (page === 1) {
      clearMaps(communityMapListDiv);

      if (data.maps.length === 0) {
        showEmptyState(
          communityMapListDiv,
          "No community maps yet. Create one or check back later!"
        );
        loadMoreCommunityBtn.style.display = "none";
        return;
      }
    }

    appendMapsTo(communityMapListDiv, data.maps);

    loadMoreCommunityBtn.style.display = data.hasMore ? "block" : "none";

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
    const res = await apiFetch(
      `/api/maps/search?query=${encodeURIComponent(query)}&type=${"Official"}&onlyFavMaps=${onlyFavMaps}`
    );
    const data = await res.json();

    if (data.maps.length > 0) {
      appendMapsTo(officialMapListDiv, data.maps);
    } else {
      officialMapListDiv.textContent = "No maps found.";
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
    const res = await apiFetch(
      `/api/maps/search?query=${encodeURIComponent(query)}&type=${"Community"}&onlyFavMaps=${onlyFavMaps}`
    );
    const data = await res.json();

    if (data.maps.length > 0) {
      appendMapsTo(communityMapListDiv, data.maps);
    } else {
      communityMapListDiv.textContent = "No community maps found. Try creating one or check back later!";
    }
  } catch (err) {
    console.error("Error searching community maps:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  getFavMaps();

  loadOfficialMaps(officialPage);
  loadCommunityMaps(communityPage);
});

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

async function getFavMaps() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to view this page.');
    window.location.href = '/login.html';
    return;
  }

  try {
    const res = await apiFetch(`/api/users/me`);

    if (!res.ok) throw new Error('Failed to fetch user profile info');

    const data = await res.json();

    favMaps = data.favoriteMaps;
  } catch (err) {
    console.error("Error loading favorite maps:", err);
  }
}

async function addOrRemoveFavMap(mapName) {
  if (!mapName) return;

  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to view this page.');
    window.location.href = '/login.html';
    return;
  }

  try {
    const res = await apiFetch(`/api/users/me`);
    if (!res.ok) throw new Error('Failed to apiFetch user profile info');

    const userProfile = await res.json();

    const resUpdate = await apiFetch(`/api/users/${userProfile._id}/favorite-map`, {
      method: 'PUT',
      body: JSON.stringify({ name: mapName })
    });

    if (!resUpdate.ok) throw new Error('Failed to update favorites');

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
