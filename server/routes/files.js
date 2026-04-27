const express = require('express');
const router = express.Router();
const multer = require('multer');
const File = require('../models/File');
const Challenge = require('../models/Challenge');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { senderId, challengeType } = req.body;
    const fileId = Date.now().toString();
    const expiryTime = new Date(Date.now() + 24*60*60*1000);
    
    const fileUrl = req.file ? req.file.path : 'dummy.txt'; // Fallback mapping for demo
    
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
  res.json({ message: 'File unlocked', downloadUrl: `/download/${req.params.fileId}` });
});

module.exports = router;
