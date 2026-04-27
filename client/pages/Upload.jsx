import { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Swords, Puzzle, FileAudio, FileText, FileImage, ShieldCheck, CheckCircle, Copy, ArrowRight, QrCode, Zap, Brain } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('challenge');
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileId, setFileId] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [gameType, setGameType] = useState('tic-tac-toe');

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Select file first');
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (mode === 'challenge') {
      formData.append('challengeType', 'puzzle');
    }
    if (senderEmail.trim()) formData.append('senderEmail', senderEmail.trim());
    if (webhookUrl.trim()) formData.append('webhookUrl', webhookUrl.trim());
    if (mode === 'battle') formData.append('gameType', gameType);

    try {
      const res = await axios.post(`${API_URL}/api/files/upload`, formData);
      setFileId(res.data.fileId);
      setUploadSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return <UploadCloud size={48} className="text-slate-400 group-hover:text-blue-400 transition-colors" />;
    const type = file.type;
    if (type.includes('image')) return <FileImage size={48} className="text-pink-400" />;
    if (type.includes('audio')) return <FileAudio size={48} className="text-purple-400" />;
    return <FileText size={48} className="text-blue-400" />;
  };

  if (uploadSuccess) {
    const shareUrl = `${window.location.origin}/battle/${fileId}`;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 relative bg-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-panel p-10 rounded-[2.5rem] shadow-2xl relative z-10 text-center"
        >
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h2 className="text-3xl font-black mb-2 text-white">Payload Secured</h2>
          <p className="text-slate-400 mb-8">Share this link or code with your opponent to initiate the match.</p>

          <div className="bg-slate-900/80 p-4 rounded-2xl flex items-center justify-between border border-white/5 mb-4 shadow-inner">
            <div className="truncate text-left flex-1 min-w-0 mr-4 text-slate-300 font-mono text-sm">
              {shareUrl}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors shrink-0"
              title="Copy Link"
            >
              {copied ? <CheckCircle size={20} className="text-green-400" /> : <Copy size={20} className="text-blue-400" />}
            </button>
          </div>

          {/* QR Code toggle */}
          <button
            onClick={() => setShowQR(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-colors mb-4 text-sm font-semibold"
          >
            <QrCode size={18} />
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>

          <AnimatePresence>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6">
                  <QRCodeSVG
                    value={shareUrl}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#0f172a"
                    level="H"
                    includeMargin={false}
                  />
                  <p className="text-slate-500 text-xs font-mono mt-1">Scan to open arena</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">OR SHARE CODE</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <div className="text-3xl font-black tracking-widest text-center text-white neon-text mb-8 bg-slate-900/50 py-4 rounded-xl border border-white/5 font-mono select-all">
            {fileId}
          </div>

          <button
            onClick={() => navigate(`/battle/${fileId}`)}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
          >
            Enter Arena Now <ArrowRight size={20} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl glass-panel p-8 sm:p-12 rounded-[2.5rem] shadow-2xl relative z-10"
      >
        <div className="absolute -top-6 right-6 p-4 bg-slate-900 rounded-2xl glass-panel text-green-400 font-medium flex items-center gap-2">
          <ShieldCheck size={20} /> Secure Vault
        </div>

        <h2 className="text-4xl font-black mb-2 tracking-tight">Prepare the Arena</h2>
        <p className="text-slate-400 mb-10 text-lg">Upload your file and choose how recipients will fight for it.</p>

        <form onSubmit={handleUpload} className="flex flex-col gap-8">

          <div
            onClick={() => fileInputRef.current.click()}
            className="group relative h-48 rounded-3xl border-2 border-dashed border-slate-600 hover:border-blue-500 bg-slate-900/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-800/50"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
            {getFileIcon()}
            <p className="mt-4 font-semibold text-lg text-slate-300">
              {file ? file.name : "Click to select a file"}
            </p>
            {!file && <p className="text-sm text-slate-500">Max size: 50MB</p>}

            {file && (
              <span className="mt-2 text-xs font-bold px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode('challenge')}
              className={`relative overflow-hidden flex flex-col items-center gap-3 p-6 rounded-2xl font-bold transition-all border ${
                mode === 'challenge'
                ? 'bg-purple-900/40 border-purple-500 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Puzzle size={32} />
              <span className="text-xl">Challenge</span>
              <span className="text-xs font-normal opacity-80 mt-1">Recipient solves puzzles</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('battle')}
              className={`relative overflow-hidden flex flex-col items-center gap-3 p-6 rounded-2xl font-bold transition-all border ${
                mode === 'battle'
                ? 'bg-rose-900/40 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Swords size={32} />
              <span className="text-xl">Live Battle</span>
              <span className="text-xs font-normal opacity-80 mt-1">Direct 1v1 PvP combat</span>
            </button>
          </div>

          {/* Game type selector (battle mode only) */}
          {mode === 'battle' && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-widest">Choose Mini-Game</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'tic-tac-toe', label: 'Tic-Tac-Toe',           icon: '⚔️' },
                  { id: 'rps',         label: 'Rock Paper Scissors',    icon: '✊' },
                  { id: 'memory',      label: 'Memory Match',           icon: '🧠' },
                  { id: 'reflex',      label: 'Reflex Tap',             icon: '⚡' },
                  { id: 'type-racer',  label: 'Type Racer',             icon: '⌨️' },
                  { id: 'math-duel',   label: 'Math Duel',              icon: '🔢' },
                  { id: 'quiz-battle', label: 'Quiz Battle',            icon: '🎯' },
                ].map(g => (
                  <button key={g.id} type="button" onClick={() => setGameType(g.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                      gameType === g.id
                        ? 'bg-rose-900/40 border-rose-500 text-rose-300'
                        : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{g.icon}</span>{g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional fields */}
          <div className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Your email (get notified when opponent joins)"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="bg-slate-900/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
            <input
              type="url"
              placeholder="Webhook URL (notified on download, optional)"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="bg-slate-900/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-5 bg-white text-slate-950 rounded-2xl font-bold text-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
          >
            {loading ? (
              <span className="animate-pulse">Forging Arena...</span>
            ) : (
              <>Create Link & Upload <UploadCloud size={20} /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
