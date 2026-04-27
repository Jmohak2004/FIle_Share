import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── 25-question pool ── */
const POOL = [
  { q: "What does CPU stand for?",                                         opts: ["Central Processing Unit","Core Processing Utility","Central Power Unit","Core Power Unit"],              a: 0 },
  { q: "How many bits are in a byte?",                                     opts: ["4","8","16","32"],                                                                                      a: 1 },
  { q: "What language is React primarily written in?",                     opts: ["Python","Ruby","JavaScript","TypeScript"],                                                              a: 2 },
  { q: "Which protocol powers the World Wide Web?",                        opts: ["FTP","SMTP","HTTP","SSH"],                                                                              a: 2 },
  { q: "What does RAM stand for?",                                         opts: ["Random Access Memory","Read Access Mode","Runtime Application Memory","Rapid Access Module"],          a: 0 },
  { q: "What year was JavaScript first created?",                          opts: ["1991","1995","1999","2003"],                                                                            a: 1 },
  { q: "Which company acquired GitHub in 2018?",                           opts: ["Google","Apple","Amazon","Microsoft"],                                                                  a: 3 },
  { q: "What does SQL stand for?",                                         opts: ["Simple Query Language","Structured Query Language","Server Query Logic","Standard Query List"],        a: 1 },
  { q: "What is the default port for HTTPS?",                              opts: ["80","8080","443","22"],                                                                                 a: 2 },
  { q: "What does API stand for?",                                         opts: ["Application Programming Interface","Automated Process Integration","Application Process Index","Advanced Programming Interface"], a: 0 },
  { q: "What is the binary representation of decimal 10?",                 opts: ["0110","1010","1100","0101"],                                                                            a: 1 },
  { q: "Which of these is NOT a programming language?",                    opts: ["Rust","Kotlin","HTML","Go"],                                                                            a: 2 },
  { q: "What does CSS stand for?",                                         opts: ["Computer Style Sheet","Creative Style System","Cascading Style Sheets","Custom Style Script"],         a: 2 },
  { q: "Which data structure operates LIFO?",                              opts: ["Queue","Stack","Heap","Linked List"],                                                                   a: 1 },
  { q: "What does JSON stand for?",                                        opts: ["Java Serialized Object Notation","JavaScript Object Notation","Java Syntax Object Node","Java Script Object Node"], a: 1 },
  { q: "Which sorting algorithm has best-case O(n) complexity?",           opts: ["Quick Sort","Merge Sort","Insertion Sort","Selection Sort"],                                            a: 2 },
  { q: "What is the time complexity of binary search?",                    opts: ["O(n)","O(log n)","O(n²)","O(1)"],                                                                      a: 1 },
  { q: "Which HTTP method is used to update a resource?",                  opts: ["GET","POST","PUT","DELETE"],                                                                            a: 2 },
  { q: "What symbol starts a single-line comment in JavaScript?",          opts: ["#","//","--","**"],                                                                                    a: 1 },
  { q: "What does DNS stand for?",                                         opts: ["Dynamic Network System","Domain Name System","Distributed Network Service","Data Node Server"],       a: 1 },
  { q: "Which company created the TypeScript language?",                   opts: ["Google","Facebook","Microsoft","JetBrains"],                                                           a: 2 },
  { q: "What is the result of typeof null in JavaScript?",                 opts: ["'null'","'undefined'","'object'","'boolean'"],                                                         a: 2 },
  { q: "Which port does SSH use by default?",                              opts: ["21","22","23","25"],                                                                                   a: 1 },
  { q: "What does CRUD stand for?",                                        opts: ["Create Read Update Delete","Copy Replace Undo Deploy","Create Replace Update Deploy","Copy Read Undo Delete"], a: 0 },
  { q: "In which language was the Linux kernel originally written?",       opts: ["Assembly","C","C++","Pascal"],                                                                         a: 1 },
];

function seededRng(seed) {
  let s = (Math.abs(seed) || 1) & 0x7fffffff;
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
}
function roomSeed(id) { return id.split('').reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0, 0); }

function pickQuestions(roomId, count = 6) {
  const rng = seededRng(roomSeed(roomId));
  return [...POOL].sort(() => rng() - 0.5).slice(0, count);
}

const ROUND_TIME = 12;

