const mongoose = require('mongoose');

const BattleSchema = new mongoose.Schema({
  battleId: { type: String, required: true, unique: true },
  players: [{ type: String }], // Array of user IDs
  gameType: { 
    type: String, 
    enum: ['tic-tac-toe', 'quiz-battle', 'racing', 'reflex', 'tap-battle'],
    required: true
  },
  winner: { type: String, default: null } // Stores winner's userId
}, { timestamps: true });

module.exports = mongoose.model('Battle', BattleSchema);
