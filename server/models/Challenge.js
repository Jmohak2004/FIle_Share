const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  challengeId: { type: String, required: true, unique: true },
  fileId: { type: String, required: true },
  challengeType: { 
    type: String, 
    enum: ['puzzle', 'rps', 'trivia', 'memory', 'emoji', 'speed-tap'],
    required: true
  },
  attemptsAllowed: { type: Number, default: 3 }
}, { timestamps: true });

module.exports = mongoose.model('Challenge', ChallengeSchema);
