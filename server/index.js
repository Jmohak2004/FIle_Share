const express = require('express');
const http = require('http');
const crypto = require('crypto');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Battle = require('./models/Battle');
const File = require('./models/File');
const { sendEmail } = require('./utils/email');

dotenv.config();

// Ensure uploads directory exists at startup
const UPLOADS_DIR = process.env.UPLOADS_DIR || 'uploads';
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Allowed origins: CLIENT_URL env var + localhost dev
const CLIENT_URL = process.env.CLIENT_URL || '';
const allowedOrigins = CLIENT_URL
  ? [CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174']
  : '*';

const app = express();
const server = http.createServer(app);

// Trust Render's reverse proxy so express sees correct IP/protocol
app.set('trust proxy', 1);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/filefight')
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
  // Render's free tier: allow long-polling fallback if WebSocket fails
  transports: ['websocket', 'polling'],
});

app.use(cors({ origin: allowedOrigins }));
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

// Room state
const roomBattles    = {};  // roomId -> { battleId, winnerSocketId }
const roomPlayers    = {};  // roomId -> Set<socketId>  (max 2)
const roomSpectators = {};  // roomId -> Set<socketId>
const roomCreators   = {};  // roomId -> socketId
const roomGameTypes  = {};  // roomId -> gameType
const roomSeries     = {};  // roomId -> series state
const reconnectTimers = {};

const RECONNECT_HOLD_MS = 30_000;

function spectatorCount(roomId) {
  return roomSpectators[roomId]?.size ?? 0;
}

function broadcastSpectatorCount(roomId) {
  io.in(roomId).emit('spectator-count', spectatorCount(roomId));
}

