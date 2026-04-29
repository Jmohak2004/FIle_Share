import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, UploadCloud, Gamepad2, ArrowRight, Zap } from 'lucide-react';
import { useState } from 'react';

const FEATURES = [
  {
    icon: <UploadCloud size={22} />,
    label: '01',
    title: 'Secure Upload',
    desc: 'Encrypted, temporary — your file is locked behind the battle.',
    accent: '#FF4500',
  },
  {
    icon: <Gamepad2 size={22} />,
    label: '02',
    title: 'Challenge Mode',
    desc: 'Puzzles, trivia, skill checks — unlock only when earned.',
    accent: '#00D4FF',
  },
  {
    icon: <Swords size={22} />,
    label: '03',
    title: 'Live Battles',
    desc: 'Real-time 1v1 PvP. Loser gets nothing. Winner takes all.',
    accent: '#AAFF00',
  },
];

export default function Home() {
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) navigate(`/battle/${joinCode.trim()}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      <div className="corner-tl" />
      <div className="corner-br" />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="z-10 text-center max-w-4xl mx-auto"
      >
        <div className="tag mx-auto w-fit mb-8">
          <Zap size={11} />
          FileFight
        </div>

        <h1
          className="text-[clamp(4rem,14vw,9rem)] font-black leading-[0.88] tracking-tight mb-8 uppercase"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          FIGHT<br />
          <span style={{ color: '#FF4500' }}>FOR</span>{' '}
          <span className="text-[#EEEEEE]">IT.</span>
        </h1>

        <p className="text-lg leading-relaxed max-w-lg mx-auto mb-12" style={{ color: '#777' }}>
          Don't just send a file — make them earn it. Head-to-head mini-games,
          real-time battles, instant transfers.
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
          <Link to="/upload" className="w-full">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 font-bold text-white text-base transition-colors"
              style={{ backgroundColor: '#FF4500' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF6A00')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF4500')}
            >
              <UploadCloud size={19} />
              Start a Battle Room
            </motion.button>
          </Link>

          <div className="flex items-center gap-3 w-full">
            <div className="h-px flex-1" style={{ backgroundColor: '#222' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#555' }}>or join</span>
            <div className="h-px flex-1" style={{ backgroundColor: '#222' }} />
          </div>

          <form
            onSubmit={handleJoin}
            className="flex items-stretch w-full"
            style={{ border: '1px solid #222' }}
          >
            <input
              type="text"
              placeholder="ARENA CODE"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              className="bg-transparent outline-none text-white px-4 py-3 w-full placeholder:font-mono font-mono tracking-widest text-sm"
              style={{ color: '#EEE' }}
              onFocus={e => (e.currentTarget.parentElement.style.borderColor = '#FF4500')}
              onBlur={e => (e.currentTarget.parentElement.style.borderColor = '#222')}
            />
            <button
              type="submit"
              className="px-5 font-bold text-white shrink-0 transition-colors"
              style={{ backgroundColor: '#FF4500' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF6A00')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF4500')}
            >
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="w-full max-w-5xl mt-24 z-10 grid md:grid-cols-3"
        style={{ gap: '1px', backgroundColor: '#1a1a1a' }}
      >
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="flex flex-col gap-5 p-8 transition-colors group cursor-default"
            style={{
              backgroundColor: '#111',
              borderTop: `2px solid ${f.accent}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#161616')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111')}
          >
            <div className="flex items-center justify-between">
              <div style={{ color: f.accent }}>{f.icon}</div>
              <span className="font-mono text-xs font-bold" style={{ color: '#333' }}>{f.label}</span>
            </div>
            <h3 className="text-lg font-bold">{f.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#666' }}>{f.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
