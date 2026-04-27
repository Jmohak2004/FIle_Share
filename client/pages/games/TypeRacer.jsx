import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const SENTENCES = [
  "Upload your payload and battle enemies to unlock the encrypted file inside.",
  "In the arena of code only the fastest fingers survive the onslaught.",
  "Every keystroke brings you closer to victory in this digital duel tonight.",
  "Hack the matrix before your opponent completes the neural access sequence.",
  "Speed and accuracy are the weapons of choice for the elite digital warrior.",
  "The battle for the payload begins with a single keystroke at dawn of war.",
  "Type faster than your opponent and claim the encrypted archive as your own.",
  "Master the keyboard and the arena is yours for the taking this very night.",
  "The quick brown fox jumped over the lazy dog in the neon lit cyber arena.",
  "Pixels and packets collide as two warriors fight across the digital divide.",
  "Forge your skills in the fire of competition and emerge victorious today.",
  "The secret file awaits the champion who conquers this ancient typing trial.",
];

function seededIndex(roomId, length) {
  const seed = roomId.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  return Math.abs(seed) % length;
}

export default function TypeRacer({ onResult, socket, roomId }) {
  const sentence   = SENTENCES[seededIndex(roomId, SENTENCES.length)];
  const [typed, setTyped]           = useState('');
  const [opProgress, setOpProgress] = useState(0);
  const [countdown, setCountdown]   = useState(3);
  const [started, setStarted]       = useState(false);
  const [wpm, setWpm]               = useState(0);
  const startTimeRef = useRef(null);
  const finishedRef  = useRef(false);
  const inputRef     = useRef(null);

  // Countdown then start
  useEffect(() => {
    if (countdown <= 0) { setStarted(true); setTimeout(() => inputRef.current?.focus(), 50); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    socket.on('opponent-type-progress', (p) => {
      setOpProgress(p);
      if (p >= 1 && !finishedRef.current) {
        finishedRef.current = true;
        onResult('opponent');
      }
    });
    return () => socket.off('opponent-type-progress');
  }, [socket, onResult]);

  const handleChange = useCallback((e) => {
    if (!started || finishedRef.current) return;
    const val = e.target.value;

    // Only allow characters that match the sentence
    if (val.length > sentence.length) return;
    if (val.length > 0 && !sentence.startsWith(val)) {
      // Allow deletion, block incorrect chars
      if (val.length >= typed.length) return;
    }

    if (!startTimeRef.current && val.length > 0) startTimeRef.current = Date.now();
    setTyped(val);

    if (startTimeRef.current && val.length > 0) {
      const mins = (Date.now() - startTimeRef.current) / 60000;
      setWpm(Math.round((val.length / 5) / Math.max(mins, 0.001)));
    }

    const progress = val.length / sentence.length;
    socket.emit('type-progress', { roomId, progress: Math.min(progress, 1) });

    if (val === sentence && !finishedRef.current) {
      finishedRef.current = true;
      socket.emit('type-progress', { roomId, progress: 1 });
      onResult('me');
    }
  }, [started, sentence, typed, socket, roomId, onResult]);

  const myProgress = typed.length / sentence.length;

  // Render the sentence with per-char coloring
  const renderSentence = () =>
    sentence.split('').map((char, i) => {
      let cls = 'text-slate-600';
      if (i < typed.length)    cls = typed[i] === char ? 'text-green-400' : 'text-red-400 bg-red-900/30 rounded';
      else if (i === typed.length) cls = 'text-white border-b-2 border-blue-400';
      return <span key={i} className={`transition-colors ${cls}`}>{char}</span>;
    });

  if (!started) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-slate-400 text-sm">Starting in...</p>
        <motion.div
          key={countdown}
          initial={{ scale: 1.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-8xl font-black text-yellow-400 neon-text"
        >
          {countdown || 'GO!'}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      {/* Stats row */}
      <div className="flex justify-between w-full text-xs font-mono px-1">
        <span className="text-blue-400 font-bold">YOU  {Math.round(myProgress * 100)}%</span>
        <span className="text-slate-400">{wpm} <span className="text-slate-600">WPM</span></span>
        <span className="text-rose-400 font-bold">ENEMY  {Math.round(opProgress * 100)}%</span>
      </div>

      {/* Progress bars */}
      <div className="w-full space-y-1.5">
        {[
          { progress: myProgress,  color: 'bg-blue-500',  label: 'YOU' },
          { progress: opProgress,  color: 'bg-rose-500',  label: 'ENEMY' },
        ].map(({ progress, color, label }) => (
          <div key={label} className="h-3 bg-slate-800 rounded-full overflow-hidden relative">
            <motion.div className={`h-full ${color} rounded-full`} animate={{ width: `${progress * 100}%` }} transition={{ ease: 'linear', duration: 0.1 }} />
            {progress >= 1 && (
              <span className="absolute right-2 top-0 text-[9px] font-bold text-white leading-3">DONE</span>
            )}
          </div>
        ))}
      </div>

      {/* Sentence display */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-white/10 font-mono text-base leading-loose text-left w-full min-h-[80px] tracking-wide">
        {renderSentence()}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        disabled={finishedRef.current}
        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-blue-500 transition-colors disabled:opacity-40 caret-blue-400"
        placeholder="Start typing..."
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
      <p className="text-xs text-slate-600 font-mono">First to finish wins · {sentence.length} characters</p>
    </div>
  );
}
