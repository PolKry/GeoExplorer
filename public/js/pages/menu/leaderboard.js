import { fetchLeaderboard } from "../../api/leaderboard-api.js";
import {
  renderCompactLeaderboard,
  renderLeaderboardLoading,
} from "../../renderers/leaderboard-renderer.js";

const leaderboardsToLoad = [
  { map: "global", periods: ["daily", "monthly", "total"] },
  { map: "world", periods: ["daily", "monthly", "total"] },
  { map: "us", periods: ["daily", "monthly", "total"] },
  { map: "cz", periods: ["daily", "monthly", "total"] },
];

async function loadLeaderboards() {
  const requests = leaderboardsToLoad.flatMap(({ map, periods }) =>
    periods.map(async (period) => {
      const containerId = `${map}-${period}`;
      renderLeaderboardLoading(containerId);

      const topPlayers = await fetchLeaderboard(map, period, 5);
      renderCompactLeaderboard(containerId, topPlayers);
    }),
  );

  await Promise.all(requests);
}

document.addEventListener("DOMContentLoaded", loadLeaderboards);
