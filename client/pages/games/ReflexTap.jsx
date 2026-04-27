import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function ReflexTap({ onResult, socket, roomId }) {
  const [phase, setPhase]     = useState('wait'); // wait | early | go | done
  const [myTime, setMyTime]   = useState(null);
  const [opTime, setOpTime]   = useState(null);
  const [earlyFault, setEarlyFault] = useState(false);
  const startRef = useRef(null);
  const doneRef  = useRef(false);

  useEffect(() => {
    let alertTimeout, goTimeout;
    alertTimeout = setTimeout(() => {
      const delay = 1500 + Math.random() * 3500;
      goTimeout = setTimeout(() => {
        setPhase('go');
        startRef.current = Date.now();
      }, delay);
    }, 500);
    return () => { clearTimeout(alertTimeout); clearTimeout(goTimeout); };
  }, []);

  useEffect(() => {
    socket.on('reflex-opponent-time', (ms) => setOpTime(ms));
    return () => socket.off('reflex-opponent-time');
  }, [socket]);

  useEffect(() => {
    if (myTime !== null && opTime !== null && !doneRef.current) {
      doneRef.current = true;
      onResult(myTime <= opTime ? 'me' : 'opponent');
    }
  }, [myTime, opTime, onResult]);

  const handleTap = () => {
    if (doneRef.current) return;
    if (phase === 'wait') {
      setEarlyFault(true);
      setPhase('wait');
      return;
    }
    if (phase !== 'go' || myTime !== null) return;
    const ms = Date.now() - startRef.current;
    setMyTime(ms);
    setPhase('done');
    socket.emit('reflex-time', { roomId, ms });
  };

  const bgColor = {
    wait:  'bg-slate-800 border-slate-600',
    go:    'bg-green-500 border-green-300 shadow-[0_0_50px_rgba(34,197,94,0.7)]',
    done:  'bg-slate-700 border-slate-500',
    early: 'bg-red-700 border-red-400',
  }[earlyFault ? 'early' : phase];

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-slate-400 text-sm text-center max-w-xs">
        Wait for <strong className="text-white">GREEN</strong> — tap as fast as possible.
        <br />
        <span className="text-red-400 text-xs">Tapping early is a fault!</span>
      </p>

      {earlyFault && (
        <motion.p initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-red-400 font-black tracking-widest">
          TOO EARLY! Wait for green...
        </motion.p>
      )}

      <motion.button
        onClick={handleTap}
        animate={phase === 'go' ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ repeat: phase === 'go' ? Infinity : 0, duration: 0.35 }}
        className={`w-44 h-44 rounded-full flex flex-col items-center justify-center gap-2 border-4 transition-colors duration-300 select-none ${bgColor}`}
      >
        <Zap size={40} className={phase === 'go' ? 'text-black' : 'text-slate-500'} />
        <span className={`font-black text-sm tracking-widest ${phase === 'go' ? 'text-black' : 'text-slate-500'}`}>
          {phase === 'wait' && 'WAIT...'}
          {phase === 'go'   && 'TAP NOW!'}
          {phase === 'done' && `${myTime}ms`}
        </span>
      </motion.button>

      {myTime !== null && (
        <div className="text-center space-y-1">
          <p className="text-blue-400 font-mono text-sm">Your reaction: <strong>{myTime}ms</strong></p>
          {opTime !== null
            ? <p className="text-rose-400 font-mono text-sm">Enemy reaction: <strong>{opTime}ms</strong></p>
            : <p className="text-slate-500 text-sm animate-pulse">Waiting for opponent...</p>
          }
        </div>
      )}
    </div>
  );
}