function cleanupRoom(roomId) {
  delete roomBattles[roomId];
  delete roomPlayers[roomId];
  delete roomSpectators[roomId];
  delete roomCreators[roomId];
  delete roomGameTypes[roomId];
  delete roomSeries[roomId];
  delete reconnectTimers[roomId];
  console.log(`Room ${roomId} cleaned up`);
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('join-room', async (roomId) => {
    if (reconnectTimers[roomId]) {
      clearTimeout(reconnectTimers[roomId]);
      delete reconnectTimers[roomId];
      socket.to(roomId).emit('opponent-reconnected');
    }

    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!roomPlayers[roomId]) roomPlayers[roomId] = new Set();
    if (!roomSpectators[roomId]) roomSpectators[roomId] = new Set();

    const playerCount = roomPlayers[roomId].size;

    // Spectator: room already has 2 players
    if (playerCount >= 2) {
      roomSpectators[roomId].add(socket.id);
      socket.data.isSpectator = true;
      socket.emit('you-are-spectator', {
        battleId: roomBattles[roomId]?.battleId || null,
        gameType: roomGameTypes[roomId] || null,
        spectatorCount: spectatorCount(roomId),
      });
      broadcastSpectatorCount(roomId);
      return;
    }

    // Regular player join
    roomPlayers[roomId].add(socket.id);
    socket.data.isSpectator = false;

    // Rejoin in-progress battle (reconnection)
    if (roomBattles[roomId]?.battleId) {
      socket.emit('game-rejoin', {
        battleId: roomBattles[roomId].battleId,
        gameType: roomGameTypes[roomId] || 'tic-tac-toe',
      });
      socket.to(roomId).emit('opponent-reconnected');
      return;
    }

    if (!roomCreators[roomId]) {
      roomCreators[roomId] = socket.id;
      socket.emit('you-are-creator');
    }

    socket.to(roomId).emit('player-joined');

    const roomSize = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
    if (roomPlayers[roomId].size === 2) {
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

  socket.on('rps-pick',        ({ roomId, pick })     => socket.to(roomId).emit('rps-opponent-pick', pick));
  socket.on('reflex-time',     ({ roomId, ms })        => socket.to(roomId).emit('reflex-opponent-time', ms));
  socket.on('type-progress',   ({ roomId, progress })  => socket.to(roomId).emit('opponent-type-progress', progress));
  socket.on('math-answer',     ({ roomId, round, correct }) => socket.to(roomId).emit('opponent-math-answer', { round, correct }));
  socket.on('quiz-answer',     ({ roomId, round, correct }) => socket.to(roomId).emit('opponent-quiz-answer', { round, correct }));
  socket.on('memory-progress', ({ roomId, matches })   => socket.to(roomId).emit('opponent-memory-progress', matches));

  socket.on('reaction', ({ roomId, emoji }) => socket.to(roomId).emit('opponent-reaction', emoji));

  // ── Chat ──
  socket.on('chat-message', ({ roomId, text }) => {
    const msg = { from: socket.id, text: String(text).slice(0, 300), ts: Date.now() };
    socket.to(roomId).emit('chat-message', msg);
  });

  socket.on('typing-start', ({ roomId }) => socket.to(roomId).emit('opponent-typing', true));
  socket.on('typing-stop',  ({ roomId }) => socket.to(roomId).emit('opponent-typing', false));

  // ── Voice signaling (player-to-player only, not to spectators) ──
  function emitToPlayers(roomId, event, data, excludeId) {
    const players = Array.from(roomPlayers[roomId] || []).filter(id => id !== excludeId);
    players.forEach(id => io.to(id).emit(event, data));
  }

  socket.on('voice-offer',  ({ roomId, signal }) => emitToPlayers(roomId, 'voice-offer',  { signal, from: socket.id }, socket.id));
  socket.on('voice-answer', ({ roomId, signal }) => emitToPlayers(roomId, 'voice-answer', { signal, from: socket.id }, socket.id));
  socket.on('voice-ice',    ({ roomId, candidate }) => emitToPlayers(roomId, 'voice-ice', { candidate }, socket.id));

  // ── Series ──
  socket.on('propose-series', ({ roomId, mode }) => {
    if (socket.data.isSpectator) return;
    if (!roomSeries[roomId]) roomSeries[roomId] = {};
    roomSeries[roomId].proposedBy = socket.id;
    roomSeries[roomId].proposedMode = mode;
    io.in(roomId).emit('series-proposed', { mode, proposedBy: socket.id });
  });

  socket.on('accept-series', ({ roomId }) => {
    if (socket.data.isSpectator) return;
    const sr = roomSeries[roomId];
    if (!sr?.proposedMode) return;
    const mode = sr.proposedMode;
    const needed = Math.ceil(mode / 2);
    roomSeries[roomId] = { active: true, mode, needed, scores: {}, gamesPlayed: 0 };
    io.in(roomId).emit('series-started', { mode, needed });
    // Auto-start first game of series
    _startNextSeriesGame(roomId);
  });

  socket.on('reject-series', ({ roomId }) => {
    if (roomSeries[roomId]) delete roomSeries[roomId];
    socket.to(roomId).emit('series-rejected');
  });

  async function _startNextSeriesGame(roomId) {
    const resolvedGameType = roomGameTypes[roomId] || 'tic-tac-toe';
    const battleId = `${roomId}-${Date.now()}`;
    roomBattles[roomId] = { battleId, winnerSocketId: null };

    const battle = new Battle({
      battleId,
      fileId: roomId,
      players: Array.from(roomPlayers[roomId] || []),
      gameType: resolvedGameType,
      moves: [],
    });
    await battle.save().catch(() => {});

    io.in(roomId).emit('rematch-start', { battleId, gameType: resolvedGameType, seriesGame: true });
  }

  // ── Rematch ──
  socket.on('rematch-request', ({ roomId }) => socket.to(roomId).emit('rematch-requested'));

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

  // ── Game over ──
  socket.on('game-over', async ({ roomId, winner }) => {
    if (winner !== 'me') return;
    if (socket.data.isSpectator) return;

    const rb = roomBattles[roomId];
    if (!rb || rb.winnerSocketId) return;
    rb.winnerSocketId = socket.id;

    if (rb.battleId) {
      await Battle.findOneAndUpdate(
        { battleId: rb.battleId },
        { winner: socket.id, endedAt: new Date() }
      ).catch(() => {});
    }

    const series = roomSeries[roomId];

    if (series?.active) {
      // Series round result
      if (!series.scores[socket.id]) series.scores[socket.id] = 0;
      series.scores[socket.id]++;
      series.gamesPlayed = (series.gamesPlayed || 0) + 1;

      // Emit round result
      socket.emit('game-end', 'me');
      socket.to(roomId).emit('game-end', 'opponent');

      // Update scores for everyone (including spectators)
      io.in(roomId).emit('series-score', {
        scores: series.scores,
        needed: series.needed,
        mode: series.mode,
      });

      if (series.scores[socket.id] >= series.needed) {
        // Series winner
        const token = crypto.randomBytes(16).toString('hex');
        try {
          await File.findOneAndUpdate({ fileId: roomId }, { downloadToken: token, status: 'unlocked' });
        } catch (err) {
          console.error('series winner unlock failed:', err.message);
        }
        socket.emit('download-token', token);
        io.in(roomId).emit('series-end', { winnerSocket: socket.id });
        delete roomSeries[roomId];
      } else {
        // Next game after 3s countdown
        io.in(roomId).emit('series-next-countdown', 3);
        setTimeout(() => _startNextSeriesGame(roomId), 3000);
      }
    } else {
      // No series — standard unlock
      const token = crypto.randomBytes(16).toString('hex');
      try {
        await File.findOneAndUpdate({ fileId: roomId }, { downloadToken: token, status: 'unlocked' });
      } catch (err) {
        console.error('game-over DB update failed:', err.message);
      }
      socket.emit('game-end', 'me');
      socket.emit('download-token', token);
      socket.to(roomId).emit('game-end', 'opponent');
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    const roomId = socket.data.roomId;
    if (!roomId) return;

    if (socket.data.isSpectator) {
      if (roomSpectators[roomId]) roomSpectators[roomId].delete(socket.id);
      broadcastSpectatorCount(roomId);
      return;
    }

    if (roomPlayers[roomId]) roomPlayers[roomId].delete(socket.id);

    const gameInProgress = roomBattles[roomId]?.battleId && !roomBattles[roomId]?.winnerSocketId;
    const playersLeft = roomPlayers[roomId]?.size ?? 0;

    socket.to(roomId).emit('opponent-disconnected');

    if (playersLeft === 0) {
      reconnectTimers[roomId] = setTimeout(
        () => cleanupRoom(roomId),
        gameInProgress ? RECONNECT_HOLD_MS : 8_000
      );
    } else if (gameInProgress) {
      reconnectTimers[roomId] = setTimeout(() => {
        io.in(roomId).emit('room-expired');
        cleanupRoom(roomId);
      }, RECONNECT_HOLD_MS);
    }
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
