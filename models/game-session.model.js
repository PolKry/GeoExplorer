const mongoose = require("mongoose");

// Each round stores the location and player guesses
const roundSchema = new mongoose.Schema({
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    panoId: { type: String, required: true },
    heading: Number
  },
  countryCode: { type: String, required: true },
  countryName: { type: String, required: false },

  guesses: {
    type: Map,
    of: new mongoose.Schema({
      guess: {
        lat: Number,
        lng: Number,
        panoId: String
      },
      distance: Number,
      points: Number
    }, { _id: false })
  },
  endedAt: { type: Date },
  startedAt: { type: Date },
  timerEndsAt: { type: Date },
  timerPausedRemaining: { type: Number, default: null }
}, { _id: false });

const gameSettingsSchema = new mongoose.Schema({
  roundTime: { type: Number, default: 60, required: true },
  maxRounds: { type: Number, default: 5, required: true },
}, { _id: false });

const GameSessionSchema = new mongoose.Schema({
  gameId: { type: String },
  partyId: { type: mongoose.Schema.Types.ObjectId, ref: "Party", default: null },
  mode: { type: String, required: true },          // PointsMode, StreakMode, etc.
  gameplayMode: { type: String, required: true },  // moving, nmpz, etc.
  mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map', required: true },
  mapCode: { type: String, required: true },
  rounds: { type: [roundSchema], default: [] },
  roundIndex: { type: Number, default: 0 },
  round: { type: roundSchema, default: null },
  settings: { type: gameSettingsSchema, default: null },
  state: String,      // Stores the GameMode state
  maxDistance: { type: Number, default: 20000000 },
  players: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: String,
    score: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    color: { type: String, default: "#ff0000" },
    totalDistance: { type: Number, default: null, required: false },
    lastDistance: { type: Number, default: null, required: false },
    guessedRounds: { type: Number, default: 0, required: true },
    totalTime: { type: Number, default: 0, required: true },
    connected: { type: Boolean, default: true },
    team: String
  }],
  lastMarkerPositions: {
    type: Map,
    of: {
      lat: Number,
      lng: Number
    },
    default: {}
  },

  startedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Idle / unfinished games
GameSessionSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 60 * process.env.GAME_UNFINISHED_MAX_LIFETIME_MIN,
    partialFilterExpression: {
      state: { $ne: "finished" }
    }
  }
);

// Finished games
GameSessionSchema.index(
  { finishedAt: 1 },
  {
    expireAfterSeconds: 60 * process.env.GAME_FINISHED_MAX_LIFETIME_MIN
  }
);

module.exports = mongoose.model("GameSession", GameSessionSchema);
