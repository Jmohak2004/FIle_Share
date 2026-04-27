import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import { UserCircle2, Skull, Share2, CheckCircle } from 'lucide-react';
import axios from 'axios';

import TicTacToe, { tttWinner } from './games/TicTacToe';
import RPS          from './games/RPS';
import MemoryMatch  from './games/MemoryMatch';
import ReflexTap    from './games/ReflexTap';
import TypeRacer    from './games/TypeRacer';
import MathDuel     from './games/MathDuel';
import QuizBattle   from './games/QuizBattle';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const GAME_LABELS = {
  'tic-tac-toe': '⚔️  Tic-Tac-Toe',
  'rps':         '✊  Rock Paper Scissors',
  'memory':      '🧠  Memory Match',
  'reflex':      '⚡  Reflex Tap',
  'type-racer':  '⌨️  Type Racer',
  'math-duel':   '🔢  Math Duel',
  'quiz-battle': '🎯  Quiz Battle',
};

export default function Battle() {
  const { roomId } = useParams();
  const [status, setStatus]         = useState('waiting');
  const [gameType, setGameType]     = useState(null);
  const [battleId, setBattleId]     = useState(null);
  const [winner, setWinner]         = useState(null);   // 'me' | 'opponent' | 'draw'
  const [replayCopied, setReplayCopied] = useState(false);
  const [downloadToken, setDownloadToken] = useState(null);

  // Tic-tac-toe state (managed here so server events can touch it)
  const [board, setBoard]           = useState(Array(9).fill(null));
  const [mySymbol, setMySymbol]     = useState(null);
  const [isMyTurn, setIsMyTurn]     = useState(false);

  const socketRef      = useRef(null);
  const isFirstRef     = useRef(false);
  const gameResultSent = useRef(false);

  /* ── Handle any game's result ── */
  const handleGameResult = useCallback((result) => {
    if (gameResultSent.current) return;
    gameResultSent.current = true;
    setWinner(result);
    setStatus('ended');
    socketRef.current?.emit('game-over', { roomId, winner: result });
  }, [roomId]);

  /* ── TTT cell click ── */
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

  /* ── Socket lifecycle ── */
  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;
    let playerIndex = 0;

    socket.on('connect', () => {
      socket.emit('join-room', roomId);
    });

    socket.on('player-joined', () => {
      isFirstRef.current = true;
      playerIndex = 1;
      setStatus('ready');
    });

    socket.on('game-start', ({ battleId: bid, gameType: gt }) => {
      setBattleId(bid);
      setGameType(gt || 'tic-tac-toe');
      setStatus('playing');
      const symbol = isFirstRef.current ? 'X' : 'O';
      setMySymbol(symbol);
      setIsMyTurn(symbol === 'X');
    });

    // TTT opponent move
    socket.on('opponent-move', ({ cellIndex }) => {
      if (cellIndex == null) return;
      setBoard(prev => {
        const nb = [...prev];
        // opponent's symbol is whichever isn't mine; safe to derive here
        const opSym = mySymbol === 'X' ? 'O' : 'X';
        nb[cellIndex] = opSym || 'O';
        const w = tttWinner(nb);
        const isDraw = !w && nb.every(Boolean);
        if (w) handleGameResult(w === mySymbol ? 'me' : 'opponent');
        else if (isDraw) handleGameResult('draw');
        return nb;
      });
      setIsMyTurn(true);
    });

    socket.on('game-end', (result) => {
      setWinner(result);
      setStatus('ended');
    });

    socket.on('download-token', (token) => {
      setDownloadToken(token);
    });

    return () => {
      socket.off('player-joined');
      socket.off('game-start');
      socket.off('opponent-move');
      socket.off('game-end');
      socket.off('download-token');
      socket.disconnect();
    };
  }, [roomId]); // eslint-disable-line

  // Keep opponent-move handler in sync with mySymbol
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
    } catch { alert('Download failed — make sure you won the battle.'); }
  };

  const replayUrl = battleId ? `${window.location.origin}/replay/${battleId}` : null;

  const resultLabel = () => {
    if (winner === 'draw')     return <span className="text-yellow-400">DRAW!</span>;
    if (winner === 'me')       return <span className="text-green-400">YOU WIN! 🏆</span>;
    return                            <span className="text-red-400">YOU LOSE 💀</span>;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-6 relative overflow-hidden bg-slate-950">
      {/* Grid bg */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Header */}
      <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center z-10 mb-8">
        <span className="text-pink-500 font-bold tracking-widest uppercase text-xs mb-1 block">Arena Zone</span>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 neon-text">
          DEATHMATCH
        </h1>
        {gameType && (
          <p className="text-slate-400 mt-1 text-sm font-semibold">{GAME_LABELS[gameType] || gameType}</p>
        )}
        <p className="text-slate-600 font-mono text-xs mt-1"># {roomId}</p>
      </motion.div>

      {/* Arena row */}
      <div className="w-full max-w-5xl z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">

        {/* Player card */}
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="glass-panel p-6 rounded-3xl w-48 md:w-52 shrink-0 flex flex-col items-center border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.08)]"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-3 border-2 border-blue-400 border-dashed">
            <UserCircle2 size={36} className="text-blue-400" />
          </div>
          <h2 className="text-lg font-black text-blue-400">YOU</h2>
          {mySymbol && gameType === 'tic-tac-toe' && (
            <span className="mt-1 text-blue-300 font-mono font-black">{mySymbol}</span>
          )}
          <span className="animate-pulse flex h-2.5 w-2.5 rounded-full bg-green-500 mt-3" />
        </motion.div>

        {/* Center panel */}
        <div className="flex flex-col items-center justify-center p-6 md:p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 flex-1 min-h-[340px] w-full">

          {status === 'waiting' && (
            <div className="text-center">
              <Skull className="mx-auto mb-4 text-slate-700 animate-pulse" size={52} />
              <p className="text-lg text-slate-400 font-mono tracking-widest mb-5">AWAITING OPPONENT</p>
              <div className="flex gap-2 justify-center">
                {[0,1,2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${i*130}ms` }} />)}
              </div>
            </div>
          )}

          {status === 'ready' && (
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center">
              <p className="text-2xl text-green-400 font-black tracking-widest neon-text">CHALLENGER IDENTIFIED</p>
              <p className="text-slate-500 mt-2 text-sm">Starting match...</p>
            </motion.div>
          )}

          {status === 'playing' && gameType && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
              {gameType === 'tic-tac-toe' && (
                <TicTacToe board={board} mySymbol={mySymbol} isMyTurn={isMyTurn} onCellClick={handleCellClick} />
              )}
              {gameType === 'rps' && (
                <RPS onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
              )}
              {gameType === 'memory' && (
                <MemoryMatch onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
              )}
              {gameType === 'reflex' && (
                <ReflexTap onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
              )}
              {gameType === 'type-racer' && (
                <TypeRacer onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
              )}
              {gameType === 'math-duel' && (
                <MathDuel onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
              )}
              {gameType === 'quiz-battle' && (
                <QuizBattle onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
              )}
            </motion.div>
          )}

          {status === 'ended' && (
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="text-center w-full">
              <p className="text-4xl md:text-5xl font-black neon-text uppercase drop-shadow-2xl mb-5">
                {resultLabel()}
              </p>

              {/* Final TTT board snapshot */}
              {gameType === 'tic-tac-toe' && (
                <div className="grid grid-cols-3 gap-1.5 mx-auto w-36 h-36 bg-slate-800 p-1.5 rounded-xl mb-4">
                  {board.map((cell, i) => (
                    <div key={i} className={`bg-slate-900 rounded border border-white/5 flex items-center justify-center text-lg font-black ${cell === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>{cell}</div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                {winner === 'me' && (
                  <button onClick={handleDownload}
                    className="w-full px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                  >
                    Download Payload 🎁
                  </button>
                )}

                {replayUrl && (
                  <>
                    <button
                      onClick={() => { navigator.clipboard.writeText(replayUrl); setReplayCopied(true); setTimeout(() => setReplayCopied(false), 2000); }}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-white/10"
                    >
                      {replayCopied ? <CheckCircle size={15} className="text-green-400" /> : <Share2 size={15} />}
                      {replayCopied ? 'Replay link copied!' : 'Share Replay'}
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

        {/* Enemy card */}
        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="glass-panel p-6 rounded-3xl w-48 md:w-52 shrink-0 flex flex-col items-center border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-3 border-2 border-red-400 border-dashed">
            <UserCircle2 size={36} className="text-red-400" />
          </div>
          <h2 className="text-lg font-black text-red-400">ENEMY</h2>
          {mySymbol && gameType === 'tic-tac-toe' && (
            <span className="mt-1 text-rose-300 font-mono font-black">{mySymbol === 'X' ? 'O' : 'X'}</span>
          )}
          {status === 'waiting'
            ? <span className="flex h-2.5 w-2.5 rounded-full bg-slate-600 mt-3 animate-pulse" />
            : <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 mt-3 blur-[2px]" />
          }
        </motion.div>

      </div>
    </div>
  );
}
