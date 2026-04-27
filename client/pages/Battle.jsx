import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircle2, Skull, Share2, CheckCircle, WifiOff, RotateCcw,
  MessageSquare, X, Mic, MicOff, Eye, Bot, Trophy, Swords,
  FileImage, FileAudio, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { sounds } from '../src/sounds';
import { createBotSocket } from '../src/BotSocket';

import TicTacToe, { tttWinner } from './games/TicTacToe';
import RPS          from './games/RPS';
import MemoryMatch  from './games/MemoryMatch';
import ReflexTap    from './games/ReflexTap';
import TypeRacer    from './games/TypeRacer';
import MathDuel     from './games/MathDuel';
import QuizBattle   from './games/QuizBattle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const GAME_LIST = [
  { id: 'tic-tac-toe', label: 'Tic-Tac-Toe',          icon: '⚔️' },
  { id: 'rps',         label: 'Rock Paper Scissors',   icon: '✊' },
  { id: 'memory',      label: 'Memory Match',          icon: '🧠' },
  { id: 'reflex',      label: 'Reflex Tap',            icon: '⚡' },
  { id: 'type-racer',  label: 'Type Racer',            icon: '⌨️' },
  { id: 'math-duel',   label: 'Math Duel',             icon: '🔢' },
  { id: 'quiz-battle', label: 'Quiz Battle',           icon: '🎯' },
];

const GAME_LABELS = Object.fromEntries(GAME_LIST.map(g => [g.id, `${g.icon}  ${g.label}`]));
const REACTIONS = ['😂', '💀', '🔥', '😤', '👏', '🤯'];

function GameTypePicker({ value, onChange, compact = false }) {
  return (
    <div className={`grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
      {GAME_LIST.map(g => (
        <button
          key={g.id}
          onClick={() => onChange(g.id)}
          className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-bold transition-all ${
            value === g.id
              ? 'bg-purple-900/40 border-purple-500 text-purple-300'
              : 'bg-slate-900/50 border-white/5 text-slate-500 hover:bg-slate-800 hover:text-slate-300'
          }`}
        >
          <span>{g.icon}</span>{g.label}
        </button>
      ))}
    </div>
  );
}

function FileInfoBadge({ fileInfo }) {
  if (!fileInfo) return null;
  const Icon = fileInfo.mimeType?.startsWith('image/')
    ? FileImage
    : fileInfo.mimeType?.startsWith('audio/')
    ? FileAudio
    : FileText;
  const sizeKB = fileInfo.fileSize ? (fileInfo.fileSize / 1024).toFixed(1) : null;
  return (
    <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-slate-800/60 rounded-xl border border-white/5 text-xs text-slate-400 max-w-xs mx-auto">
      <Icon size={13} className="shrink-0 text-purple-400" />
      <span className="truncate font-mono">{fileInfo.originalName || 'payload'}</span>
      {sizeKB && <span className="ml-auto shrink-0 text-slate-600">{sizeKB} KB</span>}
    </div>
  );
}

