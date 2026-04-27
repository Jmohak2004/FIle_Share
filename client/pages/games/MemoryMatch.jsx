import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const EMOJIS = ['🔥','💀','⚔️','🛡️','🧠','👾','🎯','🏆','💣','⚡','🌀','🎮'];

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = Math.abs(seed) || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function roomSeed(id) {
  return id.split('').reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0, 0);
}

function buildDeck(roomId) {
  const pool = EMOJIS.slice(0, 8);
  const pairs = seededShuffle([...pool, ...pool], roomSeed(roomId));
  return pairs.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export default function MemoryMatch({ onResult, socket, roomId }) {
  const [cards, setCards] = useState(() => buildDeck(roomId));
  const [selected, setSelected] = useState([]);
  const [myMatches, setMyMatches] = useState(0);
  const [opMatches, setOpMatches] = useState(0);
  const [locked, setLocked] = useState(false);
  const finished = useRef(false);

  const TOTAL_PAIRS = 8;

  useEffect(() => {
    socket.on('opponent-memory-progress', (count) => setOpMatches(count));
    return () => socket.off('opponent-memory-progress');
  }, [socket]);

  const flip = useCallback((id) => {
    if (locked || finished.current) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (selected.length === 1 && selected[0] === id) return;

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(newCards);
    const newSel = [...selected, id];
    setSelected(newSel);

    if (newSel.length === 2) {
      setLocked(true);
      const [a, b] = newSel.map(sid => newCards.find(c => c.id === sid));
      if (a.emoji === b.emoji) {
        setTimeout(() => {
          setCards(s => s.map(c => newSel.includes(c.id) ? { ...c, matched: true } : c));
          setSelected([]);
          setLocked(false);
          setMyMatches(m => {
            const next = m + 1;
            socket.emit('memory-progress', { roomId, matches: next });
            if (next === TOTAL_PAIRS && !finished.current) {
              finished.current = true;
              onResult('me');
            }
            return next;
          });
        }, 350);
      } else {
        setTimeout(() => {
          setCards(s => s.map(c => newSel.includes(c.id) ? { ...c, flipped: false } : c));
          setSelected([]);
          setLocked(false);
        }, 750);
      }
    }
  }, [cards, selected, locked, socket, roomId, onResult]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto">
      {/* Progress */}
      <div className="flex justify-between w-full text-sm font-mono px-1">
        <span className="text-blue-400">You: {myMatches}/{TOTAL_PAIRS} pairs</span>
        <span className="text-rose-400">Enemy: {opMatches}/{TOTAL_PAIRS}</span>
      </div>
      <div className="flex gap-3 w-full">
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-blue-500 rounded-full" animate={{ width: `${(myMatches/TOTAL_PAIRS)*100}%` }} />
        </div>
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-rose-500 rounded-full" animate={{ width: `${(opMatches/TOTAL_PAIRS)*100}%` }} />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => (
          <motion.button key={card.id} whileTap={{ scale: 0.88 }}
            onClick={() => flip(card.id)}
            className={`w-14 h-14 rounded-xl text-2xl flex items-center justify-center border transition-all duration-200
              ${card.matched ? 'bg-green-900/30 border-green-600/30 opacity-40 cursor-default' :
                card.flipped ? 'bg-purple-800/60 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]' :
                'bg-slate-800 border-white/10 hover:bg-slate-700 cursor-pointer'}
            `}
          >
            <motion.span
              initial={false}
              animate={{ rotateY: card.flipped || card.matched ? 0 : 180 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'inline-block' }}
            >
              {(card.flipped || card.matched) ? card.emoji : '❓'}
            </motion.span>
          </motion.button>
        ))}
      </div>
      <p className="text-xs text-slate-600 font-mono">Same board · First to match all {TOTAL_PAIRS} pairs wins</p>
    </div>
  );
}
