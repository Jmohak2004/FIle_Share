const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const File = require('../models/File');
const Challenge = require('../models/Challenge');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { senderId, challengeType, senderEmail, webhookUrl, gameType } = req.body;
    const fileId = Date.now().toString();
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const fileUrl = req.file ? req.file.path : 'dummy.txt';
    const originalName = req.file?.originalname || null;

    const newFile = new File({
      fileId,
      senderId: senderId || 'anon',
      senderEmail: senderEmail || null,
      webhookUrl: webhookUrl || null,
      fileUrl,
      originalName,
      gameType: gameType || 'tic-tac-toe',
      expiryTime,
    });
    await newFile.save();

    if (challengeType) {
      const challenge = new Challenge({
        challengeId: Date.now().toString() + 'c',
        fileId,
        challengeType,
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
    const { token } = req.body;
    const file = await File.findOne({ fileId: req.params.fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (!token || file.downloadToken !== token) {
      return res.status(403).json({ error: 'Invalid token — win the battle to unlock' });
    }

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

    if (file.status !== 'unlocked') {
      return res.status(403).json({ error: 'File locked — win the battle first' });
    }

    const filePath = path.resolve(file.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Fire webhook asynchronously — don't block the download
    if (file.webhookUrl) {
      fireWebhook(file.webhookUrl, {
        event: 'file.downloaded',
        fileId: file.fileId,
        originalName: file.originalName,
        downloadedAt: new Date().toISOString(),
      });
    }

    const downloadName = file.originalName || path.basename(filePath);
    res.download(filePath, downloadName);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

function fireWebhook(url, payload) {
  try {
    const body = JSON.stringify(payload);
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'FileFight-Webhook/1.0',
        },
      },
      (res) => {
        console.log(`Webhook delivered to ${url} — status ${res.statusCode}`);
      }
    );

    req.on('error', (err) => console.error('Webhook delivery failed:', err.message));
    req.write(body);
    req.end();
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
}

module.exports = router;