function ChatSidebar({ open, onClose, messages, onSend, opponentTyping, mySocketId }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-white/10 flex flex-col z-50 shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <MessageSquare size={14} className="text-purple-400" /> Battle Chat
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <p className="text-slate-600 text-xs font-mono text-center mt-8">No messages yet…</p>
        )}
        {messages.map((m, i) => {
          const isMe = m.from === 'me' || m.from === mySocketId;
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm break-words ${
                isMe
                  ? 'bg-purple-700/60 text-purple-100 rounded-br-sm'
                  : 'bg-slate-800 text-slate-300 rounded-bl-sm'
              }`}>
                {m.text}
                <span className="block text-right text-[9px] opacity-40 mt-0.5">
                  {new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        {opponentTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 px-3 py-2 rounded-2xl rounded-bl-sm text-xs text-slate-500 italic">
              opponent is typing…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="p-3 border-t border-white/10 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message…"
          maxLength={300}
          className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-purple-500 transition-colors"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-purple-700 hover:bg-purple-600 rounded-xl text-white text-sm font-bold transition-colors"
        >
          ›
        </button>
      </form>
    </motion.div>
  );
}

export default function Battle() {
  const { roomId } = useParams();

  // Core state
  const [status, setStatus]             = useState('waiting');
  const [gameType, setGameType]         = useState(null);
  const [battleId, setBattleId]         = useState(null);
  const [winner, setWinner]             = useState(null);
  const [replayCopied, setReplayCopied] = useState(false);
  const [downloadToken, setDownloadToken] = useState(null);

  // TTT
  const [board, setBoard]       = useState(Array(9).fill(null));
  const [mySymbol, setMySymbol] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);

  // UI
  const [isCreator, setIsCreator]           = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [pendingGameType, setPendingGameType] = useState('tic-tac-toe');
  const [opponentReaction, setOpponentReaction] = useState(null);
  const [rematchState, setRematchState]     = useState(null);
  const [rematchGameType, setRematchGameType] = useState('tic-tac-toe');
  const [reconnectCountdown, setReconnectCountdown] = useState(null);

  // Spectator
  const [isSpectator, setIsSpectator]       = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(0);

  // Chat
  const [chatOpen, setChatOpen]         = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const typingEmitTimer = useRef(null);
  const typingClearTimer = useRef(null);
  const mySocketId = useRef(null);

  // Series
  const [seriesState, setSeriesState]   = useState(null); // null|'waiting-accept'|'incoming'|'active'|'ended'
  const [seriesMode, setSeriesMode]     = useState(null);
  const [seriesNeeded, setSeriesNeeded] = useState(null);
  const [seriesScores, setSeriesScores] = useState({ me: 0, opponent: 0 });
  const [seriesEndWinner, setSeriesEndWinner] = useState(null); // 'me'|'opponent'

  // Bot mode
  const [isBotMode, setIsBotMode]           = useState(false);
  const [botWaitCountdown, setBotWaitCountdown] = useState(60);
  const [showBotButton, setShowBotButton]   = useState(false);
  const botCountdownRef  = useRef(null);
  const botSocketRef     = useRef(null);

  // Voice
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceMuted, setVoiceMuted]   = useState(false);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);

  // File info
  const [fileInfo, setFileInfo] = useState(null);

  const socketRef           = useRef(null);
  const isFirstRef          = useRef(false);
  const gameResultSent      = useRef(false);
  const opponentReactionTimer = useRef(null);
  const countdownInterval   = useRef(null);

  const activeSocket = () => isBotMode ? botSocketRef.current?.socket : socketRef.current;

  // Fetch file metadata for waiting-screen preview
  useEffect(() => {
    axios.get(`${API_URL}/api/files/info/${roomId}`)
      .then(r => setFileInfo(r.data))
      .catch(() => {});
  }, [roomId]);

  const fireConfetti = useCallback(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => confetti({ particleCount: 80, angle: 60,  spread: 55, origin: { x: 0 } }), 250);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 400);
  }, []);

  const handleGameResult = useCallback((result) => {
    if (gameResultSent.current) return;
    gameResultSent.current = true;
    setWinner(result);
    setStatus('ended');
    socketRef.current?.emit('game-over', { roomId, winner: result });
    if (result === 'me') {
      fireConfetti();
      sounds.win();
      toast.success('You won! 🏆');
    } else if (result === 'opponent') {
      sounds.lose();
      toast.error('You lost 💀');
    } else {
      toast('Draw! 🤝', { icon: '⚔️' });
    }
  }, [roomId, fireConfetti]);

  const handleCellClick = useCallback((index) => {
    if (!isMyTurn || board[index] || winner || status !== 'playing') return;
    const nb = [...board];
    nb[index] = mySymbol;
    setBoard(nb);
    setIsMyTurn(false);
    if (!isBotMode) {
      socketRef.current?.emit('submit-move', { roomId, move: { player: socketRef.current.id, cellIndex: index } });
    }
    const w = tttWinner(nb);
    const isDraw = !w && nb.every(Boolean);
    if (w || isDraw) handleGameResult(w === mySymbol ? 'me' : isDraw ? 'draw' : 'opponent');
  }, [isMyTurn, board, winner, status, mySymbol, roomId, isBotMode, handleGameResult]);

  // Bot TTT: make a move when it's opponent's turn
  useEffect(() => {
    if (!isBotMode || status !== 'playing' || gameType !== 'tic-tac-toe' || isMyTurn || winner) return;
    const opSymbol = mySymbol === 'X' ? 'O' : 'X';
    const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
    if (empty.length === 0) return;
    const delay = 600 + Math.random() * 800;
    const t = setTimeout(() => {
      const pick = empty[Math.floor(Math.random() * empty.length)];
      setBoard(prev => {
        const nb = [...prev];
        nb[pick] = opSymbol;
        const w = tttWinner(nb);
        const isDraw = !w && nb.every(Boolean);
        if (w) handleGameResult(w === mySymbol ? 'me' : 'opponent');
        else if (isDraw) handleGameResult('draw');
        return nb;
      });
      setIsMyTurn(true);
    }, delay);
    return () => clearTimeout(t);
  }, [isBotMode, status, gameType, isMyTurn, board, mySymbol, winner, handleGameResult]);

  const sendReaction = useCallback((emoji) => {
    socketRef.current?.emit('reaction', { roomId, emoji });
  }, [roomId]);

  const requestRematch = useCallback(() => {
    setRematchState('requesting');
    socketRef.current?.emit('rematch-request', { roomId });
    toast('Rematch requested! Waiting...', { icon: '🔄' });
  }, [roomId]);

  const acceptRematch = useCallback(() => {
    socketRef.current?.emit('rematch-accept', { roomId, gameType: rematchGameType });
    setRematchState(null);
  }, [roomId, rematchGameType]);

  const updatePendingGameType = useCallback((type) => {
    setPendingGameType(type);
    socketRef.current?.emit('set-game-type', { roomId, gameType: type });
  }, [roomId]);

  const startCountdown = useCallback(() => {
    clearInterval(countdownInterval.current);
    let secs = 30;
    setReconnectCountdown(secs);
    countdownInterval.current = setInterval(() => {
      secs -= 1;
      setReconnectCountdown(secs);
      if (secs <= 0) clearInterval(countdownInterval.current);
    }, 1000);
  }, []);

  // Bot wait countdown (creator only)
  useEffect(() => {
    if (!isCreator || status !== 'waiting' || isBotMode) return;
    let secs = 60;
    setBotWaitCountdown(secs);
    setShowBotButton(false);
    botCountdownRef.current = setInterval(() => {
      secs--;
      setBotWaitCountdown(secs);
      if (secs <= 0) {
        clearInterval(botCountdownRef.current);
        setShowBotButton(true);
      }
    }, 1000);
    return () => clearInterval(botCountdownRef.current);
  }, [isCreator, status, isBotMode]);

  const startBotGame = useCallback(() => {
    clearInterval(botCountdownRef.current);
    setIsBotMode(true);
    setShowBotButton(false);
    socketRef.current?.disconnect();

    const type = pendingGameType;
    const { socket: botSock, startBotBehavior } = createBotSocket(type);
    botSocketRef.current = { socket: botSock, startBotBehavior };

    setBattleId('bot-' + Date.now());
    setGameType(type);
    setStatus('playing');
    setMySymbol('X');
    setIsMyTurn(true);
    isFirstRef.current = true;
    gameResultSent.current = false;
    setOpponentOnline(true);

    toast('Bot opponent activated!', { icon: '🤖' });
    startBotBehavior();
  }, [pendingGameType]);

  // ── Chat helpers ──
  const sendChatMessage = useCallback((text) => {
    const msg = { from: 'me', text, ts: Date.now() };
    setChatMessages(prev => [...prev, msg]);
    socketRef.current?.emit('chat-message', { roomId, text });
  }, [roomId]);

  const handleChatInputActivity = useCallback(() => {
    clearTimeout(typingEmitTimer.current);
    socketRef.current?.emit('typing-start', { roomId });
    typingEmitTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing-stop', { roomId });
    }, 1500);
  }, [roomId]);

  // ── Voice helpers ──
  const startVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socketRef.current?.emit('voice-ice', { roomId, candidate });
      };

      pc.ontrack = (e) => {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.play().catch(() => {});
      };

      if (isCreator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit('voice-offer', { roomId, signal: pc.localDescription });
      }

      setVoiceActive(true);
      toast.success('Voice chat active');
    } catch (err) {
      toast.error('Microphone access denied');
      console.error('Voice error:', err);
    }
  }, [roomId, isCreator]);

  const stopVoice = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    setVoiceActive(false);
    setVoiceMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setVoiceMuted(v => !v);
  }, []);

  // ── Series helpers ──
  const proposeSeries = useCallback((mode) => {
    socketRef.current?.emit('propose-series', { roomId, mode });
    setSeriesState('waiting-accept');
    setSeriesMode(mode);
  }, [roomId]);

  const acceptSeries = useCallback(() => {
    socketRef.current?.emit('accept-series', { roomId });
  }, [roomId]);

  const rejectSeries = useCallback(() => {
    socketRef.current?.emit('reject-series', { roomId });
    setSeriesState(null);
  }, [roomId]);

  /* ── Socket lifecycle ── */
  useEffect(() => {
    const socket = io(API_URL, { reconnectionAttempts: 8, reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      mySocketId.current = socket.id;
      socket.emit('join-room', roomId);
    });

    socket.on('you-are-creator', () => setIsCreator(true));

    socket.on('you-are-spectator', ({ battleId: bid, gameType: gt, spectatorCount: sc }) => {
      setIsSpectator(true);
      setSpectatorCount(sc);
      if (bid) setBattleId(bid);
      if (gt) setGameType(gt);
      if (bid) setStatus('playing');
      toast('You are spectating this battle', { icon: '👁' });
    });

    socket.on('spectator-count', (count) => setSpectatorCount(count));

    socket.on('player-joined', () => {
      isFirstRef.current = true;
      setOpponentOnline(true);
      clearInterval(botCountdownRef.current);
      setShowBotButton(false);
      sounds.opponentJoined();
      toast.success('Opponent joined the arena!');
      setStatus('ready');
    });

    socket.on('game-start', ({ battleId: bid, gameType: gt }) => {
      const type = gt || 'tic-tac-toe';
      setBattleId(bid);
      setGameType(type);
      setRematchGameType(type);
      setStatus('playing');
      const symbol = isFirstRef.current ? 'X' : 'O';
      setMySymbol(symbol);
      setIsMyTurn(symbol === 'X');
      gameResultSent.current = false;
      sounds.battleStart();
      toast(`Battle: ${GAME_LABELS[type] || type}`, { icon: '⚔️' });
    });

    socket.on('game-rejoin', ({ battleId: bid, gameType: gt }) => {
      setBattleId(bid);
      setGameType(gt);
      setStatus('playing');
      toast.success('Reconnected to battle!');
    });

    socket.on('opponent-reconnected', () => {
      setOpponentOnline(true);
      clearInterval(countdownInterval.current);
      setReconnectCountdown(null);
      toast.success('Opponent reconnected!');
    });

    socket.on('opponent-disconnected', () => {
      setOpponentOnline(false);
      toast.error('Opponent disconnected. Waiting 30s...');
      startCountdown();
    });

    socket.on('room-expired', () => {
      clearInterval(countdownInterval.current);
      setReconnectCountdown(null);
      setStatus('ended');
      toast.error('Room expired — opponent never returned.');
    });

    socket.on('game-type-changed', (type) => {
      setPendingGameType(type);
      toast(`Game changed to ${GAME_LABELS[type] || type}`, { icon: '🎮' });
    });

    socket.on('opponent-reaction', (emoji) => {
      if (opponentReactionTimer.current) clearTimeout(opponentReactionTimer.current);
      setOpponentReaction(emoji);
      sounds.reaction();
      opponentReactionTimer.current = setTimeout(() => setOpponentReaction(null), 3000);
    });

    // Chat
    socket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      sounds.reaction?.();
    });

    socket.on('opponent-typing', (isTyping) => {
      clearTimeout(typingClearTimer.current);
      setOpponentTyping(isTyping);
      if (isTyping) {
        typingClearTimer.current = setTimeout(() => setOpponentTyping(false), 4000);
      }
    });

    // Voice
    socket.on('voice-offer', async ({ signal }) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcRef.current = pc;

        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.onicecandidate = ({ candidate }) => {
          if (candidate) socket.emit('voice-ice', { roomId, candidate });
        };

        pc.ontrack = (e) => {
          const audio = new Audio();
          audio.srcObject = e.streams[0];
          audio.play().catch(() => {});
        };

        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice-answer', { roomId, signal: pc.localDescription });
        setVoiceActive(true);
        toast.success('Voice chat connected');
      } catch (err) {
        console.error('Voice answer error:', err);
      }
    });

    socket.on('voice-answer', async ({ signal }) => {
      try {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(signal));
      } catch (err) {
        console.error('Voice setRemoteDescription error:', err);
      }
    });

    socket.on('voice-ice', ({ candidate }) => {
      try {
        pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {}
    });

    // Series
    socket.on('series-proposed', ({ mode, proposedBy }) => {
      if (proposedBy === socket.id) {
        setSeriesState('waiting-accept');
      } else {
        setSeriesState('incoming');
        setSeriesMode(mode);
      }
      toast(`Best of ${mode} series proposed!`, { icon: '🏆' });
    });

    socket.on('series-started', ({ mode, needed }) => {
      setSeriesMode(mode);
      setSeriesNeeded(needed);
      setSeriesState('active');
      setSeriesScores({ me: 0, opponent: 0 });
      toast(`Series started! Best of ${mode}`, { icon: '🏆' });
    });

    socket.on('series-score', ({ scores, needed, mode }) => {
      const myId = socket.id;
      const opId = Object.keys(scores).find(id => id !== myId);
      setSeriesScores({
        me: scores[myId] || 0,
        opponent: scores[opId] || 0,
      });
      setSeriesNeeded(needed);
    });

    socket.on('series-end', ({ winnerSocket }) => {
      setSeriesState('ended');
      setSeriesEndWinner(winnerSocket === socket.id ? 'me' : 'opponent');
      if (winnerSocket === socket.id) {
        fireConfetti();
        sounds.win();
        toast.success('Series won! 🏆');
      } else {
        sounds.lose();
        toast.error('Series lost 💀');
      }
    });

    socket.on('series-rejected', () => {
      setSeriesState(null);
      toast('Series proposal rejected', { icon: '❌' });
    });

    socket.on('series-next-countdown', (secs) => {
      toast(`Next round in ${secs}s…`, { icon: '⚔️' });
    });

    // Rematch
    socket.on('rematch-requested', () => {
      setRematchState('pending');
      toast('Opponent wants a rematch!', { icon: '🔄' });
    });

    socket.on('rematch-start', ({ battleId: bid, gameType: gt, seriesGame }) => {
      setBattleId(bid);
      setGameType(gt);
      setRematchGameType(gt);
      setWinner(null);
      setStatus('playing');
      setBoard(Array(9).fill(null));
      setIsMyTurn(isFirstRef.current);
      gameResultSent.current = false;
      setRematchState(null);
      sounds.battleStart();
      if (seriesGame) {
        toast(`Series — next round! ${GAME_LABELS[gt] || gt}`, { icon: '⚔️' });
      } else {
        toast(`Rematch! ${GAME_LABELS[gt] || gt}`, { icon: '⚔️' });
      }
    });

    socket.on('opponent-move', ({ cellIndex }) => {
      if (cellIndex == null) return;
      setBoard(prev => {
        const nb = [...prev];
        nb[cellIndex] = mySymbol === 'X' ? 'O' : 'X';
        const w = tttWinner(nb);
        const isDraw = !w && nb.every(Boolean);
        if (w) handleGameResult(w === mySymbol ? 'me' : 'opponent');
        else if (isDraw) handleGameResult('draw');
        return nb;
      });
      setIsMyTurn(true);
    });

    socket.on('game-end', (result) => { setWinner(result); setStatus('ended'); });
    socket.on('download-token', (token) => setDownloadToken(token));

    return () => {
      clearInterval(countdownInterval.current);
      clearInterval(botCountdownRef.current);
      clearTimeout(opponentReactionTimer.current);
      clearTimeout(typingEmitTimer.current);
      clearTimeout(typingClearTimer.current);
      stopVoice();
      socket.disconnect();
    };
  }, [roomId]); // eslint-disable-line

  // Keep opponent-move in sync with mySymbol
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !mySymbol) return;
    socket.off('opponent-move');
    socket.on('opponent-move', ({ cellIndex }) => {
      if (cellIndex == null) return;
      setBoard(prev => {
        const nb = [...prev];
        nb[cellIndex] = mySymbol === 'X' ? 'O' : 'X';
        const w = tttWinner(nb);
        const isDraw = !w && nb.every(Boolean);
        if (w) handleGameResult(w === mySymbol ? 'me' : 'opponent');
        else if (isDraw) handleGameResult('draw');
        return nb;
      });
      setIsMyTurn(true);
    });
  }, [mySymbol, handleGameResult]);

  const handleDownload = async () => {
    try {
      await axios.post(`${API_URL}/api/files/unlock/${roomId}`, { token: downloadToken });
      window.location.href = `${API_URL}/api/files/download/${roomId}`;
    } catch {
      toast.error('Download failed — make sure you won the battle.');
    }
  };

  const replayUrl = battleId && !isBotMode ? `${window.location.origin}/replay/${battleId}` : null;

  const resultLabel = () => {
    if (winner === 'draw')    return <span className="text-yellow-400">DRAW!</span>;
    if (winner === 'me')      return <span className="text-green-400">YOU WIN! 🏆</span>;
    return                           <span className="text-red-400">YOU LOSE 💀</span>;
  };

  const gameSocket = isBotMode ? botSocketRef.current?.socket : socketRef.current;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-3 md:p-6 relative overflow-hidden bg-slate-950">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Spectator banner */}
      {isSpectator && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-indigo-900/90 backdrop-blur-sm border-b border-indigo-500/40 py-2 px-4 text-center text-indigo-200 text-xs font-bold tracking-widest flex items-center justify-center gap-2">
          <Eye size={13} /> SPECTATOR MODE — Watch only
        </div>
      )}

      {/* Header */}
      <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center z-10 mb-4 md:mb-6 w-full max-w-5xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex-1" />
          <div className="text-center flex-1">
            <span className="text-pink-500 font-bold tracking-widest uppercase text-xs block">Arena Zone</span>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 neon-text">
              DEATHMATCH
            </h1>
          </div>
          {/* Controls row */}
          <div className="flex-1 flex items-center justify-end gap-2">
            {/* Spectator count */}
            {spectatorCount > 0 && (
              <span className="flex items-center gap-1 text-indigo-400 text-xs font-bold bg-indigo-900/40 border border-indigo-500/30 px-2 py-1 rounded-full">
                <Eye size={11} /> {spectatorCount}
              </span>
            )}
            {/* Voice button (players only, during battle) */}
            {!isSpectator && !isBotMode && status === 'playing' && (
              <button
                onClick={voiceActive ? (voiceMuted ? toggleMute : stopVoice) : startVoice}
                className={`p-2 rounded-xl border transition-all text-xs ${
                  voiceActive
                    ? voiceMuted
                      ? 'bg-orange-900/40 border-orange-500/40 text-orange-400'
                      : 'bg-green-900/40 border-green-500/40 text-green-400 animate-pulse'
                    : 'bg-slate-800 border-white/10 text-slate-500 hover:text-white'
                }`}
                title={voiceActive ? (voiceMuted ? 'Unmute' : 'Stop voice') : 'Start voice chat'}
              >
                {voiceActive && !voiceMuted ? <Mic size={14} /> : <MicOff size={14} />}
              </button>
            )}
            {/* Chat button */}
            {!isSpectator && (
              <button
                onClick={() => setChatOpen(v => !v)}
                className={`p-2 rounded-xl border transition-all ${
                  chatOpen
                    ? 'bg-purple-900/40 border-purple-500/40 text-purple-400'
                    : 'bg-slate-800 border-white/10 text-slate-500 hover:text-white'
                }`}
                title="Toggle chat"
              >
                <MessageSquare size={14} />
              </button>
            )}
          </div>
        </div>
        {gameType && (
          <p className="text-slate-400 text-sm font-semibold">{GAME_LABELS[gameType] || gameType}</p>
        )}
        <p className="text-slate-600 font-mono text-xs mt-0.5"># {roomId}</p>

        {/* Series score badge */}
        {seriesState === 'active' && (
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-yellow-900/30 border border-yellow-500/30 rounded-full text-yellow-400 text-xs font-bold">
            <Trophy size={11} /> Series: {seriesScores.me} – {seriesScores.opponent}
            <span className="text-yellow-600">· First to {seriesNeeded}</span>
          </div>
        )}

        {/* Bot mode badge */}
        {isBotMode && (
          <div className="inline-flex items-center gap-1.5 mt-2 ml-2 px-3 py-1 bg-emerald-900/30 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold">
            <Bot size={11} /> vs Bot
          </div>
        )}
      </motion.div>

      {/* ── Arena ── */}
      <div className="w-full max-w-5xl z-10">

        {/* Mobile: compact player bar */}
        <div className="flex md:hidden items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 glass-panel px-3 py-2 rounded-2xl flex-1 min-w-0">
            <UserCircle2 size={22} className="text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-blue-400 font-black text-sm leading-none">YOU</p>
              {mySymbol && gameType === 'tic-tac-toe' && <p className="text-blue-300 font-mono text-xs">{mySymbol}</p>}
            </div>
            <span className="ml-auto h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          </div>

          <span className="text-slate-600 font-black text-sm shrink-0">VS</span>

          <div className="flex items-center gap-2 glass-panel px-3 py-2 rounded-2xl flex-1 justify-end min-w-0">
            <AnimatePresence>
              {opponentReaction && (
                <motion.span key={opponentReaction} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-lg">
                  {opponentReaction}
                </motion.span>
              )}
            </AnimatePresence>
            <div className="text-right min-w-0">
              <p className="text-red-400 font-black text-sm leading-none">{isBotMode ? 'BOT' : 'ENEMY'}</p>
              {mySymbol && gameType === 'tic-tac-toe' && <p className="text-rose-300 font-mono text-xs">{mySymbol === 'X' ? 'O' : 'X'}</p>}
            </div>
            {isBotMode ? <Bot size={22} className="text-emerald-400 shrink-0" /> : <UserCircle2 size={22} className="text-red-400 shrink-0" />}
            <span className={`h-2 w-2 rounded-full shrink-0 ${opponentOnline ? 'bg-red-500' : 'bg-slate-600 animate-pulse'}`} />
          </div>
        </div>

        {/* Arena row */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 md:gap-6">

          {/* Player card — desktop */}
          <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="hidden md:flex glass-panel p-6 rounded-3xl w-52 shrink-0 flex-col items-center border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.08)]"
          >
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 border-2 border-blue-400 border-dashed">
              <UserCircle2 size={36} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-black text-blue-400">YOU</h2>
            {mySymbol && gameType === 'tic-tac-toe' && (
              <span className="mt-1 text-blue-300 font-mono font-black">{mySymbol}</span>
            )}
            <span className="animate-pulse flex h-2.5 w-2.5 rounded-full bg-green-500 mt-3" />
            {isCreator && !isSpectator && <span className="mt-2 text-xs text-purple-400 font-semibold tracking-wider">CREATOR</span>}
            {seriesState === 'active' && (
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-500">Series wins</p>
                <p className="text-3xl font-black text-blue-400">{seriesScores.me}</p>
              </div>
            )}
          </motion.div>

          {/* Center column */}
          <div className="flex flex-col flex-1 w-full gap-2">

            {/* Game panel */}
            <div className="relative flex flex-col items-center justify-center p-4 md:p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 min-h-[300px] md:min-h-[360px] w-full overflow-hidden">

              {/* Disconnection overlay */}
              <AnimatePresence>
                {!opponentOnline && status === 'playing' && reconnectCountdown !== null && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-20"
                  >
                    <WifiOff size={40} className="text-orange-400 mb-3" />
                    <p className="text-orange-400 font-black text-lg">OPPONENT DISCONNECTED</p>
                    <p className="text-slate-400 text-sm mt-1">Waiting for reconnection...</p>
                    <div className="mt-4 w-16 h-16 rounded-full border-4 border-orange-500/30 flex items-center justify-center">
                      <span className="text-2xl font-black text-orange-400">{reconnectCountdown}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Status views ── */}

              {status === 'waiting' && (
                <div className="text-center w-full">
                  <Skull className="mx-auto mb-3 text-slate-700 animate-pulse" size={44} />
                  <p className="text-base text-slate-400 font-mono tracking-widest mb-4">AWAITING OPPONENT</p>
                  <div className="flex gap-2 justify-center mb-6">
                    {[0,1,2].map(i => (
                      <span key={i} className="h-2 w-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${i*130}ms` }} />
                    ))}
                  </div>

                  {isCreator ? (
                    <div className="max-w-md mx-auto">
                      <p className="text-xs text-purple-400 font-semibold uppercase tracking-widest mb-2">
                        Pick the game (you're the creator)
                      </p>
                      <GameTypePicker value={pendingGameType} onChange={updatePendingGameType} />

                      {/* File info preview */}
                      <FileInfoBadge fileInfo={fileInfo} />

                      {/* Bot offer */}
                      {showBotButton ? (
                        <button
                          onClick={startBotGame}
                          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl hover:bg-emerald-900/60 transition-colors text-sm"
                        >
                          <Bot size={15} /> Play vs Bot (no one joined)
                        </button>
                      ) : (
                        <p className="text-xs text-slate-600 mt-4 font-mono">
                          Bot offer in {botWaitCountdown}s if no one joins…
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs text-slate-600 mt-2">Room creator is choosing the game…</p>
                      <FileInfoBadge fileInfo={fileInfo} />
                    </div>
                  )}
                </div>
              )}

              {status === 'ready' && (
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center">
                  <p className="text-xl md:text-2xl text-green-400 font-black tracking-widest neon-text">CHALLENGER IDENTIFIED</p>
                  <p className="text-slate-500 mt-2 text-sm">Starting match…</p>
                </motion.div>
              )}

              {status === 'playing' && gameType && gameSocket && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  {gameType === 'tic-tac-toe' && (
                    <TicTacToe board={board} mySymbol={mySymbol} isMyTurn={isMyTurn && !isSpectator} onCellClick={handleCellClick} />
                  )}
                  {gameType === 'rps' && (
                    <RPS key={battleId} onResult={isSpectator ? ()=>{} : handleGameResult} socket={gameSocket} roomId={roomId} />
                  )}
                  {gameType === 'memory' && (
                    <MemoryMatch key={battleId} onResult={isSpectator ? ()=>{} : handleGameResult} socket={gameSocket} roomId={roomId} />
                  )}
                  {gameType === 'reflex' && (
                    <ReflexTap key={battleId} onResult={isSpectator ? ()=>{} : handleGameResult} socket={gameSocket} roomId={roomId} />
                  )}
                  {gameType === 'type-racer' && (
                    <TypeRacer key={battleId} onResult={isSpectator ? ()=>{} : handleGameResult} socket={gameSocket} roomId={roomId} />
                  )}
                  {gameType === 'math-duel' && (
                    <MathDuel key={battleId} onResult={isSpectator ? ()=>{} : handleGameResult} socket={gameSocket} roomId={roomId} />
                  )}
                  {gameType === 'quiz-battle' && (
                    <QuizBattle key={battleId} onResult={isSpectator ? ()=>{} : handleGameResult} socket={gameSocket} roomId={roomId} />
                  )}
                </motion.div>
              )}

              {status === 'ended' && (
                <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="text-center w-full">
                  {/* Series ended screen */}
                  {seriesState === 'ended' ? (
                    <div className="mb-4">
                      <Trophy size={48} className={`mx-auto mb-3 ${seriesEndWinner === 'me' ? 'text-yellow-400' : 'text-slate-600'}`} />
                      <p className="text-3xl md:text-4xl font-black neon-text uppercase">
                        {seriesEndWinner === 'me'
                          ? <span className="text-green-400">SERIES WON! 🏆</span>
                          : <span className="text-red-400">SERIES LOST 💀</span>
                        }
                      </p>
                      <p className="text-slate-500 mt-2 text-sm">
                        Final: {seriesScores.me} – {seriesScores.opponent} in Best of {seriesMode}
                      </p>
                    </div>
                  ) : (
                    <p className="text-3xl md:text-5xl font-black neon-text uppercase drop-shadow-2xl mb-4">
                      {resultLabel()}
                    </p>
                  )}

                  {/* Series score during active series */}
                  {seriesState === 'active' && seriesState !== 'ended' && (
                    <div className="flex items-center justify-center gap-4 mb-4 py-3 px-6 bg-yellow-900/20 border border-yellow-500/20 rounded-2xl">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 uppercase">You</p>
                        <p className="text-3xl font-black text-blue-400">{seriesScores.me}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-yellow-600 uppercase">Best of {seriesMode}</p>
                        <p className="text-lg font-black text-slate-500">–</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 uppercase">Enemy</p>
                        <p className="text-3xl font-black text-rose-400">{seriesScores.opponent}</p>
                      </div>
                    </div>
                  )}

                  {gameType === 'tic-tac-toe' && (
                    <div className="grid grid-cols-3 gap-1.5 mx-auto w-32 h-32 bg-slate-800 p-1.5 rounded-xl mb-4">
                      {board.map((cell, i) => (
                        <div key={i} className={`bg-slate-900 rounded border border-white/5 flex items-center justify-center text-base font-black ${cell === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>{cell}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    {/* Download (only after series ends or no-series win) */}
                    {(winner === 'me' && (seriesState !== 'active')) && downloadToken && (
                      <button onClick={handleDownload}
                        className="w-full px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                      >
                        Download Payload 🎁
                      </button>
                    )}

                    {/* Series in progress: waiting for next round */}
                    {seriesState === 'active' && (
                      <p className="text-slate-500 text-sm font-mono text-center animate-pulse py-2">
                        Next round starting…
                      </p>
                    )}

                    {/* Series proposals (only when no active series) */}
                    {!isSpectator && !isBotMode && seriesState === null && (
                      <>
                        <div className="flex items-center gap-2 justify-center mt-1">
                          <Swords size={12} className="text-yellow-500" />
                          <p className="text-xs text-yellow-500 font-semibold uppercase tracking-widest">Propose Series</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => proposeSeries(3)}
                            className="flex-1 py-2 bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 font-bold rounded-xl text-sm hover:bg-yellow-900/50"
                          >Best of 3</button>
                          <button onClick={() => proposeSeries(5)}
                            className="flex-1 py-2 bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 font-bold rounded-xl text-sm hover:bg-yellow-900/50"
                          >Best of 5</button>
                        </div>
                      </>
                    )}

                    {seriesState === 'waiting-accept' && (
                      <div className="flex items-center gap-2 text-yellow-400 text-sm py-2 justify-center animate-pulse">
                        <Trophy size={14} /> Waiting for opponent to accept series…
                      </div>
                    )}

                    {seriesState === 'incoming' && (
                      <div className="flex flex-col gap-2">
                        <p className="text-yellow-400 font-bold text-sm text-center">
                          Opponent wants Best of {seriesMode} series!
                        </p>
                        <div className="flex gap-2">
                          <button onClick={acceptSeries}
                            className="flex-1 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-sm"
                          >Accept ✅</button>
                          <button onClick={rejectSeries}
                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                          >Decline ❌</button>
                        </div>
                      </div>
                    )}

                    {/* Standard rematch (only when no active or proposed series) */}
                    {!isSpectator && !isBotMode && seriesState === null && (
                      <>
                        {rematchState === null && (
                          <>
                            {isCreator && (
                              <div className="mt-1 mb-1">
                                <p className="text-xs text-slate-500 mb-1 text-left">Rematch game:</p>
                                <GameTypePicker value={rematchGameType} onChange={setRematchGameType} compact />
                              </div>
                            )}
                            <button onClick={requestRematch}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-900/40 border border-blue-500/40 text-blue-300 font-bold rounded-xl hover:bg-blue-900/60 transition-colors"
                            >
                              <RotateCcw size={14} /> Request Rematch
                            </button>
                          </>
                        )}

                        {rematchState === 'requesting' && (
                          <div className="flex items-center gap-2 text-slate-400 text-sm py-2 justify-center">
                            <span className="animate-spin inline-block">🔄</span> Waiting for opponent…
                          </div>
                        )}

                        {rematchState === 'pending' && (
                          <div className="flex flex-col gap-2">
                            <p className="text-yellow-400 font-bold text-sm text-center">Opponent wants a rematch!</p>
                            <div className="flex gap-2">
                              <button onClick={acceptRematch}
                                className="flex-1 py-2 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl text-sm"
                              >Accept ✅</button>
                              <button onClick={() => setRematchState(null)}
                                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                              >Decline ❌</button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {replayUrl && (
                      <>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(replayUrl);
                            setReplayCopied(true);
                            setTimeout(() => setReplayCopied(false), 2000);
                            toast.success('Replay link copied!');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-white/10"
                        >
                          {replayCopied ? <CheckCircle size={15} className="text-green-400" /> : <Share2 size={15} />}
                          {replayCopied ? 'Copied!' : 'Share Replay'}
                        </button>
                        <Link to={`/replay/${battleId}`}
                          className="w-full flex items-center justify-center px-6 py-3 bg-purple-900/40 border border-purple-500/40 text-purple-300 font-bold rounded-xl hover:bg-purple-900/60 transition-colors"
                        >
                          Watch Replay ▶
                        </Link>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Reaction bar */}
            {status === 'playing' && !isSpectator && (
              <div className="flex items-center justify-center gap-3 py-1">
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="text-xl hover:scale-125 transition-transform active:scale-90 select-none"
                    title="Send reaction"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Enemy card — desktop */}
          <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="hidden md:flex glass-panel p-6 rounded-3xl w-52 shrink-0 flex-col items-center border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
          >
            <AnimatePresence>
              {opponentReaction && (
                <motion.div
                  key={opponentReaction + Date.now()}
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1.4, y: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="text-3xl mb-2"
                >
                  {opponentReaction}
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-3 border-2 border-dashed transition-colors ${
              isBotMode ? 'bg-emerald-500/20 border-emerald-400' : opponentOnline ? 'bg-red-500/20 border-red-400' : 'bg-slate-800 border-slate-600'
            }`}>
              {isBotMode
                ? <Bot size={36} className="text-emerald-400" />
                : <UserCircle2 size={36} className={opponentOnline ? 'text-red-400' : 'text-slate-600'} />
              }
            </div>
            <h2 className={`text-lg font-black ${isBotMode ? 'text-emerald-400' : 'text-red-400'}`}>
              {isBotMode ? 'BOT' : 'ENEMY'}
            </h2>
            {mySymbol && gameType === 'tic-tac-toe' && (
              <span className="mt-1 text-rose-300 font-mono font-black">{mySymbol === 'X' ? 'O' : 'X'}</span>
            )}
            {!isBotMode && (
              opponentOnline
                ? <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 mt-3 blur-[2px]" />
                : <span className="flex h-2.5 w-2.5 rounded-full bg-slate-600 mt-3 animate-pulse" />
            )}
            {!isBotMode && !opponentOnline && status === 'playing' && (
              <div className="mt-2 flex items-center gap-1 text-xs text-orange-400">
                <WifiOff size={11} /> Reconnecting…
              </div>
            )}
            {seriesState === 'active' && (
              <div className="mt-3 text-center">
                <p className="text-xs text-slate-500">Series wins</p>
                <p className="text-3xl font-black text-rose-400">{seriesScores.opponent}</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Chat sidebar */}
      <AnimatePresence>
        {chatOpen && (
          <ChatSidebar
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            messages={chatMessages}
            onSend={sendChatMessage}
            opponentTyping={opponentTyping}
            mySocketId={mySocketId.current}
          />
        )}
      </AnimatePresence>

      {/* Chat input typing detection (global invisible input listener) */}
      {chatOpen && (
        <div
          className="hidden"
          onKeyDown={handleChatInputActivity}
        />
      )}
    </div>
  );
}