export default function QuizBattle({ onResult, socket, roomId }) {
  const questions  = useRef(pickQuestions(roomId));
  const TOTAL      = questions.current.length;
  const myScoreRef = useRef(0);
  const opScoreRef = useRef(0);

  const [round, setRound]           = useState(0);
  const [myScore, setMyScore]       = useState(0);
  const [opScore, setOpScore]       = useState(0);
  const [selected, setSelected]     = useState(null);
  const [opAnswered, setOpAnswered] = useState(false);
  const [opCorrect, setOpCorrect]   = useState(null);
  const [timeLeft, setTimeLeft]     = useState(ROUND_TIME);
  const [roundOver, setRoundOver]   = useState(false);
  const [streak, setStreak]         = useState(0);

  const roundOverRef = useRef(false);
  const timerRef     = useRef(null);

  const advance = useCallback((myS, opS) => {
    if (round + 1 >= TOTAL) {
      setTimeout(() => {
        if (myS > opS)      onResult('me');
        else if (opS > myS) onResult('opponent');
        else                onResult('draw');
      }, 1600);
    } else {
      setTimeout(() => {
        setRound(r => r + 1);
        setSelected(null);
        setOpAnswered(false);
        setOpCorrect(null);
        setTimeLeft(ROUND_TIME);
        setRoundOver(false);
        roundOverRef.current = false;
      }, 1500);
    }
  }, [round, TOTAL, onResult]);

  useEffect(() => {
    roundOverRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!roundOverRef.current) {
            roundOverRef.current = true;
            setRoundOver(true);
            setStreak(0);
            advance(myScoreRef.current, opScoreRef.current);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [round]); // eslint-disable-line

  useEffect(() => {
    socket.on('opponent-quiz-answer', ({ correct }) => {
      setOpAnswered(true);
      setOpCorrect(correct);
      if (correct) { opScoreRef.current++; setOpScore(opScoreRef.current); }
    });
    return () => socket.off('opponent-quiz-answer');
  }, [socket]);

  const handleAnswer = useCallback((idx) => {
    if (selected !== null || roundOverRef.current) return;
    clearInterval(timerRef.current);
    roundOverRef.current = true;
    setRoundOver(true);
    setSelected(idx);

    const correct = idx === questions.current[round].a;
    if (correct) {
      myScoreRef.current++;
      setMyScore(myScoreRef.current);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
    socket.emit('quiz-answer', { roomId, round, correct });
    advance(myScoreRef.current, opScoreRef.current);
  }, [selected, round, socket, roomId, advance]);

  const q = questions.current[round];
  const timerPct   = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft > 7 ? 'bg-green-500' : timeLeft > 4 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">

      {/* Scoreboard */}
      <div className="flex justify-between items-start w-full">
        <div className="text-center min-w-[60px]">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">YOU</p>
          <p className="text-4xl font-black text-blue-400">{myScore}</p>
          {streak >= 2 && (
            <p className="text-[10px] text-yellow-400 font-bold animate-bounce">🔥 x{streak}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Q {round+1} / {TOTAL}</p>
          <p className={`text-3xl font-black tabular-nums ${timeLeft <= 4 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>{timeLeft}s</p>
        </div>
        <div className="text-center min-w-[60px]">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">ENEMY</p>
          <p className="text-4xl font-black text-rose-400">{opScore}</p>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div className={`h-full ${timerColor} rounded-full origin-left`}
          animate={{ width: `${timerPct}%` }}
          transition={{ ease: 'linear', duration: 0.95 }}
        />
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={round}
          initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
          className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-white/10 shadow-xl text-center min-h-[80px] flex items-center justify-center"
        >
          <p className="text-white font-bold text-base leading-snug">{q.q}</p>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="flex flex-col gap-2 w-full">
        {q.opts.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          let cls = 'bg-slate-800 border-white/10 text-slate-200 hover:bg-slate-700 hover:border-slate-500 cursor-pointer';
          if (selected !== null || roundOver) {
            if (i === q.a)                       cls = 'bg-green-800/60 border-green-400 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.25)]';
            else if (i === selected && i !== q.a) cls = 'bg-red-800/50 border-red-400 text-red-300';
            else                                  cls = 'bg-slate-900 border-white/5 text-slate-600 opacity-40';
          }
          return (
            <motion.button key={i} whileTap={{ scale: 0.98 }}
              onClick={() => handleAnswer(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all duration-150 flex items-center gap-3 ${cls}`}
            >
              <span className="shrink-0 w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center text-xs font-mono font-bold">{letter}</span>
              <span>{opt}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Opponent status */}
      <AnimatePresence>
        {opAnswered && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className={`text-sm font-bold px-4 py-2 rounded-lg ${opCorrect ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}
          >
            Enemy answered {opCorrect ? 'correctly ✓' : 'incorrectly ✗'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
