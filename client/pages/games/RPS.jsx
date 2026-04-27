import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OPTIONS = [
  { label: '✊', value: 'rock',     beats: 'scissors', name: 'Rock' },
  { label: '✋', value: 'paper',    beats: 'rock',     name: 'Paper' },
  { label: '✌️', value: 'scissors', beats: 'paper',    name: 'Scissors' },
];

function result(mine, theirs) {
  if (mine === theirs) return 'draw';
  return OPTIONS.find(o => o.value === mine)?.beats === theirs ? 'win' : 'lose';
}

const SCORE_TO_WIN = 3;

export default function RPS({ onResult, socket, roomId }) {
  const [myScore, setMyScore]     = useState(0);
  const [opScore, setOpScore]     = useState(0);
  const [myPick, setMyPick]       = useState(null);
  const [opPick, setOpPick]       = useState(null);
  const [round, setRound]         = useState(1);
  const [reveal, setReveal]       = useState(false);

  useEffect(() => {
    socket.on('rps-opponent-pick', (pick) => setOpPick(pick));
    return () => socket.off('rps-opponent-pick');
  }, [socket]);

  // When both picks are in, resolve
  useEffect(() => {
    if (!myPick || !opPick) return;
    setReveal(true);
    const r = result(myPick, opPick);

    let newMy = myScore, newOp = opScore;
    if (r === 'win')  newMy++;
    if (r === 'lose') newOp++;
    setMyScore(newMy);
    setOpScore(newOp);

    if (newMy >= SCORE_TO_WIN || newOp >= SCORE_TO_WIN) {
      setTimeout(() => onResult(newMy >= SCORE_TO_WIN ? 'me' : 'opponent'), 1400);
    } else {
      setTimeout(() => {
        setMyPick(null); setOpPick(null); setReveal(false); setRound(r => r + 1);
      }, 1200);
    }
  }, [myPick, opPick]); // eslint-disable-line

  const pick = useCallback((value) => {
    if (myPick) return;
    setMyPick(value);
    socket.emit('rps-pick', { roomId, pick: value });
  }, [myPick, socket, roomId]);

  const roundResult = myPick && opPick ? result(myPick, opPick) : null;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-xs mx-auto">
      {/* Score */}
      <div className="flex justify-between w-full px-2">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">YOU</p>
          <p className="text-4xl font-black text-blue-400">{myScore}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">First to {SCORE_TO_WIN}</p>
          <p className="text-xl font-bold text-slate-400">R{round}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">ENEMY</p>
          <p className="text-4xl font-black text-rose-400">{opScore}</p>
        </div>
      </div>

      {/* Reveal */}
      <AnimatePresence>
        {reveal && myPick && opPick && (
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-4 text-5xl"
          >
            <span title={OPTIONS.find(o => o.value===myPick)?.name}>{OPTIONS.find(o => o.value===myPick)?.label}</span>
            <span className={`text-xl font-black px-3 py-1 rounded-lg ${roundResult==='win' ? 'text-green-400 bg-green-500/10' : roundResult==='lose' ? 'text-red-400 bg-red-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
              {roundResult === 'win' ? 'WIN' : roundResult === 'lose' ? 'LOSE' : 'TIE'}
            </span>
            <span title={OPTIONS.find(o => o.value===opPick)?.name}>{OPTIONS.find(o => o.value===opPick)?.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pick buttons */}
      <div className="flex gap-3">
        {OPTIONS.map(opt => (
          <motion.button key={opt.value} whileTap={{ scale: 0.82 }}
            onClick={() => pick(opt.value)}
            disabled={!!myPick}
            className={`text-4xl p-5 rounded-2xl border transition-all
              ${myPick === opt.value ? 'bg-purple-700/60 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-110' : 'bg-slate-800 border-white/10 hover:bg-slate-700 hover:scale-105'}
              ${myPick && myPick !== opt.value ? 'opacity-30' : ''}
              disabled:cursor-default`}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>

      {myPick && !opPick && (
        <p className="text-slate-500 text-sm font-mono animate-pulse">Waiting for opponent...</p>
      )}
    </div>
  );
}
