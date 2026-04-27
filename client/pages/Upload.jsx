import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('challenge'); // or 'battle'
  const navigate = useNavigate();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Select file first');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('challengeType', mode === 'challenge' ? 'puzzle' : 'tic-tac-toe'); // default demo values

    try {
      const res = await axios.post('http://localhost:5001/api/files/upload', formData);
      alert('Upload success! ID: ' + res.data.fileId);
      if (mode === 'battle') {
         navigate(`/battle/${res.data.fileId}`);
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-3xl font-bold mb-6">Choose Your Arena</h2>
      
      <form onSubmit={handleUpload} className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md flex flex-col gap-6">
        <div>
          <label className="block text-gray-400 mb-2 font-semibold">Select File</label>
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-2 font-semibold">Select Mode</label>
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={() => setMode('challenge')}
              className={`flex-1 py-2 rounded-lg font-bold transition-colors ${mode === 'challenge' ? 'bg-pink-600' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              Challenge
            </button>
            <button 
              type="button" 
              onClick={() => setMode('battle')}
              className={`flex-1 py-2 rounded-lg font-bold transition-colors ${mode === 'battle' ? 'bg-blue-600' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              Live Battle
            </button>
          </div>
        </div>

        <button type="submit" className="w-full py-3 bg-green-500 rounded-lg font-bold text-lg hover:bg-green-400 transition-colors mt-4">
          Upload & Generate Link
        </button>
      </form>
    </div>
  );
}