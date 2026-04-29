import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, Swords, Puzzle, FileAudio, FileText, FileImage,
  ShieldCheck, CheckCircle, Copy, ArrowRight, QrCode, Zap, X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { sounds } from '../src/sounds';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function FilePreview({ file }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!previewUrl) return null;

  if (file.type.startsWith('image/')) {
    return (
      <div className="mt-3 flex justify-center">
        <img
          src={previewUrl}
          alt="preview"
          className="max-h-40 rounded-2xl object-cover border border-white/10 shadow-lg"
        />
      </div>
    );
  }

  if (file.type.startsWith('audio/')) {
    return (
      <div className="mt-3">
        <audio controls src={previewUrl} className="w-full rounded-xl" style={{ colorScheme: 'dark' }} />
      </div>
    );
  }

  return null;
}

export default function Upload() {
  const [files, setFiles]             = useState([]);
  const [isDragging, setIsDragging]   = useState(false);
  const [mode, setMode]               = useState('challenge');
  const [loading, setLoading]         = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileId, setFileId]           = useState('');
  const [uploadedName, setUploadedName] = useState('');
  const [uploadedMime, setUploadedMime] = useState('');
  const [copied, setCopied]           = useState(false);
  const [showQR, setShowQR]           = useState(false);
  const [senderEmail, setSenderEmail] = useState('');
  const [webhookUrl, setWebhookUrl]   = useState('');
  const [gameType, setGameType]       = useState('tic-tac-toe');

  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const acceptFiles = useCallback((newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    const arr = Array.from(newFiles);
    setFiles(prev => {
      const combined = [...prev, ...arr];
      if (combined.length > 10) {
        toast.error('Max 10 files');
        return combined.slice(0, 10);
      }
      return combined;
    });
    toast.success(`${arr.length} file${arr.length > 1 ? 's' : ''} added`);
  }, []);

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFiles(e.dataTransfer.files);
  }, [acceptFiles]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) { toast.error('Select at least one file'); return; }
    setLoading(true);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (mode === 'challenge') formData.append('challengeType', 'puzzle');
    if (senderEmail.trim()) formData.append('senderEmail', senderEmail.trim());
    if (webhookUrl.trim()) formData.append('webhookUrl', webhookUrl.trim());
    if (mode === 'battle') formData.append('gameType', gameType);

    try {
      const res = await axios.post(`${API_URL}/api/files/upload`, formData);
      setFileId(res.data.fileId);
      setUploadedName(res.data.originalName || files[0]?.name || '');
      setUploadedMime(res.data.mimeType || '');
      setUploadSuccess(true);
      sounds.upload();
      toast.success('Arena created! Share the link with your opponent.');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (file) => {
    if (!file) return <UploadCloud size={40} className={`transition-colors ${isDragging ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-400'}`} />;
    if (file.type.includes('image')) return <FileImage size={28} className="text-pink-400" />;
    if (file.type.includes('audio')) return <FileAudio size={28} className="text-purple-400" />;
    return <FileText size={28} className="text-blue-400" />;
  };

  if (uploadSuccess) {
    const shareUrl = `${window.location.origin}/battle/${fileId}`;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
        <div className="corner-tl" />
        <div className="corner-br" />
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md card p-10 relative z-10 text-center"
          style={{ borderTop: '2px solid #AAFF00' }}
        >
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(170,255,0,0.1)', border: '1px solid rgba(170,255,0,0.25)' }}>
            <CheckCircle size={32} style={{ color: '#AAFF00' }} />
          </div>
          <h2 className="text-3xl font-black mb-2">Payload Secured</h2>
          <p className="mb-4 text-sm" style={{ color: '#666' }}>Share this link or code with your opponent to initiate the match.</p>

          {/* File preview on success screen */}
          {files.length === 1 && (
            <div className="mb-6">
              <FilePreview file={files[0]} />
              <p className="text-xs text-slate-500 font-mono mt-2">{uploadedName}</p>
            </div>
          )}
          {files.length > 1 && (
            <div className="mb-6 flex items-center gap-2 justify-center text-sm text-slate-400">
              <FileText size={14} className="text-purple-400" />
              <span className="font-mono">{files.length} files → {uploadedName}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-4 mb-4" style={{ backgroundColor: '#0e0e0e', border: '1px solid #222' }}>
            <div className="truncate text-left flex-1 min-w-0 mr-4 font-mono text-sm" style={{ color: '#aaa' }}>
              {shareUrl}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                toast.success('Link copied!');
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-3 transition-colors shrink-0"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              {copied ? <CheckCircle size={20} style={{ color: '#AAFF00' }} /> : <Copy size={20} style={{ color: '#FF4500' }} />}
            </button>
          </div>

          <button
            onClick={() => setShowQR(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 font-semibold text-sm transition-colors mb-4"
            style={{ border: '1px solid #333', color: '#888' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF4500'; e.currentTarget.style.color = '#FF4500'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
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
                  <QRCodeSVG value={shareUrl} size={180} bgColor="#ffffff" fgColor="#0f172a" level="H" includeMargin={false} />
                  <p className="text-slate-500 text-xs font-mono mt-1">Scan to open arena</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-4 my-6">
            <div className="h-px flex-1" style={{ backgroundColor: '#222' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#555' }}>or share code</span>
            <div className="h-px flex-1" style={{ backgroundColor: '#222' }} />
          </div>

          <div className="text-3xl font-black tracking-widest text-center neon-text mb-8 py-4 font-mono select-all" style={{ color: '#FF4500', backgroundColor: '#0e0e0e', border: '1px solid #222' }}>
            {fileId}
          </div>

          <button
            onClick={() => navigate(`/battle/${fileId}`)}
            className="w-full py-4 text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FF4500' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FF6A00')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF4500')}
          >
            Enter Arena Now <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative">
      <div className="corner-tl" />
      <div className="corner-br" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl card p-8 sm:p-12 relative z-10"
        style={{ borderTop: '2px solid #FF4500' }}
      >
        <div className="absolute -top-4 right-8 px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2" style={{ backgroundColor: '#111', border: '1px solid #222', color: '#AAFF00' }}>
          <ShieldCheck size={14} /> Secure Vault
        </div>

        <h2 className="text-4xl font-black mb-1 tracking-tight">Prepare the Arena</h2>
        <p className="mb-10 text-sm" style={{ color: '#666' }}>Upload your file(s) and choose how recipients will fight for it.</p>

        <form onSubmit={handleUpload} className="flex flex-col gap-8">

          {/* Drop zone */}
          <div>
            <div
              onClick={() => fileInputRef.current.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group relative border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all p-8 ${
                isDragging
                  ? 'scale-[1.01]'
                  : ''
              }`}
              style={{
                borderColor: isDragging ? '#FF4500' : '#333',
                backgroundColor: isDragging ? 'rgba(255,69,0,0.06)' : '#0e0e0e',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => acceptFiles(e.target.files)}
                className="hidden"
                multiple
              />
              {files.length === 0 ? (
                <>
                  <UploadCloud size={44} style={{ color: isDragging ? '#FF4500' : '#444', transition: 'color 0.2s' }} />
                  <p className="mt-4 font-semibold text-base" style={{ color: '#ccc' }}>
                    {isDragging ? 'Drop files here!' : 'Click or drag & drop files'}
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#555' }}>Multiple files OK — bundled into a zip · Max 50 MB each</p>
                </>
              ) : (
                <p className="text-sm font-semibold" style={{ color: '#888' }}>
                  {files.length} file{files.length > 1 ? 's' : ''} selected · Click to add more
                </p>
              )}
              {isDragging && (
                <span className="mt-2 text-[11px] font-bold px-3 py-1 animate-pulse" style={{ backgroundColor: 'rgba(255,69,0,0.15)', color: '#FF4500' }}>
                  Release to add
                </span>
              )}
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2" style={{ backgroundColor: '#0e0e0e', border: '1px solid #222' }}>
                    {getFileIcon(f)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate" style={{ color: '#ccc' }}>{f.name}</p>
                      <p className="text-xs" style={{ color: '#444' }}>{(f.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {/* Preview first file if it's image or audio */}
                {files.length === 1 && (
                  <FilePreview file={files[0]} />
                )}
              </div>
            )}
          </div>

          {/* Mode selector */}
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('challenge')}
              className="relative flex flex-col items-center gap-3 p-6 font-bold transition-all"
              style={{
                backgroundColor: mode === 'challenge' ? 'rgba(0,212,255,0.07)' : '#0e0e0e',
                border: mode === 'challenge' ? '1px solid #00D4FF' : '1px solid #222',
                color: mode === 'challenge' ? '#00D4FF' : '#666',
              }}
            >
              <Puzzle size={28} />
              <span className="text-lg">Challenge</span>
              <span className="text-xs font-normal opacity-70">Recipient solves puzzles</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('battle')}
              className="relative flex flex-col items-center gap-3 p-6 font-bold transition-all"
              style={{
                backgroundColor: mode === 'battle' ? 'rgba(255,69,0,0.07)' : '#0e0e0e',
                border: mode === 'battle' ? '1px solid #FF4500' : '1px solid #222',
                color: mode === 'battle' ? '#FF4500' : '#666',
              }}
            >
              <Swords size={28} />
              <span className="text-lg">Live Battle</span>
              <span className="text-xs font-normal opacity-70">Direct 1v1 PvP combat</span>
            </button>
          </div>

          {/* Game type selector */}
          {mode === 'battle' && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#555' }}>Choose Mini-Game</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { id: 'tic-tac-toe', label: 'Tic-Tac-Toe',          icon: '⚔️' },
                  { id: 'rps',         label: 'Rock Paper Scissors',   icon: '✊' },
                  { id: 'memory',      label: 'Memory Match',          icon: '🧠' },
                  { id: 'reflex',      label: 'Reflex Tap',            icon: '⚡' },
                  { id: 'type-racer',  label: 'Type Racer',            icon: '⌨️' },
                  { id: 'math-duel',   label: 'Math Duel',             icon: '🔢' },
                  { id: 'quiz-battle', label: 'Quiz Battle',           icon: '🎯' },
                ].map(g => (
                  <button key={g.id} type="button" onClick={() => setGameType(g.id)}
                    className="flex items-center gap-2 p-3 text-sm font-bold transition-all"
                    style={{
                      backgroundColor: gameType === g.id ? 'rgba(255,69,0,0.08)' : '#0e0e0e',
                      border: gameType === g.id ? '1px solid #FF4500' : '1px solid #222',
                      color: gameType === g.id ? '#FF4500' : '#555',
                    }}
                  >
                    <span>{g.icon}</span>{g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional fields */}
          <div className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Your email (get notified when opponent joins)"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="px-4 py-3 text-sm outline-none transition-colors"
              style={{ backgroundColor: '#0e0e0e', border: '1px solid #222', color: '#ccc' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#FF4500')}
              onBlur={e => (e.currentTarget.style.borderColor = '#222')}
            />
            <input
              type="url"
              placeholder="Webhook URL (notified on download, optional)"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="px-4 py-3 text-sm outline-none transition-colors"
              style={{ backgroundColor: '#0e0e0e', border: '1px solid #222', color: '#ccc' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#FF4500')}
              onBlur={e => (e.currentTarget.style.borderColor = '#222')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || files.length === 0}
            className="w-full mt-2 py-4 text-white font-bold text-base transition-all flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95"
            style={{ backgroundColor: '#FF4500' }}
            onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#FF6A00')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#FF4500')}
          >
            {loading ? (
              <span className="animate-pulse">Forging Arena…</span>
            ) : (
              <><Zap size={18} />Create Link & Upload <UploadCloud size={18} /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
