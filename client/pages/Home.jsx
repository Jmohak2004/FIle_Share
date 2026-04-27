import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, UploadCloud, Gamepad2, Zap, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export default function Home() {
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
       navigate(`/battle/${joinCode.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-pink-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 text-center max-w-4xl mx-auto space-y-8"
      >
        <div className="inline-flex items-center justify-center space-x-3 mb-4 px-4 py-1.5 rounded-full glass-panel text-sm font-medium text-purple-300 border-purple-500/30">
          <Zap size={16} className="text-yellow-400" />
          <span>The next generation of file sharing is here</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            FileFight
          </span> 🥊
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Why simply send a file when users can <strong className="text-white">play for it</strong>? Transform boring transfers into interactive mini-games and real-time battles.
        </p>

        <div className="flex flex-col items-center justify-center gap-6 pt-8 w-full max-w-md mx-auto">
          <Link to="/upload" className="w-full">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 text-lg font-bold bg-white text-slate-950 rounded-2xl hover:bg-slate-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              <UploadCloud size={24} />
              Start Uploading & Create Room
            </motion.button>
          </Link>
          
          <div className="flex items-center gap-4 w-full my-2">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">OR JOIN EXISTING</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <form onSubmit={handleJoin} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-white/10 focus-within:border-blue-500 transition-colors w-full">
            <input 
               type="text" 
               placeholder="Enter Arena Code..." 
               value={joinCode}
               onChange={(e) => setJoinCode(e.target.value)}
               className="bg-transparent border-none outline-none text-white px-4 py-2 w-full placeholder:text-slate-600 font-mono tracking-widest"
            />
            <button type="submit" className="glass-panel text-blue-400 hover:text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 border-blue-500/30 shrink-0">
              Join <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mt-24 z-10"
      >
        <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-purple-500/50 transition-colors">
          <div className="p-4 bg-purple-500/20 rounded-2xl text-purple-400">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-xl font-bold">Secure Uploads</h3>
          <p className="text-slate-400">Your files are encrypted and temporarily stored safely.</p>
        </div>
        
        <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-blue-500/50 transition-colors">
          <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400">
            <Gamepad2 size={32} />
          </div>
          <h3 className="text-xl font-bold">Challenge Mode</h3>
          <p className="text-slate-400">Force receivers to solve puzzles or answer trivia to unlock.</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center gap-4 hover:border-pink-500/50 transition-colors">
          <div className="p-4 bg-pink-500/20 rounded-2xl text-pink-400">
            <Swords size={32} />
          </div>
          <h3 className="text-xl font-bold">Live Battles</h3>
          <p className="text-slate-400">Head-to-head fast-paced arcade mini-games for access.</p>
        </div>
      </motion.div>
    </div>
  );
}
