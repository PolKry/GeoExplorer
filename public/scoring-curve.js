const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

function calculateScore(distanceMeters, maxDistanceMeters = 20000000) {
  if (distanceMeters <= 200) return 5000;

  const ratio = distanceMeters / maxDistanceMeters;
  const decay = 15;
  const curvePower = 1.2;

  return 5000 * Math.exp(-decay * Math.pow(ratio, curvePower));
}

const maxDistance = 20000000;

ctx.beginPath();

for (let i = 0; i <= 1000; i++) {
  const distance = (i / 1000) * maxDistance;
  const score = calculateScore(distance);

  const x = (distance / maxDistance) * canvas.width;
  const y = canvas.height - (score / 5000) * canvas.height;

  if (i === 0) ctx.moveTo(x, y);
  else ctx.lineTo(x, y);
}

ctx.stroke();