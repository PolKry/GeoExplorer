class Team {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.players = [];
        this.score = 0;
    }
}

module.exports = Team;