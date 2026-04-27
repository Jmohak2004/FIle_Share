import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 space-y-8">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        FileFight 🥊
      </h1>
      <p className="text-xl text-gray-300 max-w-lg">
        File sharing, but make it competitive. Why just send a link when your friends can 
        play mini-games to unlock it?
      </p>
      
      <div className="flex gap-4">
        <Link 
          to="/upload" 
          className="px-8 py-3 text-lg font-bold bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full hover:scale-105 transition-transform"
        >
          Upload & Challenge
        </Link>
      </div>
    </div>
  );
}