const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  mapId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Map',
    required: true,
    index: true
  },

  panoId: {
    type: String,
    required: true,
    unique: true
  },

  loc: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },

  heading: {
    type: Number,
    default: 0
  }
}, { versionKey: false });

module.exports = mongoose.model('LocationData', LocationSchema);