const mongoose = require('mongoose');

const MoveSchema = new mongoose.Schema({
  player: { type: String, required: true },
  cellIndex: { type: Number },
  choice: { type: String },
  timestamp: { type: Number, required: true },
}, { _id: false });

const BattleSchema = new mongoose.Schema({
  battleId: { type: String, required: true, unique: true },
  fileId: { type: String },
  players: [{ type: String }],
  gameType: {
    type: String,
    enum: ['tic-tac-toe', 'rps', 'memory', 'reflex', 'quiz-battle', 'tap-battle'],
    required: true
  },
  moves: [MoveSchema],
  winner: { type: String, default: null },
  endedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Battle', BattleSchema);
