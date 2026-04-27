const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  senderId: { type: String, required: true },
  receiverId: { type: String },
  fileUrl: { type: String, required: true },
  expiryTime: { type: Date, required: true },
  status: { type: String, enum: ['locked', 'unlocked', 'expired'], default: 'locked' }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);
