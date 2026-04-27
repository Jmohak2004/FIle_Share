import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCircle2, Skull, Share2, CheckCircle, WifiOff, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import axios from 'axios';
import { sounds } from '../src/sounds';

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

export default function Battle() {
  const { roomId } = useParams();

  const [status, setStatus]           = useState('waiting');
  const [gameType, setGameType]       = useState(null);
  const [battleId, setBattleId]       = useState(null);
  const [winner, setWinner]           = useState(null);
  const [replayCopied, setReplayCopied] = useState(false);
  const [downloadToken, setDownloadToken] = useState(null);

  // TTT state
  const [board, setBoard]     = useState(Array(9).fill(null));
  const [mySymbol, setMySymbol] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);

  // UI state
  const [isCreator, setIsCreator]         = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(false);
  const [pendingGameType, setPendingGameType] = useState('tic-tac-toe');
  const [opponentReaction, setOpponentReaction] = useState(null);
  const [rematchState, setRematchState]   = useState(null); // null | 'requesting' | 'pending'
  const [rematchGameType, setRematchGameType] = useState('tic-tac-toe');
  const [reconnectCountdown, setReconnectCountdown] = useState(null);

  const socketRef           = useRef(null);
  const isFirstRef          = useRef(false);
  const gameResultSent      = useRef(false);
  const opponentReactionTimer = useRef(null);
  const countdownInterval   = useRef(null);

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
    socketRef.current?.emit('submit-move', { roomId, move: { player: socketRef.current.id, cellIndex: index } });
    const w = tttWinner(nb);
    const isDraw = !w && nb.every(Boolean);
    if (w || isDraw) handleGameResult(w === mySymbol ? 'me' : isDraw ? 'draw' : 'opponent');
  }, [isMyTurn, board, winner, status, mySymbol, roomId, handleGameResult]);

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

  /* ── Socket lifecycle ── */
  useEffect(() => {
    const socket = io(API_URL, { reconnectionAttempts: 8, reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join-room', roomId));

    socket.on('you-are-creator', () => setIsCreator(true));

    socket.on('player-joined', () => {
      isFirstRef.current = true;
      setOpponentOnline(true);
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

    socket.on('rematch-requested', () => {
      setRematchState('pending');
      toast('Opponent wants a rematch!', { icon: '🔄' });
    });

    socket.on('rematch-start', ({ battleId: bid, gameType: gt }) => {
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
      toast(`Rematch! ${GAME_LABELS[gt] || gt}`, { icon: '⚔️' });
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
      clearTimeout(opponentReactionTimer.current);
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

  const replayUrl = battleId ? `${window.location.origin}/replay/${battleId}` : null;

  const resultLabel = () => {
    if (winner === 'draw')    return <span className="text-yellow-400">DRAW!</span>;
    if (winner === 'me')      return <span className="text-green-400">YOU WIN! 🏆</span>;
    return                           <span className="text-red-400">YOU LOSE 💀</span>;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-3 md:p-6 relative overflow-hidden bg-slate-950">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Header */}
      <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center z-10 mb-5 md:mb-8">
        <span className="text-pink-500 font-bold tracking-widest uppercase text-xs mb-1 block">Arena Zone</span>
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 neon-text">
          DEATHMATCH
        </h1>
        {gameType && (
          <p className="text-slate-400 mt-1 text-sm font-semibold">{GAME_LABELS[gameType] || gameType}</p>
        )}
        <p className="text-slate-600 font-mono text-xs mt-1"># {roomId}</p>
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
              <p className="text-red-400 font-black text-sm leading-none">ENEMY</p>
              {mySymbol && gameType === 'tic-tac-toe' && <p className="text-rose-300 font-mono text-xs">{mySymbol === 'X' ? 'O' : 'X'}</p>}
            </div>
            <UserCircle2 size={22} className="text-red-400 shrink-0" />
            <span className={`h-2 w-2 rounded-full shrink-0 ${opponentOnline ? 'bg-red-500' : 'bg-slate-600 animate-pulse'}`} />
          </div>
        </div>

        {/* Arena row */}
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 md:gap-6">

          {/* Player card — desktop only */}
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
            {isCreator && <span className="mt-2 text-xs text-purple-400 font-semibold tracking-wider">CREATOR</span>}
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
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 mt-2">Room creator is choosing the game…</p>
                  )}
                </div>
              )}

              {status === 'ready' && (
                <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center">
                  <p className="text-xl md:text-2xl text-green-400 font-black tracking-widest neon-text">CHALLENGER IDENTIFIED</p>
                  <p className="text-slate-500 mt-2 text-sm">Starting match…</p>
                </motion.div>
              )}

              {status === 'playing' && gameType && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  {gameType === 'tic-tac-toe' && (
                    <TicTacToe board={board} mySymbol={mySymbol} isMyTurn={isMyTurn} onCellClick={handleCellClick} />
                  )}
                  {gameType === 'rps' && (
                    <RPS key={battleId} onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
                  )}
                  {gameType === 'memory' && (
                    <MemoryMatch key={battleId} onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
                  )}
                  {gameType === 'reflex' && (
                    <ReflexTap key={battleId} onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
                  )}
                  {gameType === 'type-racer' && (
                    <TypeRacer key={battleId} onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
                  )}
                  {gameType === 'math-duel' && (
                    <MathDuel key={battleId} onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
                  )}
                  {gameType === 'quiz-battle' && (
                    <QuizBattle key={battleId} onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
                  )}
                </motion.div>
              )}

              {status === 'ended' && (
                <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="text-center w-full">
                  <p className="text-3xl md:text-5xl font-black neon-text uppercase drop-shadow-2xl mb-4">
                    {resultLabel()}
                  </p>

                  {gameType === 'tic-tac-toe' && (
                    <div className="grid grid-cols-3 gap-1.5 mx-auto w-32 h-32 bg-slate-800 p-1.5 rounded-xl mb-4">
                      {board.map((cell, i) => (
                        <div key={i} className={`bg-slate-900 rounded border border-white/5 flex items-center justify-center text-base font-black ${cell === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>{cell}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    {winner === 'me' && (
                      <button onClick={handleDownload}
                        className="w-full px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                      >
                        Download Payload 🎁
                      </button>
                    )}

                    {/* Rematch */}
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

            {/* Reaction bar (during playing) */}
            {status === 'playing' && (
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

          {/* Enemy card — desktop only */}
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

            <div className={`w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-3 border-2 ${opponentOnline ? 'border-red-400' : 'border-slate-600'} border-dashed transition-colors`}>
              <UserCircle2 size={36} className={opponentOnline ? 'text-red-400' : 'text-slate-600'} />
            </div>
            <h2 className="text-lg font-black text-red-400">ENEMY</h2>
            {mySymbol && gameType === 'tic-tac-toe' && (
              <span className="mt-1 text-rose-300 font-mono font-black">{mySymbol === 'X' ? 'O' : 'X'}</span>
            )}
            {opponentOnline
              ? <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 mt-3 blur-[2px]" />
              : <span className="flex h-2.5 w-2.5 rounded-full bg-slate-600 mt-3 animate-pulse" />
            }
            {!opponentOnline && status === 'playing' && (
              <div className="mt-2 flex items-center gap-1 text-xs text-orange-400">
                <WifiOff size={11} /> Reconnecting…
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
