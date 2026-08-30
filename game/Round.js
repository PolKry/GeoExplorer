class Round {
    constructor(location, countryCode, countryName) {
        this.location = location;
        this.countryCode = countryCode;
        this.countryName = countryName;
        this.guesses = new Map(); // Map internally
        
        this.startedAt = null;
        this.endedAt = null;
    }

    toJSON() {
        return {
            location: this.location ? {
                lat: this.location.lat,
                lng: this.location.lng
            } : null,
            guesses: Object.fromEntries(this.guesses || []),
            startedAt: this.startedAt,
            endedAt: this.endedAt
        };
    }

    static fromJSON(data) {
        const round = new Round(data.location, data.countryCode, data.countryName);
        // Convert plain object -> Map internally
        round.guesses = new Map(Object.entries(data.guesses || {}));
        round.startedAt = data.startedAt ? new Date(data.startedAt) : null;
        round.endedAt = data.endedAt ? new Date(data.endedAt) : null;
        return round;
    }
}

module.exports = Round;