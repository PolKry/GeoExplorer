const Map = require('../models/map.model');

async function importMaps() {
  const maps = require('../maps.json');

  for (const map of maps) {
    await Map.findOneAndUpdate(
      { srcName: map.srcName },
      { $set: { ...map } },
      { upsert: true, new: true }
    );
    console.log(`Imported map: ${map.srcName}`);
  }

  console.log('All maps imported successfully.');
  return maps.length;
}

module.exports = { importMaps };