import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion } from 'framer-motion';
import { UserCircle2, Skull } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function Battle() {
  const { roomId } = useParams();
  const [status, setStatus] = useState('waiting');
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.emit('join-room', roomId);
    socket.on('player-joined', () => setStatus('ready'));
    socket.on('game-start', () => setStatus('playing'));
    socket.on('game-end', (winner) => setStatus(`Winner: ${winner}`));

    return () => {
      socket.off('player-joined');
      socket.off('game-start');
      socket.off('game-end');
      socket.disconnect();
    };
  }, [roomId]);

  const handleDownload = async () => {
    try {
      await axios.post(`${API_URL}/api/files/unlock/${roomId}`);
      window.location.href = `${API_URL}/api/files/download/${roomId}`;
    } catch (err) {
      console.error(err);
      alert('Download failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-slate-950">

      {/* Background Neon Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center z-10 mb-12"
      >
        <span className="text-pink-500 font-bold tracking-widest uppercase text-sm mb-2 block">Arena Zone</span>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 neon-text">
          DEATHMATCH
        </h1>
        <p className="text-slate-400 mt-2 font-mono text-sm opacity-50"># {roomId}</p>
      </motion.div>

      <div className="w-full max-w-4xl z-10 flex flex-col md:flex-row items-center justify-between gap-8">

        {/* Player 1 Card */}
        <motion.div
          className="glass-panel p-8 rounded-3xl w-64 flex flex-col items-center border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
          initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        >
          <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 border-2 border-blue-400 border-dashed">
            <UserCircle2 size={48} className="text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-blue-400">YOU</h2>
          <span className="animate-pulse flex h-3 w-3 rounded-full bg-green-500 mt-4"></span>
        </motion.div>

        {/* Status Center */}
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 mx-4 flex-1">
          {status === 'waiting' && (
            <div className="text-center">
              <Skull className="mx-auto mb-4 text-slate-600 animate-pulse" size={48} />
              <p className="text-xl text-slate-400 font-mono tracking-widest mb-4">AWAITING OPPONENT</p>
              <div className="flex gap-2 justify-center">
                 <span className="h-2 w-2 rounded-full bg-slate-600 animate-bounce"></span>
                 <span className="h-2 w-2 rounded-full bg-slate-600 animate-bounce delay-100"></span>
                 <span className="h-2 w-2 rounded-full bg-slate-600 animate-bounce delay-200"></span>
              </div>
            </div>
          )}

          {status === 'ready' && (
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center">
              <p className="text-2xl text-green-400 font-black tracking-widest neon-text">CHALLENGER IDENTIFIED</p>
              <p className="text-slate-400 mt-2">Connecting feeds...</p>
            </motion.div>
          )}

          {status === 'playing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full">
              <h2 className="text-2xl text-yellow-400 font-black mb-6 tracking-widest">FIGHT! (TIC TAC TOE)</h2>
              <div className="grid grid-cols-3 gap-2 mx-auto w-48 h-48 bg-slate-800 p-2 rounded-xl">
                {Array(9).fill(null).map((_, i) => (
                  <button key={i} className="bg-slate-900 rounded border border-white/5 hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-rose-500 active:scale-95"></button>
                ))}
              </div>
              <p className="mt-8 text-slate-400 font-mono text-sm leading-relaxed max-w-xs mx-auto">
                First one to conquer the grid extracts the payload.
              </p>
            </motion.div>
          )}

          {status.startsWith('Winner') && (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
              <p className="text-4xl text-green-500 font-black neon-text uppercase drop-shadow-2xl">{status}</p>
              <button
                onClick={handleDownload}
                className="mt-6 px-6 py-2 bg-green-500 text-black font-bold rounded-full cursor-pointer hover:bg-green-400"
              >
                Download Payload
              </button>
            </motion.div>
          )}
        </div>

        {/* Player 2 Card */}
        <motion.div
          className="glass-panel p-8 rounded-3xl w-64 flex flex-col items-center border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]"
          initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        >
          <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mb-6 border-2 border-red-400 border-dashed">
            <UserCircle2 size={48} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-red-400">ENEMY</h2>
          {status === 'waiting' ? (
            <span className="flex h-3 w-3 rounded-full bg-slate-600 mt-4 animate-pulse"></span>
          ) : (
            <span className="flex h-3 w-3 rounded-full bg-red-500 mt-4 blur-[2px]"></span>
          )}
        </motion.div>

      </div>
    </div>
  );
}
