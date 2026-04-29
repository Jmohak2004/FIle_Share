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
  const [formFocused, setFormFocused] = useState(false);
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
          className="font-black leading-[0.88] tracking-tight mb-8 uppercase"
          style={{ fontSize: 'clamp(4rem,14vw,9rem)', fontFamily: "'Syne', sans-serif", color: 'var(--text)' }}
        >
          FIGHT<br />
          <span style={{ color: 'var(--orange)' }}>FOR</span>{' '}
          IT.
        </h1>

        <p className="text-lg leading-relaxed max-w-lg mx-auto mb-12" style={{ color: 'var(--text-muted)' }}>
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
              style={{ backgroundColor: 'var(--orange)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--orange-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--orange)')}
            >
              <UploadCloud size={19} />
              Start a Battle Room
            </motion.button>
          </Link>

          <div className="flex items-center gap-3 w-full">
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>or join</span>
            <div className="h-px flex-1" style={{ backgroundColor: 'var(--border)' }} />
          </div>

          <form
            onSubmit={handleJoin}
            className="flex items-stretch w-full transition-colors"
            style={{ border: `1px solid ${formFocused ? 'var(--orange)' : 'var(--border)'}` }}
          >
            <input
              type="text"
              placeholder="ARENA CODE"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onFocus={() => setFormFocused(true)}
              onBlur={() => setFormFocused(false)}
              className="bg-transparent outline-none px-4 py-3 w-full font-mono tracking-widest text-sm"
              style={{ color: 'var(--text)' }}
            />
            <button
              type="submit"
              className="px-5 font-bold text-white shrink-0 transition-colors"
              style={{ backgroundColor: 'var(--orange)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--orange-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--orange)')}
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
        style={{ gap: '1px', backgroundColor: 'var(--border)' }}
      >
        {FEATURES.map((f) => (
          <FeatureCard key={f.label} f={f} />
        ))}
      </motion.div>
    </div>
  );
}

function FeatureCard({ f }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex flex-col gap-5 p-8 transition-colors cursor-default"
      style={{
        backgroundColor: hovered ? 'var(--surface-2)' : 'var(--surface)',
        borderTop: `2px solid ${f.accent}`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div style={{ color: f.accent }}>{f.icon}</div>
        <span className="font-mono text-xs font-bold" style={{ color: 'var(--border-strong)' }}>{f.label}</span>
      </div>
      <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{f.title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
    </div>
  );
}
