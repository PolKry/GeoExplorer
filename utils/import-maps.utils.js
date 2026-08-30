// importMaps.js
const mongoose = require('mongoose');
const Map = require('../models/map.model');

require('dotenv').config({ path: './api.env' });

async function importMaps() {
  try {
    const maps = require('../maps.json');

    for (const m of maps) {
      await Map.create({
        ...m
      });

      console.log(`Imported map: ${m.srcName}`);
    }

    console.log('✅ All maps imported successfully.');
  } catch (error) {
    console.error('❌ Error importing maps:', error);
  } finally {
    await mongoose.disconnect();
  }
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    importMaps();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });