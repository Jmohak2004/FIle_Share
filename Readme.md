# 🎮 FileFight

**FileFight** is a gamified file-sharing platform that makes file transfers interactive, competitive, and fun.

Instead of boring traditional file sharing:

Upload → Send → Download

FileFight adds a fun layer in between:

Upload → Play → Unlock → Download

Users can either challenge receivers with mini-games or battle them in real-time to unlock files.

---

## Problem Statement

Traditional file-sharing platforms like :contentReference[oaicite:0]{index=0}, :contentReference[oaicite:1]{index=1}, and :contentReference[oaicite:2]{index=2} are functional but lack engagement.

Current issues:
- No entertainment factor
- No social interaction
- Boring transfer process
- No personalization

We wanted to transform file sharing into an experience rather than a utility.

---

## Solution

FileFight introduces two unique modes:

### 1. Challenge Unlock Mode
The sender uploads a file and chooses a challenge.

The receiver must complete the challenge to access the file.

### Available Challenges
- Puzzle solving
- Rock Paper Scissors
- Trivia quiz
- Memory game
- Guess the emoji
- Speed tapping challenge

---

### 2. Battle Mode
Both sender and receiver join a real-time multiplayer room.

They compete in a quick game.

Winner gets access to the file.

### Available Battle Games
- Tic Tac Toe
- Quiz battle
- Racing challenge
- Reflex challenge
- Tap battle

---

## How It Works

### Challenge Mode Flow

```text
Sender uploads file
↓
Selects challenge
↓
Share link/code generated
↓
Receiver opens link
↓
Completes challenge
↓
File unlocks
↓
Download file
```

### Battle Mode Flow

```text
Sender uploads file
↓
Selects battle mode
↓
Receiver joins room
↓
Real-time battle starts
↓
Winner selected
↓
Winner gets file
```

---

## Features

- Secure file upload
- Real-time file transfer
- Mini-game unlock system
- Multiplayer battle mode
- Temporary file storage
- Auto-expiry links
- Leaderboards
- Rewards system
- Mobile responsive design

---

## Tech Stack

### Frontend
- :contentReference[oaicite:3]{index=3}
- :contentReference[oaicite:4]{index=4}
- Tailwind CSS

### Backend
- :contentReference[oaicite:5]{index=5}
- :contentReference[oaicite:6]{index=6}

### Database
- :contentReference[oaicite:7]{index=7}

### File Storage
- :contentReference[oaicite:8]{index=8}

### Real-Time Communication
- :contentReference[oaicite:9]{index=9}

### Authentication
- :contentReference[oaicite:10]{index=10} Auth

### Deployment
- :contentReference[oaicite:11]{index=11}
- :contentReference[oaicite:12]{index=12}

---

## System Architecture

```text
                 Users
                   |
      -----------------------------
      |                           |
   Sender                     Receiver
      |                           |
      -------- Frontend Layer -----
                   |
               API Gateway
                   |
    -----------------------------------------
    |              |             |          |
 Auth Service   File Service   Game Engine  DB
    |              |             |          |
Firebase        AWS S3       Socket.io   MongoDB
```

---

## Folder Structure

```bash
filefight/
│
├── client/
│   ├── components/
│   ├── pages/
│   ├── games/
│   └── utils/
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── sockets/
│   └── middleware/
│
└── README.md
```

---

## Database Schema

### Users

```javascript
{
  userId,
  username,
  email,
  coins,
  badges
}
```

### Files

```javascript
{
  fileId,
  senderId,
  receiverId,
  fileUrl,
  expiryTime,
  status
}
```

### Challenges

```javascript
{
  challengeId,
  fileId,
  challengeType,
  attemptsAllowed
}
```

### Battles

```javascript
{
  battleId,
  players,
  gameType,
  winner
}
```

---

## Installation

```bash
git clone https://github.com/your-username/filefight.git
cd filefight
npm install
```

---

## Environment Variables

Create a `.env` file:

```env
MONGO_URI=
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_BUCKET_NAME=
FIREBASE_API_KEY=
JWT_SECRET=
SOCKET_PORT=
```

---

## Run Locally

### Frontend

```bash
cd client
npm run dev
```

### Backend

```bash
cd server
npm start
```

---

## Future Scope

- AI-generated personalized challenges
- AR treasure hunt unlocking
- NFT badges using :contentReference[oaicite:13]{index=13}
- Voice battle mode
- Corporate gamified document sharing

---

## Use Cases

- Students sharing notes
- Friends sharing memes/photos
- Event invitations
- Surprise gift reveals
- Marketing campaigns
- Interactive content sharing

---

## Monetization

- Premium mini-games
- Subscription model
- Enterprise partnerships
- Brand sponsorships

---

## Why FileFight?

Because file sharing should be fun.

Why simply send a file when users can **play for it**? 🚀
