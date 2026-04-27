const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  senderId: { type: String, required: true },
  senderEmail: { type: String, default: null },
  webhookUrl: { type: String, default: null },
  receiverId: { type: String },
  fileUrl: { type: String, required: true },
  originalName: { type: String, default: null },
  gameType: { type: String, default: 'tic-tac-toe' },
  expiryTime: { type: Date, required: true },
  status: { type: String, enum: ['locked', 'unlocked', 'expired'], default: 'locked' }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);
