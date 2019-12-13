const mongoose = require('mongoose');

const TurnEntrySchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
  },
  playerScore: {
    type: Array,
    required: true,
  },
  playerTurns: {
    type: Array,
    required: true
  },
  turnCount: {
    type: Number,
    required: true,
  },
  resetCount: {
    type: Number,
    required: true
  },

  spaceCount: {
    type: Number,
    required: false
  },
  rotateCount: {
    type: Number,
    required: false
  },
  downCount: {
    type: Number,
    required: false
  },
  

});

const TurnEntry = mongoose.model('TurnEntry', TurnEntrySchema);

module.exports = TurnEntry;