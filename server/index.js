const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const mongoose = require('mongoose');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/filefight')
.then(() => {
  console.log('MongoDB connected successfully');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

const io = new Server(server, {

  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('FileFight API is running!');
});

// Socket.io integration for Battle Mode
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('player-joined');
    if (io.sockets.adapter.rooms.get(roomId)?.size === 2) {
      io.in(roomId).emit('game-start');
    }
  });

  socket.on('submit-move', ({roomId, move}) => {
    // Basic battle logic placeholder
    socket.to(roomId).emit('opponent-move', move);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.SOCKET_PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
