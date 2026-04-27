import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

export default function Battle() {
  const { roomId } = useParams();
  const [status, setStatus] = useState('waiting');
  
  useEffect(() => {
    socket.emit('join-room', roomId);
    socket.on('player-joined', () => setStatus('ready'));
    socket.on('game-start', () => setStatus('playing'));
    socket.on('game-end', (winner) => setStatus(`Winner: ${winner}`));

    return () => socket.disconnect();
  }, [roomId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-gray-900">
      <h1 className="text-4xl font-extrabold mb-6 text-blue-400">Battle Arena: {roomId}</h1>
      <div className="w-full max-w-lg mt-8 p-10 bg-gray-800 shadow-2xl rounded-2xl border border-gray-700">
        {status === 'waiting' && <p className="text-xl text-gray-400 animate-pulse mb-4">Waiting for opponent...</p>}
        {status === 'ready' && <p className="text-xl text-green-400 mb-4 animate-bounce">Opponent Joined! Ready?</p>}
        {status === 'playing' && (
          <div>
            <h2 className="text-2xl text-yellow-400 mb-4">TIC TAC TOE BATTLE (Placeholder)</h2>
            <div className="grid grid-cols-3 gap-2 mx-auto w-48 h-48">
              {Array(9).fill(null).map((_, i) => (
                <button key={i} className="bg-gray-700 w-16 h-16 text-3xl font-bold hover:bg-gray-600 rounded-lg transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500"></button>
              ))}
            </div>
            <p className="mt-6 text-gray-300">Tap fast to claim victory and unlock the file!</p>
          </div>
        )}
        {status.startsWith('Winner') && <p className="text-3xl text-green-500 font-bold">{status}</p>}
      </div>
    </div>
  );
}