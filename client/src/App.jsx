import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useState, useEffect } from 'react';
import { Sun, Moon, Home as HomeIcon } from 'lucide-react';
import Home from '../pages/Home';
import Upload from '../pages/Upload';
import Battle from '../pages/Battle';
import Replay from '../pages/Replay';

function ThemeToggle() {
  const [light, setLight] = useState(() => localStorage.getItem('theme') === 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
    localStorage.setItem('theme', light ? 'light' : 'dark');
  }, [light]);

  return (
    <button
      onClick={() => setLight(v => !v)}
      className="fixed top-4 right-4 z-50 p-2.5 transition-colors"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {light ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}

function HomeButton() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  return (
    <Link
      to="/"
      className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-2 text-sm font-bold transition-colors"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      title="Back to Home"
    >
      <HomeIcon size={14} />
      <span>Home</span>
    </Link>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0',
          },
        }}
        richColors
      />
      <ThemeToggle />
      <HomeButton />
      <Routes>
        <Route path="/"              element={<Home />} />
        <Route path="/upload"        element={<Upload />} />
        <Route path="/battle/:roomId" element={<Battle />} />
        <Route path="/replay/:battleId" element={<Replay />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
