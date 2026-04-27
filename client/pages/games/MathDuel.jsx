import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Seeded RNG ── */
function seededRng(seed) {
  let s = (Math.abs(seed) || 1) & 0x7fffffff;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function roomSeed(id) { return id.split('').reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0, 0); }

/* ── Problem generator (same output for same roomId) ── */
function generateProblems(roomId, count = 7) {
  const rng = seededRng(roomSeed(roomId));
  return Array.from({ length: count }, (_, i) => {
    const difficulty = i < 2 ? 'easy' : i < 5 ? 'medium' : 'hard';
    const ops = difficulty === 'hard' ? ['+', '-', '*'] : ['+', '-', difficulty === 'medium' ? '*' : '+'];
    const op  = ops[Math.floor(rng() * ops.length)];
    let a, b, answer;

    if (op === '+') {
      a = Math.floor(rng() * (difficulty === 'hard' ? 900 : difficulty === 'medium' ? 90 : 50)) + (difficulty === 'hard' ? 100 : 10);
      b = Math.floor(rng() * (difficulty === 'hard' ? 900 : difficulty === 'medium' ? 90 : 50)) + (difficulty === 'hard' ? 100 : 10);
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(rng() * (difficulty === 'hard' ? 900 : 80)) + (difficulty === 'hard' ? 100 : 20);
      b = Math.floor(rng() * (a - 1)) + 1;
      answer = a - b;
    } else {
      a = Math.floor(rng() * (difficulty === 'hard' ? 15 : 9)) + 2;
      b = Math.floor(rng() * (difficulty === 'hard' ? 15 : 9)) + 2;
      answer = a * b;
    }

    // 3 plausible wrong answers
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const spread = Math.max(3, Math.round(answer * 0.15));
      const delta  = Math.floor(rng() * spread * 2) - spread;
      if (delta !== 0) wrongs.add(answer + delta);
    }
    const options = [...wrongs, answer].sort(() => rng() - 0.5);
    const label = { easy: '🟢', medium: '🟡', hard: '🔴' }[difficulty];
    return { a, b, op, answer, options, label };
  });
}

const ROUND_TIME = 8; // seconds per problem

export default function MathDuel({ onResult, socket, roomId }) {
  const problems     = useRef(generateProblems(roomId));
  const TOTAL        = problems.current.length;
  const myScoreRef   = useRef(0);
  const opScoreRef   = useRef(0);

  const [round, setRound]           = useState(0);
  const [myScore, setMyScore]       = useState(0);
  const [opScore, setOpScore]       = useState(0);
  const [selected, setSelected]     = useState(null); // chosen option
  const [opResult, setOpResult]     = useState(null); // 'correct' | 'wrong'
  const [timeLeft, setTimeLeft]     = useState(ROUND_TIME);
  const [roundOver, setRoundOver]   = useState(false);
  const [combo, setCombo]           = useState(0);

  const roundOverRef = useRef(false);
  const timerRef     = useRef(null);

  /* ── Advance to next round or end game ── */
  const advance = useCallback((myS, opS) => {
    if (round + 1 >= TOTAL) {
      setTimeout(() => {
        if (myS > opS)      onResult('me');
        else if (opS > myS) onResult('opponent');
        else                onResult('draw');
      }, 1400);
    } else {
      setTimeout(() => {
        setRound(r => r + 1);
        setSelected(null);
        setOpResult(null);
        setTimeLeft(ROUND_TIME);
        setRoundOver(false);
        roundOverRef.current = false;
      }, 1300);
    }
  }, [round, TOTAL, onResult]);

  /* ── Timer ── */
  useEffect(() => {
    roundOverRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!roundOverRef.current) {
            roundOverRef.current = true;
            setRoundOver(true);
            setCombo(0);
            advance(myScoreRef.current, opScoreRef.current);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [round]); // eslint-disable-line

  /* ── Receive opponent's answer ── */
  useEffect(() => {
    socket.on('opponent-math-answer', ({ correct }) => {
      setOpResult(correct ? 'correct' : 'wrong');
      if (correct) { opScoreRef.current++; setOpScore(opScoreRef.current); }
    });
    return () => socket.off('opponent-math-answer');
  }, [socket]);

  /* ── Player picks an answer ── */
  const handlePick = useCallback((opt) => {
    if (selected !== null || roundOverRef.current) return;
    clearInterval(timerRef.current);
    roundOverRef.current = true;
    setRoundOver(true);
    setSelected(opt);

    const correct = opt === problems.current[round].answer;
    if (correct) {
      myScoreRef.current++;
      setMyScore(myScoreRef.current);
      setCombo(c => c + 1);
    } else {
      setCombo(0);
    }
    socket.emit('math-answer', { roomId, round, correct });
    advance(myScoreRef.current, opScoreRef.current);
  }, [selected, round, socket, roomId, advance]);

  const problem = problems.current[round];
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft > 4 ? 'bg-green-500' : timeLeft > 2 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto">

      {/* Scoreboard */}
      <div className="flex justify-between w-full">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">YOU</p>
          <p className="text-4xl font-black text-blue-400">{myScore}</p>
          {combo >= 2 && <p className="text-[10px] text-yellow-400 font-bold">🔥 x{combo} combo</p>}
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Q {round+1}/{TOTAL}</p>
          <p className={`text-3xl font-black tabular-nums ${timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>{timeLeft}s</p>
          <span className="text-base">{problem.label}</span>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">ENEMY</p>
          <p className="text-4xl font-black text-rose-400">{opScore}</p>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div className={`h-full ${timerColor} rounded-full`} animate={{ width: `${timerPct}%` }} transition={{ ease: 'linear', duration: 0.9 }} />
      </div>

      {/* Problem */}
      <AnimatePresence mode="wait">
        <motion.div key={round}
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
          className="w-full py-6 px-4 bg-slate-800 rounded-2xl border border-white/10 text-center"
        >
          <p className="text-5xl font-black text-white font-mono tracking-wider">
            {problem.a} <span className="text-slate-400">{problem.op}</span> {problem.b} <span className="text-slate-500">=</span> <span className="text-blue-300">?</span>
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Answer options */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {problem.options.map((opt, i) => {
          let cls = 'bg-slate-800 border-white/10 text-white hover:bg-slate-700 hover:border-slate-500';
          if (selected !== null || roundOver) {
            if (opt === problem.answer)       cls = 'bg-green-800/60 border-green-400 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
            else if (opt === selected)        cls = 'bg-red-800/60 border-red-400 text-red-300';
            else                              cls = 'bg-slate-900 border-white/5 text-slate-600 opacity-40';
          }
          return (
            <motion.button key={i} whileTap={{ scale: 0.93 }}
              onClick={() => handlePick(opt)}
              className={`p-4 rounded-2xl border-2 text-2xl font-black font-mono transition-all duration-150 ${cls}`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>

      {/* Opponent status */}
      <AnimatePresence>
        {opResult && (
          <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className={`text-sm font-bold ${opResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}
          >
            Enemy answered {opResult}!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
