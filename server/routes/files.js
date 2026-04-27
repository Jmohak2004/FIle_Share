const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const archiver = require('archiver');
const File = require('../models/File');
const Challenge = require('../models/Challenge');

const UPLOADS_DIR = process.env.UPLOADS_DIR || 'uploads';
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
});

// Upload one or more files (multiple → zipped automatically)
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { senderId, challengeType, senderEmail, webhookUrl, gameType } = req.body;
    const fileId = Date.now().toString();
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const uploadedFiles = req.files || [];
    if (uploadedFiles.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    let fileUrl, originalName, mimeType, fileSize;

    if (uploadedFiles.length === 1) {
      fileUrl = uploadedFiles[0].path;
      originalName = uploadedFiles[0].originalname;
      mimeType = uploadedFiles[0].mimetype;
      fileSize = uploadedFiles[0].size;
    } else {
      // Zip multiple files
      const zipPath = path.join(UPLOADS_DIR, `${fileId}.zip`);
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 6 } });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        uploadedFiles.forEach(f => archive.file(f.path, { name: f.originalname }));
        archive.finalize();
      });
      // Remove individual temp files
      uploadedFiles.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
      fileUrl = zipPath;
      originalName = `bundle_${fileId}.zip`;
      mimeType = 'application/zip';
      fileSize = fs.statSync(zipPath).size;
    }

    const newFile = new File({
      fileId,
      senderId: senderId || 'anon',
      senderEmail: senderEmail || null,
      webhookUrl: webhookUrl || null,
      fileUrl,
      originalName,
      mimeType,
      fileSize,
      gameType: gameType || 'tic-tac-toe',
      expiryTime,
    });
    await newFile.save();

    if (challengeType) {
      const Challenge2 = require('../models/Challenge');
      const challenge = new Challenge2({
        challengeId: Date.now().toString() + 'c',
        fileId,
        challengeType,
      });
      await challenge.save();
    }

    res.json({ fileId, message: 'File uploaded successfully', originalName, mimeType, fileSize });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public metadata (no file content exposed)
router.get('/info/:fileId', async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({
      fileId: file.fileId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Inline image preview (locked files, just for thumbnail)
router.get('/preview/:fileId', async (req, res) => {
  try {
    const file = await File.findOne({ fileId: req.params.fileId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (!file.mimeType?.startsWith('image/')) return res.status(415).json({ error: 'Not an image' });

    const filePath = path.resolve(file.fileUrl);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
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
