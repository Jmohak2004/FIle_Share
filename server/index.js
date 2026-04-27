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

// Room state tracking
const roomBattles   = {};  // roomId -> { battleId, winnerSocketId }
const roomPlayers   = {};  // roomId -> Set<socketId>
const roomCreators  = {};  // roomId -> socketId (first joiner = creator)
const roomGameTypes = {};  // roomId -> gameType (creator override)
const reconnectTimers = {}; // roomId -> Timeout

const RECONNECT_HOLD_MS = 30_000;

function cleanupRoom(roomId) {
  delete roomBattles[roomId];
  delete roomPlayers[roomId];
  delete roomCreators[roomId];
  delete roomGameTypes[roomId];
  delete reconnectTimers[roomId];
  console.log(`Room ${roomId} cleaned up`);
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join-room', async (roomId) => {
    // Cancel any pending cleanup timer
    if (reconnectTimers[roomId]) {
      clearTimeout(reconnectTimers[roomId]);
      delete reconnectTimers[roomId];
      socket.to(roomId).emit('opponent-reconnected');
    }

    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!roomPlayers[roomId]) roomPlayers[roomId] = new Set();
    roomPlayers[roomId].add(socket.id);

    // Rejoin an in-progress battle (reconnection)
    if (roomBattles[roomId]?.battleId) {
      socket.emit('game-rejoin', {
        battleId: roomBattles[roomId].battleId,
        gameType: roomGameTypes[roomId] || 'tic-tac-toe',
      });
      socket.to(roomId).emit('opponent-reconnected');
      return;
    }

    // Mark creator (first joiner)
    if (!roomCreators[roomId]) {
      roomCreators[roomId] = socket.id;
      socket.emit('you-are-creator');
    }

    socket.to(roomId).emit('player-joined');

    const roomSize = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
    if (roomSize === 2) {
      let resolvedGameType = roomGameTypes[roomId] || 'tic-tac-toe';
      try {
        const file = await File.findOne({ fileId: roomId });
        if (!roomGameTypes[roomId] && file?.gameType) resolvedGameType = file.gameType;
      } catch (_) {}

      const battleId = `${roomId}-${Date.now()}`;
      roomBattles[roomId] = { battleId, winnerSocketId: null };

      const battle = new Battle({
        battleId,
        fileId: roomId,
        players: Array.from(roomPlayers[roomId]),
        gameType: resolvedGameType,
        moves: [],
      });
      await battle.save().catch(err => console.error('Battle save failed:', err.message));

      io.in(roomId).emit('game-start', { battleId, gameType: resolvedGameType });

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

  // Creator updates the game type while waiting
  socket.on('set-game-type', ({ roomId, gameType }) => {
    if (roomCreators[roomId] !== socket.id) return;
    roomGameTypes[roomId] = gameType;
    socket.to(roomId).emit('game-type-changed', gameType);
  });

  socket.on('submit-move', async ({ roomId, move }) => {
    socket.to(roomId).emit('opponent-move', move);
    const rb = roomBattles[roomId];
    if (rb?.battleId) {
      await Battle.findOneAndUpdate(
        { battleId: rb.battleId },
        { $push: { moves: { ...move, timestamp: Date.now() } } }
      ).catch(() => {});
    }
  });

  socket.on('rps-pick',       ({ roomId, pick })     => socket.to(roomId).emit('rps-opponent-pick', pick));
  socket.on('reflex-time',    ({ roomId, ms })        => socket.to(roomId).emit('reflex-opponent-time', ms));
  socket.on('type-progress',  ({ roomId, progress })  => socket.to(roomId).emit('opponent-type-progress', progress));
  socket.on('math-answer',    ({ roomId, round, correct }) => socket.to(roomId).emit('opponent-math-answer', { round, correct }));
  socket.on('quiz-answer',    ({ roomId, round, correct }) => socket.to(roomId).emit('opponent-quiz-answer', { round, correct }));
  socket.on('memory-progress',({ roomId, matches })   => socket.to(roomId).emit('opponent-memory-progress', matches));

  // Reaction emotes
  socket.on('reaction', ({ roomId, emoji }) => {
    socket.to(roomId).emit('opponent-reaction', emoji);
  });

  // Rematch flow
  socket.on('rematch-request', ({ roomId }) => {
    socket.to(roomId).emit('rematch-requested');
  });

  socket.on('rematch-accept', async ({ roomId, gameType }) => {
    const resolvedType = gameType || roomGameTypes[roomId] || 'tic-tac-toe';
    roomGameTypes[roomId] = resolvedType;

    const battleId = `${roomId}-${Date.now()}`;
    roomBattles[roomId] = { battleId, winnerSocketId: null };

    const battle = new Battle({
      battleId,
      fileId: roomId,
      players: Array.from(roomPlayers[roomId] || []),
      gameType: resolvedType,
      moves: [],
    });
    await battle.save().catch(() => {});

    io.in(roomId).emit('rematch-start', { battleId, gameType: resolvedType });
  });

  socket.on('game-over', async ({ roomId, winner }) => {
    if (winner !== 'me') return;

    const rb = roomBattles[roomId];
    if (!rb || rb.winnerSocketId) return;
    rb.winnerSocketId = socket.id;

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

    socket.emit('game-end', 'me');
    socket.emit('download-token', token);
    socket.to(roomId).emit('game-end', 'opponent');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    const roomId = socket.data.roomId;
    if (!roomId) return;

    if (roomPlayers[roomId]) roomPlayers[roomId].delete(socket.id);

    const gameInProgress = roomBattles[roomId]?.battleId && !roomBattles[roomId]?.winnerSocketId;
    const playersLeft = roomPlayers[roomId]?.size ?? 0;

    socket.to(roomId).emit('opponent-disconnected');

    if (playersLeft === 0) {
      // Hold room briefly in case of refresh; longer if game was in progress
      reconnectTimers[roomId] = setTimeout(
        () => cleanupRoom(roomId),
        gameInProgress ? RECONNECT_HOLD_MS : 8_000
      );
    } else if (gameInProgress) {
      // Opponent still connected — hold for rejoining
      reconnectTimers[roomId] = setTimeout(() => {
        io.in(roomId).emit('room-expired');
        cleanupRoom(roomId);
      }, RECONNECT_HOLD_MS);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
