const express = require('express');
const http = require('http');
const crypto = require('crypto');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Battle = require('./models/Battle');
const File = require('./models/File');
const { sendEmail } = require('./utils/email');

dotenv.config();

const app = express();
const server = http.createServer(app);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/filefight')
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Replay route
app.get('/api/battles/replay/:battleId', async (req, res) => {
  try {
    const battle = await Battle.findOne({ battleId: req.params.battleId });
    if (!battle) return res.status(404).json({ error: 'Replay not found' });
    res.json(battle);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/', (req, res) => res.send('FileFight API is running!'));

// Track in-memory room → battleId mapping
const roomBattles = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', async (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('player-joined');

    const roomSize = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;

    // Look up the game type from the File document
    let resolvedGameType = 'tic-tac-toe';
    try {
      const file = await File.findOne({ fileId: roomId });
      if (file?.gameType) resolvedGameType = file.gameType;
    } catch (_) { /* use default */ }

    if (roomSize === 2) {
      const battleId = `${roomId}-${Date.now()}`;
      roomBattles[roomId] = { battleId, winnerSocketId: null };

      const battle = new Battle({
        battleId,
        fileId: roomId,
        players: [socket.id],
        gameType: resolvedGameType,
        moves: [],
      });
      await battle.save();

      io.in(roomId).emit('game-start', { battleId, gameType: resolvedGameType });

      // Notify sender by email when opponent joins
      try {
        const file = await File.findOne({ fileId: roomId });
        if (file?.senderEmail) {
          await sendEmail({
            to: file.senderEmail,
            subject: 'FileFight — Opponent has joined your arena!',
            html: `
              <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
                <h2 style="color:#a78bfa;">⚔️ Your arena has a challenger!</h2>
                <p>Someone just joined your FileFight room <strong style="color:#fff;font-family:monospace;">${roomId}</strong>.</p>
                <p>The battle for your file has begun.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/battle/${roomId}"
                   style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
                  Watch the Arena
                </a>
              </div>
            `,
          });
        }
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr.message);
      }
    }
  });

  socket.on('submit-move', async ({ roomId, move }) => {
    socket.to(roomId).emit('opponent-move', move);

    const rb = roomBattles[roomId];
    if (rb?.battleId) {
      await Battle.findOneAndUpdate(
        { battleId: rb.battleId },
        { $push: { moves: { ...move, timestamp: Date.now() } } }
      );
    }
  });

  // Relay RPS picks to opponent
  socket.on('rps-pick', ({ roomId, pick }) => {
    socket.to(roomId).emit('rps-opponent-pick', pick);
  });

  // Relay reflex times to opponent
  socket.on('reflex-time', ({ roomId, ms }) => {
    socket.to(roomId).emit('reflex-opponent-time', ms);
  });

  // Relay Type Racer progress to opponent
  socket.on('type-progress', ({ roomId, progress }) => {
    socket.to(roomId).emit('opponent-type-progress', progress);
  });

  // Relay Math Duel answer result to opponent
  socket.on('math-answer', ({ roomId, round, correct }) => {
    socket.to(roomId).emit('opponent-math-answer', { round, correct });
  });

  // Relay Quiz Battle answer to opponent
  socket.on('quiz-answer', ({ roomId, round, correct }) => {
    socket.to(roomId).emit('opponent-quiz-answer', { round, correct });
  });

  // Relay Memory Match progress to opponent
  socket.on('memory-progress', ({ roomId, matches }) => {
    socket.to(roomId).emit('opponent-memory-progress', matches);
  });

  socket.on('game-over', async ({ roomId, winner }) => {
    // Only the winner fires this with winner === 'me'
    if (winner !== 'me') return;

    const rb = roomBattles[roomId];
    if (!rb || rb.winnerSocketId) return; // already resolved
    rb.winnerSocketId = socket.id;

    // Generate a one-time download token for the winner
    const token = crypto.randomBytes(16).toString('hex');

    try {
      if (rb.battleId) {
        await Battle.findOneAndUpdate(
          { battleId: rb.battleId },
          { winner: socket.id, endedAt: new Date() }
        );
      }
      await File.findOneAndUpdate(
        { fileId: roomId },
        { downloadToken: token, status: 'unlocked' }
      );
    } catch (err) {
      console.error('game-over DB update failed:', err.message);
    }

    // Tell each player their correct result
    socket.emit('game-end', 'me');
    socket.emit('download-token', token);
    socket.to(roomId).emit('game-end', 'opponent');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
