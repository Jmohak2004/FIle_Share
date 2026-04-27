import { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UploadCloud, Swords, Puzzle, FileAudio, FileText, FileImage, ShieldCheck } from 'lucide-react';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('challenge');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Select file first');
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('challengeType', mode === 'challenge' ? 'puzzle' : 'tic-tac-toe');

    try {
      const res = await axios.post('http://localhost:5001/api/files/upload', formData);
      if (mode === 'battle') {
         navigate(`/battle/${res.data.fileId}`);
      } else {
         alert('Challenge created! Link ID: ' + res.data.fileId);
      }
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
          
          {/* File Dropzone */}
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
                 {(file.size / (1024*1024)).toFixed(2)} MB
              </span>
            )}
          </div>

          {/* Mode Selection */}
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

          {/* Submit */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 py-5 bg-white text-slate-950 rounded-2xl font-bold text-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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