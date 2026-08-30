const normalizeId = id => id?.toString();

export function renderParty(party, handlers = {}) {
    const codeEl = document.getElementById("party-code");
    const panelLeft = document.getElementById("players-list-left");
    const panelRight = document.getElementById("players-list-right");
    if (!panelLeft || !panelRight) return;

    setLayout(party.settings.mode);
    applySettingsToUI(party.settings);
    updateFooterButtons(party.onGoingGameId, handlers);

    codeEl.textContent = party.code;
    panelLeft.innerHTML = "";
    panelRight.innerHTML = "";

    const isTeamMode = party.settings.mode === "teams";
    party.players.forEach(player => {
        const playerItem = createPlayerItem(player, party, handlers);

        if (!isTeamMode) {
            panelLeft.appendChild(playerItem);
            return;
        }

        if (player.team === "blue") {
            playerItem.classList.add("team-blue");
            panelLeft.appendChild(playerItem);
        } else {
            playerItem.classList.add("team-red");
            panelRight.appendChild(playerItem);
        }
    });
}

export function updatePlayerStatus(userId, status) {
    const li = document.querySelector(`li[data-user-id="${userId}"]`);
    if (!li) return;

    const dot = li.querySelector(".status-dot");
    const username = li.querySelector(".username");
    if (!dot || !username) return;

    dot.classList.remove("online", "offline");
    dot.classList.add(status);
    username.classList.remove("online", "offline");
    username.classList.add(status);
}

export function updatePlayerStatusBatch(online) {
    document.querySelectorAll("li[data-user-id]").forEach(li => {
        const dot = li.querySelector(".status-dot");
        const username = li.querySelector(".username");
        const userId = li.dataset.userId;
        if (!dot || !username) return;

        const isOnline = online.includes(userId.toString());
        dot.classList.toggle("online", isOnline);
        dot.classList.toggle("offline", !isOnline);
        username.classList.toggle("online", isOnline);
        username.classList.toggle("offline", !isOnline);
    });
}

function createPlayerItem(player, party, handlers) {
    const playerId = normalizeId(typeof player.user === "string" ? player.user : player.user._id);
    const hostId = normalizeId(typeof party.host === "string" ? party.host : party.host._id);
    const ready = player.online ? "online" : "offline";
    const canKickPlayer = Boolean(handlers.onKickPlayer);
    const canSwapTeam = Boolean(handlers.onSwapTeam);

    const li = document.createElement("li");
    li.classList.toggle("host", hostId === playerId);
    li.dataset.userId = playerId;
    if (canSwapTeam) li.title = "Swap Team";

    li.innerHTML = `
        <span class="left">
            <span class="status-dot ${ready}"></span>
            <span class="username ${ready}"></span>
        </span>
        <span class="points">${player.points ?? 0} pts</span>
    `;

    const username = li.querySelector(".username");
    username.textContent = player.username;
    username.style.color = player.color || "#ffffff";

    const dot = li.querySelector(".status-dot");
    if (canKickPlayer) {
        dot.title = "Kick Player";
        dot.addEventListener("click", event => {
            event.stopPropagation();
            handlers.onKickPlayer(playerId);
        });
    }

    if (canSwapTeam) {
        li.addEventListener("click", () => handlers.onSwapTeam(playerId));
    }

    return li;
}

function updateFooterButtons(onGoingGameId, handlers) {
    const startBtn = document.getElementById("start-game-btn");
    const settingsBtn = document.getElementById("open-settings-btn");
    const kickOfflineBtn = document.getElementById("kick-offline-btn");
    const rejoinBtn = document.getElementById("rejoin-game-btn");
    const terminateBtn = document.getElementById("terminate-game-btn");
    const isGameActive = Boolean(onGoingGameId && onGoingGameId !== "null");

    if (rejoinBtn) rejoinBtn.style.display = isGameActive ? "inline-block" : "none";
    if (terminateBtn) terminateBtn.style.display = isGameActive ? "inline-block" : "none";
    if (startBtn) startBtn.style.display = isGameActive ? "none" : "inline-block";
    if (settingsBtn) settingsBtn.style.display = isGameActive ? "none" : "inline-block";
    if (kickOfflineBtn) kickOfflineBtn.style.display = isGameActive ? "none" : "inline-block";

    if (isGameActive && rejoinBtn) {
        rejoinBtn.onclick = () => handlers.onRejoinGame?.(onGoingGameId);
    }
}

function applySettingsToUI(settings) {
    const gameMode = document.getElementById("game-mode-modal");
    if (!gameMode) return;

    gameMode.textContent = settings.mode === "teams" ? "Teams" : "Free For All";
    gameMode.dataset.value = settings.mode;

    const map = document.querySelector(`#map-options li[data-value="${settings.map}"]`);
    if (map) {
        const mapModal = document.getElementById("map-modal");
        mapModal.textContent = map.textContent;
        mapModal.dataset.value = settings.map;
    }

    document.getElementById("rounds-modal").value = settings.rounds;
    document.getElementById("max-multiplier-modal").value = settings.maxMultiplier;
    document.getElementById("time-modal").value = settings.time;
    document.getElementById("unlimited-time-modal").checked = settings.unlimitedTime;
    document.getElementById("first-guess-modal").checked = settings.waitForFirstGuess;

    const timeSetting = document.getElementById("time-setting");
    const timeInput = document.getElementById("time-modal");
    timeInput.disabled = settings.unlimitedTime;
    timeSetting.classList.toggle("disabled", settings.unlimitedTime);

    const closest = document.getElementById("count-closest-guess-modal");
    closest.checked = settings.countOnlyClosestGuess;
    closest.disabled = settings.mode !== "teams";
    closest.closest(".setting-group").classList.toggle("disabled", settings.mode !== "teams");
}

function setLayout(mode) {
    const panelLeft = document.getElementById("panel-left");
    const panelRight = document.getElementById("panel-right");
    const container = document.querySelector(".party-container");

    container.classList.remove("ffa-layout", "team-mode");

    if (mode === "teams") {
        container.classList.add("team-mode");
        panelRight.style.display = "block";
        panelLeft.querySelector("h3").textContent = "Blue Team";
        panelLeft.querySelector("h3").classList.add("blue-team");
        panelRight.querySelector("h3").textContent = "Red Team";
        panelRight.querySelector("h3").classList.add("red-team");
        return;
    }

    container.classList.add("ffa-layout");
    panelRight.style.display = "none";
    panelLeft.style.width = "100%";
    panelLeft.querySelector("h3").textContent = "Players";
    panelLeft.querySelector("h3").classList.remove("blue-team");
    panelRight.querySelector("h3").classList.remove("red-team");
}
