import { fetchLeaderboard } from "../../api/leaderboard-api.js";
import { renderCompactLeaderboard } from "../../renderers/leaderboard-renderer.js";

const leaderboardsToLoad = [
  { map: "global", periods: ["daily", "monthly", "total"] },
  { map: "world", periods: ["daily", "monthly", "total"] },
  { map: "us", periods: ["daily", "monthly", "total"] },
  { map: "cz", periods: ["daily", "monthly", "total"] },
];

async function loadLeaderboards() {
  for (const { map, periods } of leaderboardsToLoad) {
    for (const period of periods) {
      const topPlayers = await fetchLeaderboard(map, period, 5);
      renderCompactLeaderboard(`${map}-${period}`, topPlayers);
    }
  }
}

document.addEventListener("DOMContentLoaded", loadLeaderboards);
