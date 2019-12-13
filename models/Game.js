const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
  },
  players: {
    type: Array,
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: false,
  },
  playerLeft: {
    type: String,
    required: false,
  }
});

const Game = mongoose.model('Game', GameSchema);

module.exports = Game;