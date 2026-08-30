const axios = require("axios");
const fs = require("fs");

const TOTAL_LOCATIONS = 10; // How many valid locations you want
const RADIUS = 50; // meters around the point to search
const OUTPUT_FILE = "valid_locations.json";

function getRandomCoords() {
  // Generates random point on land (between latitudes)
  const lat = (Math.random() * 180) - 90;
  const lng = (Math.random() * 360) - 180;
  return { lat, lng };
}

async function hasStreetView(lat, lng) {
  const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=${RADIUS}&key=${process.env.GOOGLE_API_KEY}`;
  try {
    const res = await axios.get(url);
    return res.data.status === "OK";
  } catch (err) {
    console.error("API error:", err.message);
    return false;
  }
}

async function generateValidLocations(count) {
  const validLocations = [];
  while (validLocations.length < count) {
    const { lat, lng } = getRandomCoords();
    const valid = await hasStreetView(lat, lng);
    if (valid) {
      console.log(`✅ Valid: ${lat}, ${lng}`);
      validLocations.push({ lat, lng });
    } else {
      console.log(`❌ No Street View: ${lat}, ${lng}`);
    }
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(validLocations, null, 2));
  console.log(`\n🎉 Done! ${validLocations.length} valid locations saved to ${OUTPUT_FILE}`);
}

generateValidLocations(TOTAL_LOCATIONS);