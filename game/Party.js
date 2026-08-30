const PartyModel = require("../models/party.model");
const MapModel = require("../models/map.model");
const { getPlayerColor: getColor } = require("../utils/player-color.utils");
const { stopRoundTimer } = require('../handlers/timer.handler');
const crypto = require("crypto");

class Party {
    constructor(data) {
        this.id = data._id;
        this.code = data.code;
        this.host = data.host;

        this.players = data.players || [];
        this.settings = data.settings || {};
        this.status = data.status || "waiting";
        this.onGoingGameId = data.onGoingGameId || null;

        this._saveTimeout = null;
    }

    // -------- STATIC --------
    static async generateCode(length = 6) {
        let code;
        let exists = true;

        while (exists) {
            code = crypto.randomBytes(length)
                .toString("hex")
                .slice(0, length)
                .toUpperCase();

            exists = await PartyModel.findOne({ code });
        }

        return code;
    }

    static async create(hostUser) {
        const code = await this.generateCode();
        const worldMap = await this.getDefaultMap();

        if (!worldMap) {
            throw new Error("World map not found");
        }

        const doc = await PartyModel.create({
            code,
            host: hostUser._id,
            players: [
                {
                    user: hostUser._id,
                    username: hostUser.username,
                    online: true,
                    team: null,
                    color: "#FFD700", // Gold color for host",
                },
            ],
            status: "waiting",
            // Other settings are set to defaults
            settings: {
                map: worldMap._id,
            },
            onGoingGameId: null,
        });

        return new Party(doc.toObject());
    }

    static async findByCode(code) {
        const doc = await PartyModel.findOne({ code }).lean();
        return doc ? new Party(doc) : null;
    }

    static async findById(id) {
        const doc = await PartyModel.findById(id).lean();
        return doc ? new Party(doc) : null;
    }

    // -------- INTERNAL SAVE SYSTEM --------
    scheduleSave() {
        if (this._saveTimeout) return;

        this._saveTimeout = setTimeout(async () => {
            try {
                await this.persist();
            } catch (err) {
                console.error("Party save failed:", err);
            }
            this._saveTimeout = null;
        }, 1000);
    }

    async forcePersist() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }

        await this.persist();
    }

    async persist() {
        await PartyModel.updateOne(
            { _id: this.id },
            {
                $set: {
                    players: this.players,
                    settings: this.settings,
                    status: this.status,
                    onGoingGameId: this.onGoingGameId,
                    host: this.host,
                },
            }
        );
    }

    // -------- HELPERS --------
    isHost(userId) {
        return String(this.host) === String(userId);
    }

    isPlaying() {
        return this.onGoingGameId !== null;
    }

    getGameId() {
        return this.onGoingGameId;
    }

    static async getDefaultMap() {
        const worldMap = await MapModel.findOne({ name: "World" });
        return worldMap;
    }

    getPlayer(userId) {
        return this.players.find(
            (p) => String(p.user) === String(userId)
        );
    }

    // -------- PLAYER MANAGEMENT --------
    addPlayer(user) {
        if (this.getPlayer(user._id)) return;

        this.players.push({
            user: user._id,
            username: user.username,
            online: true,
            team: null,
            color: getColor(user._id),
        });

        this.scheduleSave();
    }

    removePlayer(userId) {
        this.players = this.players.filter(
            (p) => String(p.user) !== String(userId)
        );

        // handle host change
        if (this.isHost(String(userId))) {
            if (this.players.length === 0) {
                // delete from DB
                PartyModel.deleteOne({ _id: this.id }).catch(console.error);
                return null;
            }

            this.host = this.players[0].user;
        }

        this.scheduleSave();
        return this;
    }

    setOnline(userId, online) {
        const player = this.getPlayer(String(userId));
        if (!player) return;

        player.online = online;
        this.scheduleSave();
    }

    setTeam(userId, team) {
        const player = this.getPlayer(String(userId));
        if (!player) return;

        player.team = team;
        this.scheduleSave();
    }

    getOnlinePlayers() {
        return this.players.filter(p => p.online);
    }

    getOfflinePlayers() {
        return this.players.filter(p => !p.online);
    }

    // -------- SETTINGS --------
    updateSettings(userId, newSettings) {
        if (!this.isHost(String(userId))) {
            throw new Error("Only host can update settings");
        }

        this.settings = {
            ...this.settings,
            ...newSettings,
        };

        this.scheduleSave();
    }

    // -------- GAME FLOW --------
    startGame(userId, gameId) {
        if (!this.isHost(String(userId))) {
            throw new Error("Only host can start the game");
        }

        this.status = "in_progress";
        this.onGoingGameId = gameId;

        this.scheduleSave();
    }

    clearGame() {
        console.log("Clearing game from party", this.code);

        this.status = "waiting";
        this.onGoingGameId = null;
    }

    getTeamFromParty() {
        const blueCount = this.players.filter(p => p.team === "blue").length;
        const redCount = this.players.filter(p => p.team === "red").length;
        return redCount <= blueCount ? "blue" : "red";
    }

    // -------- SERIALIZATION --------
    toJSON() {
        return {
            id: this.id,
            code: this.code,
            host: this.host,
            players: this.players,
            settings: this.settings,
            status: this.status,
            onGoingGameId: this.onGoingGameId,
        };
    }
}

module.exports = Party;