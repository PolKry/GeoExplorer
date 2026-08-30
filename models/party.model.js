// models/partyModel.js
const mongoose = require("mongoose");

const partySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },

    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // reference to user model
        required: true,
    },

    players: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            username: { type: String },
            online: { type: Boolean, default: true },
            score: { type: Number, default: 0 },
            joinedAt: { type: Date, default: Date.now },
            team: {
                type: String,
                enum: ["red", "blue", null],
                default: null, // null means FFA or no team assigned
            },
            color: { type: String, default: "#ff0000" },
        },
    ],

    status: {
        type: String,
        enum: ["waiting", "in_progress", "finished"],
        default: "waiting",
    },

    settings: {
        mode: { type: String, enum: ["ffa", "teams"], default: "ffa" },
        map: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Map",
            required: true
        },
        rounds: { type: Number, default: 5, min: 1, max: 20 },
        maxMultiplier: { type: Number, default: 8, min: 1, max: 15 },
        time: { type: Number, default: 60, min: 10, max: 300 },
        waitForFirstGuess: { type: Boolean, default: false },
        unlimitedTime: { type: Boolean, default: false },
        countOnlyClosestGuess: { type: Boolean, default: false }
    },

    onGoingGameId: {
        type: String,
        default: null,
        required: false
    },

    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Party", partySchema);