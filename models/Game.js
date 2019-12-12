const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
  },
  players: {
    type: Array,
    required: true,
  }
});

const Game = mongoose.model('Game', GameSchema);

module.exports = Game;