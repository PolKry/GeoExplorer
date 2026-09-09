export function renderCompactLeaderboard(containerId, players) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!players || players.length === 0) {
        container.innerHTML = `
            <li class="leaderboard-empty" role="status">
                <span class="empty-icon" aria-hidden="true">-</span>
                <span>No records found yet.</span>
                <small>Be the first to make the leaderboard.</small>
            </li>
        `;
        return;
    }

    container.innerHTML = players.map((player, index) => `
        <li class="leaderboard-item">
            <span class="rank">${index + 1}</span>
            <span class="username">${player.username}</span>
            <span class="score">${formatScore(player.score)}</span>
        </li>
    `).join("");
}

export function renderLeaderboardLoading(containerId, size = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = Array.from({ length: size }, () => `
        <li class="leaderboard-item leaderboard-skeleton" aria-hidden="true">
            <span class="shimmer skeleton-rank"></span>
            <span class="shimmer skeleton-name"></span>
            <span class="shimmer skeleton-score"></span>
        </li>
    `).join("");
}

export function renderHomeLeaderboard(containerId, players, size = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rows = [];
    for (let index = 0; index < size; index += 1) {
        const player = players[index];

        if (player) {
            rows.push(`
                <li class="leaderboard-item">
                    <span class="rank">${index + 1}</span>
                    <span class="username">${player.username}</span>
                    <span class="score">${player.score.toLocaleString()} points</span>
                </li>
            `);
            continue;
        }

        if (index === size - 1) {
            rows.push(`
                <li class="leaderboard-item cta-item">
                    <span class="rank">${index + 1}</span>
                    <span class="username">You? Join the Top Players!</span>
                </li>
            `);
            continue;
        }

        rows.push(`
            <li class="leaderboard-item">
                <span class="rank">${index + 1}</span>
                <span class="username">-</span>
                <span class="score">-</span>
            </li>
        `);
    }

    container.innerHTML = rows.join("");
}

export function renderMapLeaderboard(containerId, players, formatTime) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (players.length <= 0) {
        container.innerHTML = `
            <a class="list-placeholder">
                Nobody has played this map yet. Be the first one to try!
            </a>
        `;
        return;
    }

    container.innerHTML = players.map((player, index) => `
        <li class="leaderboard-item">
            <span class="rank">${index + 1}</span>
            <span class="username">${player.username}</span>
            <span class="best-time">${formatTime(player.bestTime)}</span>
            <span class="score">${player.score.toLocaleString()}</span>
        </li>
    `).join("");
}

function formatScore(score) {
    if (score < 10000) {
        return score.toLocaleString();
    }

    return new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 3,
    }).format(score);
}
