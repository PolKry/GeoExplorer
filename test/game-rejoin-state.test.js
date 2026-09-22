const test = require('node:test');
const assert = require('node:assert/strict');

const Round = require('../game/Round');
const GameEngine = require('../game/GameEngine');
const Player = require('../game/Player');
const PointsMode = require('../game/modes/PointsMode');
const GameState = require('../game/GameState');

test('round serialization preserves the reconnect and timer snapshot', () => {
  const round = new Round({ lat: 1, lng: 2, panoId: 'pano-1', heading: 90 }, 'CZ');
  round.startedAt = new Date('2026-01-01T00:00:00.000Z');
  round.timerEndsAt = new Date('2026-01-01T00:01:00.000Z');
  round.timerPausedRemaining = 17;
  round.guesses.set('player-1', { guess: { lat: 3, lng: 4 }, distance: 12, points: 99 });

  const restored = Round.fromJSON(round.toJSON());
  assert.equal(restored.location.panoId, 'pano-1');
  assert.equal(restored.timerEndsAt.toISOString(), '2026-01-01T00:01:00.000Z');
  assert.equal(restored.timerPausedRemaining, 17);
  assert.deepEqual(restored.guesses.get('player-1').guess, { lat: 3, lng: 4 });
});

test('a reveal snapshot contains the submitted answer after a rejoin', () => {
  const mode = new PointsMode(2, 60, 'World', 'map', 20_000_000);
  const engine = new GameEngine('points-test', mode, 'moving');
  const player = new Player('player-1', 'Player', '#fff');
  engine.addPlayer(player);
  engine.round = new Round({ lat: 50, lng: 14, panoId: 'pano-2' }, 'CZ');
  engine.round.guesses.set('player-1', {
    guess: { lat: 49, lng: 15 }, distance: 1000, points: 4000
  });
  engine.setState(GameState.GUESSING_OVER);

  const snapshot = mode.getGuessEndPayload(engine, 'player-1');
  assert.equal(snapshot.state, GameState.GUESSING_OVER);
  assert.deepEqual(snapshot.round.guesses['player-1'].guess, { lat: 49, lng: 15 });
  assert.equal(snapshot.location.panoId, 'pano-2');
});
