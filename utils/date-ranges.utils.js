// utils/dateRanges.js
function getDateRange(period) {
  const now = new Date();

  if (period === "daily") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: now };
  }

  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }

  return null; // no range
}

module.exports = { getDateRange };
