import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Home, Trophy, Clock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(board) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function formatRelTime(ms) {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function Replay() {
  const { battleId } = useParams();
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/battles/replay/${battleId}`)
      .then(res => setBattle(res.data))
      .catch(() => setError('Replay not found or has been removed.'))
      .finally(() => setLoading(false));
  }, [battleId]);

  useEffect(() => {
    if (playing && battle) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= battle.moves.length) {
            setPlaying(false);
            clearInterval(intervalRef.current);
            return s;
          }
          return s + 1;
        });
      }, 700);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, battle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400 font-mono animate-pulse">
        Loading replay...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-slate-400 text-lg">{error}</p>
        <Link to="/" className="text-blue-400 hover:underline">Go Home</Link>
      </div>
    );
  }

  const moves = battle.moves.filter(m => m.cellIndex != null);
  const startTs = moves[0]?.timestamp || null;

  // Board at current step
  const board = Array(9).fill(null);
  for (let i = 0; i < Math.min(step, moves.length); i++) {
    const { player, cellIndex } = moves[i];
    board[cellIndex] = player === battle.players[0] ? 'X' : 'O';
  }
  const winner = checkWinner(board);

  // Current move info
  const currentMove = step > 0 && step <= moves.length ? moves[step - 1] : null;
  const currentSymbol = currentMove
    ? (currentMove.player === battle.players[0] ? 'X' : 'O')
    : null;
  const relTime = currentMove && startTs
    ? currentMove.timestamp - startTs
    : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-lg glass-panel rounded-3xl p-8 text-center"
      >
        <span className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-1 block">Battle Replay</span>
        <h1 className="text-3xl font-black text-white mb-1">
          {battle.gameType === 'tic-tac-toe' ? 'Tic-Tac-Toe' : battle.gameType}
        </h1>
        <p className="text-slate-500 font-mono text-xs mb-6">#{battle.battleId}</p>

        {/* Winner banner */}
        {battle.winner && (
          <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 font-bold text-sm">
            <Trophy size={16} /> Winner: <span className="font-mono text-xs ml-1">{battle.winner.slice(0, 12)}…</span>
          </div>
        )}

        {/* Board */}
        <div className="grid grid-cols-3 gap-2 mx-auto w-52 h-52 bg-slate-800 p-2 rounded-2xl mb-4">
          {board.map((cell, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{ scale: cell ? [0.5, 1.1, 1] : 1 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 rounded-lg border border-white/5 flex items-center justify-center text-2xl font-black"
            >
              <span className={cell === 'X' ? 'text-blue-400' : 'text-rose-400'}>
                {cell}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Current move info */}
        <AnimatePresence mode="wait">
          {currentMove ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-3 mb-4 text-xs font-mono"
            >
              <span className={`font-black text-sm ${currentSymbol === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>
                {currentSymbol}
              </span>
              <span className="text-slate-500">→ cell {currentMove.cellIndex}</span>
              {relTime != null && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Clock size={10} /> +{formatRelTime(relTime)}
                </span>
              )}
            </motion.div>
          ) : (
            <div className="h-6 mb-4" />
          )}
        </AnimatePresence>

        {/* Progress */}
        <p className="text-slate-500 text-sm font-mono mb-4">
          Move {Math.min(step, moves.length)} / {moves.length}
          {winner && step >= moves.length && (
            <span className={`ml-2 font-bold ${winner === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>
              · {winner} wins
            </span>
          )}
        </p>

        {/* Move timeline */}
        {moves.length > 0 && (
          <div className="flex gap-1 justify-center mb-4 flex-wrap">
            {moves.map((m, i) => {
              const sym = m.player === battle.players[0] ? 'X' : 'O';
              const active = i < step;
              const current = i === step - 1;
              return (
                <button
                  key={i}
                  onClick={() => { setPlaying(false); setStep(i + 1); }}
                  title={`Move ${i + 1}: ${sym} at cell ${m.cellIndex}${m.timestamp && startTs ? ` (+${formatRelTime(m.timestamp - startTs)})` : ''}`}
                  className={`w-6 h-6 rounded text-[10px] font-black transition-all border ${
                    current
                      ? sym === 'X'
                        ? 'bg-blue-500 border-blue-400 text-white scale-110'
                        : 'bg-rose-500 border-rose-400 text-white scale-110'
                      : active
                      ? sym === 'X'
                        ? 'bg-blue-900/60 border-blue-700 text-blue-400'
                        : 'bg-rose-900/60 border-rose-700 text-rose-400'
                      : 'bg-slate-800 border-white/5 text-slate-600'
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { setPlaying(false); setStep(0); }}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors text-lg font-bold"
          >
            ‹
          </button>
          <button
            onClick={() => { if (step >= moves.length) setStep(0); setPlaying(v => !v); }}
            className="p-4 bg-purple-600 hover:bg-purple-500 rounded-xl text-white transition-colors"
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={() => setStep(s => Math.min(moves.length, s + 1))}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors text-lg font-bold"
          >
            ›
          </button>
          <button
            onClick={() => { setPlaying(false); setStep(moves.length); }}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <Link to="/" className="mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors">
          <Home size={14} /> Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
