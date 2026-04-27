const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const Challenge = require('../models/Challenge');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { senderId, challengeType } = req.body;
    const fileId = Date.now().toString();
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const fileUrl = req.file ? req.file.path : 'dummy.txt';

    const newFile = new File({
      fileId,
      senderId: senderId || 'anon',
      fileUrl,
      expiryTime
    });
    await newFile.save();

    if (challengeType) {
      const challenge = new Challenge({
        challengeId: Date.now().toString() + 'c',
        fileId,
        challengeType
      });
      await challenge.save();
    }

    res.json({ fileId, message: 'File uploaded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/unlock/:fileId', async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });

    file.status = 'unlocked';
    await file.save();

    res.json({ message: 'File unlocked', downloadUrl: `/api/files/download/${req.params.fileId}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/download/:fileId', async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (new Date() > file.expiryTime) {
      file.status = 'expired';
      await file.save();
      return res.status(410).json({ error: 'File has expired' });
    }

    const filePath = path.resolve(file.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
