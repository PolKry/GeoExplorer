class Round {
    constructor(location, countryCode, countryName) {
        this.location = location;
        this.countryCode = countryCode;
        this.countryName = countryName;
        this.guesses = new Map(); // Map internally
        
        this.startedAt = null;
        this.endedAt = null;
        // A deadline, rather than a periodically decremented counter, makes a
        // round timer safe to reconstruct after a reconnect or server restart.
        this.timerEndsAt = null;
        this.timerPausedRemaining = null;
    }

    toJSON() {
        return {
            location: this.location ? {
                lat: this.location.lat,
                lng: this.location.lng,
                panoId: this.location.panoId,
                heading: this.location.heading
            } : null,
            guesses: Object.fromEntries(this.guesses || []),
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            timerEndsAt: this.timerEndsAt,
            timerPausedRemaining: this.timerPausedRemaining
        };
    }

    static fromJSON(data) {
        const round = new Round(data.location, data.countryCode, data.countryName);
        // Convert plain object -> Map internally
        round.guesses = new Map(Object.entries(data.guesses || {}));
        round.startedAt = data.startedAt ? new Date(data.startedAt) : null;
        round.endedAt = data.endedAt ? new Date(data.endedAt) : null;
        round.timerEndsAt = data.timerEndsAt ? new Date(data.timerEndsAt) : null;
        round.timerPausedRemaining = Number.isFinite(data.timerPausedRemaining)
            ? data.timerPausedRemaining
            : null;
        return round;
    }
}

module.exports = Round;
