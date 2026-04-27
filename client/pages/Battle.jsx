import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircle2, Skull, Share2, CheckCircle, Zap } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/* ─── Tic-Tac-Toe helpers ─── */
const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function tttWinner(b) {
  for (const [a,x,c] of TTT_LINES) if (b[a] && b[a]===b[x] && b[a]===b[c]) return b[a];
  return null;
}

/* ─── TicTacToe component ─── */
function TicTacToe({ board, mySymbol, isMyTurn, onCellClick }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-slate-400 font-mono">{isMyTurn ? '⚡ Your turn' : "⏳ Opponent's turn"}</p>
      <div className="grid grid-cols-3 gap-2 w-52 h-52 bg-slate-800 p-2 rounded-xl">
        {board.map((cell, i) => (
          <motion.button key={i} whileTap={{ scale: 0.9 }}
            onClick={() => onCellClick(i)}
            className={`bg-slate-900 rounded border border-white/5 text-2xl font-black transition-colors
              ${!cell && isMyTurn ? 'hover:bg-slate-700 cursor-pointer' : 'cursor-default'}
              ${cell === 'X' ? 'text-blue-400' : 'text-rose-400'}`}
          >{cell}</motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── Rock-Paper-Scissors component ─── */
const RPS_OPTIONS = [
  { label: '✊', value: 'rock', beats: 'scissors' },
  { label: '✋', value: 'paper', beats: 'rock' },
  { label: '✌️', value: 'scissors', beats: 'paper' },
];
function rpsResult(mine, theirs) {
  if (mine === theirs) return 'draw';
  const me = RPS_OPTIONS.find(o => o.value === mine);
  return me.beats === theirs ? 'win' : 'lose';
}

function RPS({ onResult, socket, roomId }) {
  const [myPick, setMyPick] = useState(null);
  const [opponentPick, setOpponentPick] = useState(null);
  const [round, setRound] = useState(1);

  useEffect(() => {
    socket.on('rps-opponent-pick', (pick) => setOpponentPick(pick));
    return () => socket.off('rps-opponent-pick');
  }, [socket]);

  useEffect(() => {
    if (myPick && opponentPick) {
      const result = rpsResult(myPick, opponentPick);
      setTimeout(() => {
        if (result !== 'draw') {
          onResult(result === 'win' ? 'me' : 'opponent');
        } else {
          setMyPick(null);
          setOpponentPick(null);
          setRound(r => r + 1);
        }
      }, 1200);
    }
  }, [myPick, opponentPick, onResult]);

  const handlePick = (value) => {
    if (myPick) return;
    setMyPick(value);
    socket.emit('submit-move', { roomId, move: { player: socket.id, rps: value } });
    socket.emit('rps-pick', { roomId, pick: value });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-yellow-400 font-bold tracking-widest">ROUND {round}</p>
      <div className="flex gap-4">
        {RPS_OPTIONS.map(opt => (
          <motion.button key={opt.value} whileTap={{ scale: 0.85 }}
            onClick={() => handlePick(opt.value)}
            className={`text-4xl p-4 rounded-2xl border transition-all ${
              myPick === opt.value
                ? 'bg-purple-700/60 border-purple-400 scale-110'
                : 'bg-slate-800 border-white/10 hover:bg-slate-700'
            } ${myPick && myPick !== opt.value ? 'opacity-40' : ''}`}
          >{opt.label}</motion.button>
        ))}
      </div>
      {myPick && !opponentPick && (
        <p className="text-slate-400 text-sm animate-pulse">Waiting for opponent...</p>
      )}
      {myPick && opponentPick && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
          <p className="text-slate-300 text-sm mb-1">
            You: {RPS_OPTIONS.find(o => o.value === myPick)?.label}
            {'  vs  '}
            Them: {RPS_OPTIONS.find(o => o.value === opponentPick)?.label}
          </p>
          <p className={`font-black text-xl ${rpsResult(myPick, opponentPick) === 'win' ? 'text-green-400' : rpsResult(myPick, opponentPick) === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>
            {rpsResult(myPick, opponentPick) === 'draw' ? 'DRAW — next round!' : rpsResult(myPick, opponentPick) === 'win' ? 'YOU WIN THIS ROUND!' : 'OPPONENT WINS!'}
          </p>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Memory Match component ─── */
const EMOJI_POOL = ['🔥','💀','⚔️','🛡️','🧠','👾','🎯','🏆'];
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function MemoryMatch({ onResult }) {
  const cards = useRef(shuffle([...EMOJI_POOL, ...EMOJI_POOL].map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }))));
  const [state, setState] = useState(cards.current);
  const [selected, setSelected] = useState([]);
  const [myMatches, setMyMatches] = useState(0);
  const [opMatches] = useState(0); // simplified: solo memory game, first to 8 wins

  const flip = (id) => {
    if (selected.length === 2) return;
    const card = state.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;

    const newState = state.map(c => c.id === id ? { ...c, flipped: true } : c);
    setState(newState);
    const newSel = [...selected, id];
    setSelected(newSel);

    if (newSel.length === 2) {
      const [a, b] = newSel.map(sid => newState.find(c => c.id === sid));
      if (a.emoji === b.emoji) {
        setTimeout(() => {
          setState(s => s.map(c => newSel.includes(c.id) ? { ...c, matched: true } : c));
          setSelected([]);
          setMyMatches(m => {
            const next = m + 1;
            if (next === EMOJI_POOL.length) onResult('me');
            return next;
          });
        }, 400);
      } else {
        setTimeout(() => {
          setState(s => s.map(c => newSel.includes(c.id) ? { ...c, flipped: false } : c));
          setSelected([]);
        }, 800);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-slate-400">Match all pairs to win — <span className="text-green-400 font-bold">{myMatches}/{EMOJI_POOL.length}</span> matched</p>
      <div className="grid grid-cols-4 gap-2 w-64">
        {state.map(card => (
          <motion.button key={card.id} whileTap={{ scale: 0.9 }}
            onClick={() => flip(card.id)}
            className={`h-14 rounded-xl text-2xl flex items-center justify-center border transition-all ${
              card.matched ? 'bg-green-900/40 border-green-500/40 opacity-50' :
              card.flipped ? 'bg-purple-800/60 border-purple-400' :
              'bg-slate-800 border-white/10 hover:bg-slate-700'
            }`}
          >
            {(card.flipped || card.matched) ? card.emoji : '❓'}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── Reflex Tap component ─── */
function ReflexTap({ onResult, socket, roomId }) {
  const [phase, setPhase] = useState('wait'); // wait | ready | go | done
  const [myTime, setMyTime] = useState(null);
  const [opTime, setOpTime] = useState(null);
  const startRef = useRef(null);

  useEffect(() => {
    // Host starts the countdown
    const delay = 2000 + Math.random() * 3000;
    const t = setTimeout(() => setPhase('go'), delay);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === 'go') startRef.current = Date.now();
  }, [phase]);

  useEffect(() => {
    socket.on('reflex-opponent-time', (ms) => setOpTime(ms));
    return () => socket.off('reflex-opponent-time');
  }, [socket]);

  useEffect(() => {
    if (myTime !== null && opTime !== null) {
      onResult(myTime <= opTime ? 'me' : 'opponent');
    }
  }, [myTime, opTime, onResult]);

  const handleTap = () => {
    if (phase !== 'go' || myTime !== null) return;
    const ms = Date.now() - startRef.current;
    setMyTime(ms);
    setPhase('done');
    socket.emit('submit-move', { roomId, move: { player: socket.id, reflex: ms } });
    socket.emit('reflex-time', { roomId, ms });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-slate-400 text-sm text-center max-w-xs">
        Tap the button <strong className="text-white">as fast as possible</strong> when it turns green!
      </p>
      <motion.button
        onClick={handleTap}
        animate={{ scale: phase === 'go' ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: phase === 'go' ? Infinity : 0, duration: 0.4 }}
        className={`w-40 h-40 rounded-full text-2xl font-black border-4 transition-all duration-300 flex flex-col items-center justify-center gap-1
          ${phase === 'wait' ? 'bg-slate-800 border-slate-600 text-slate-500 cursor-default' : ''}
          ${phase === 'go' ? 'bg-green-500 border-green-300 text-black cursor-pointer shadow-[0_0_40px_rgba(34,197,94,0.6)] animate-pulse' : ''}
          ${phase === 'done' ? 'bg-slate-700 border-slate-500 text-slate-400 cursor-default' : ''}
        `}
      >
        {phase === 'wait' && <><Zap size={32} /><span className="text-sm">Get ready...</span></>}
        {phase === 'go' && <><Zap size={32} /><span className="text-sm">TAP NOW!</span></>}
        {phase === 'done' && <><span>{myTime}ms</span><span className="text-sm">Waiting...</span></>}
      </motion.button>
      {myTime && opTime && (
        <p className="text-slate-400 text-sm">
          You: {myTime}ms — Them: {opTime}ms
        </p>
      )}
    </div>
  );
}

/* ─── Main Battle page ─── */
export default function Battle() {
  const { roomId } = useParams();
  const [status, setStatus] = useState('waiting');
  const [gameType, setGameType] = useState('tic-tac-toe');
  const [board, setBoard] = useState(Array(9).fill(null));
  const [mySymbol, setMySymbol] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState(null); // 'me' | 'opponent' | 'draw'
  const [battleId, setBattleId] = useState(null);
  const [replayCopied, setReplayCopied] = useState(false);
  const socketRef = useRef(null);
  const isFirstPlayer = useRef(false);

  const handleGameResult = useCallback((result) => {
    setWinner(result);
    setStatus('ended');
    const finalWinner = result === 'me' ? 'me' : result === 'draw' ? 'draw' : 'opponent';
    socketRef.current?.emit('game-over', { roomId, winner: finalWinner });
  }, [roomId]);

  const handleCellClick = useCallback((index) => {
    if (!isMyTurn || board[index] || winner || status !== 'playing') return;
    const newBoard = [...board];
    newBoard[index] = mySymbol;
    setBoard(newBoard);
    setIsMyTurn(false);
    socketRef.current?.emit('submit-move', { roomId, move: { player: socketRef.current.id, cellIndex: index } });
    const w = tttWinner(newBoard);
    const isDraw = !w && newBoard.every(Boolean);
    if (w || isDraw) handleGameResult(w === mySymbol ? 'me' : isDraw ? 'draw' : 'opponent');
  }, [isMyTurn, board, winner, status, mySymbol, roomId, handleGameResult]);

  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;
    let joined = false;

    socket.on('connect', () => {
      socket.emit('join-room', roomId);
    });

    socket.on('player-joined', () => {
      if (!joined) { isFirstPlayer.current = true; joined = true; }
      setStatus('ready');
    });

    socket.on('game-start', ({ battleId: bid, gameType: gt }) => {
      setBattleId(bid);
      setGameType(gt || 'tic-tac-toe');
      setStatus('playing');
      const symbol = isFirstPlayer.current ? 'X' : 'O';
      setMySymbol(symbol);
      setIsMyTurn(symbol === 'X');
    });

    socket.on('opponent-move', ({ cellIndex }) => {
      if (cellIndex == null) return;
      setBoard(prev => {
        const nb = [...prev];
        nb[cellIndex] = mySymbol === 'X' ? 'O' : 'X';
        const w = tttWinner(nb);
        const isDraw = !w && nb.every(Boolean);
        if (w) handleGameResult(w === mySymbol ? 'me' : 'opponent');
        else if (isDraw) handleGameResult('draw');
        return nb;
      });
      setIsMyTurn(true);
    });

    socket.on('game-end', (result) => {
      setWinner(result);
      setStatus('ended');
    });

    // RPS/Reflex relay
    socket.on('rps-pick', ({ pick }) => socket.emit('rps-opponent-pick', pick));
    socket.on('reflex-time', ({ ms }) => socket.emit('reflex-opponent-time', ms));

    return () => {
      socket.off('player-joined');
      socket.off('game-start');
      socket.off('opponent-move');
      socket.off('game-end');
      socket.off('rps-pick');
      socket.off('reflex-time');
      socket.disconnect();
    };
  }, [roomId]);

  // keep opponent-move handler in sync with mySymbol
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !mySymbol) return;
    socket.off('opponent-move');
    socket.on('opponent-move', ({ cellIndex }) => {
      if (cellIndex == null) return;
      setBoard(prev => {
        const nb = [...prev];
        nb[cellIndex] = mySymbol === 'X' ? 'O' : 'X';
        const w = tttWinner(nb);
        const isDraw = !w && nb.every(Boolean);
        if (w) handleGameResult(w === mySymbol ? 'me' : 'opponent');
        else if (isDraw) handleGameResult('draw');
        return nb;
      });
      setIsMyTurn(true);
    });
  }, [mySymbol, handleGameResult]);

  const handleDownload = async () => {
    try {
      await axios.post(`${API_URL}/api/files/unlock/${roomId}`);
      window.location.href = `${API_URL}/api/files/download/${roomId}`;
    } catch { alert('Download failed'); }
  };

  const replayUrl = battleId ? `${window.location.origin}/replay/${battleId}` : null;

  const resultLabel = () => {
    if (winner === 'draw') return <span className="text-yellow-400">DRAW!</span>;
    if (winner === 'me') return <span className="text-green-400">YOU WIN!</span>;
    return <span className="text-red-400">YOU LOSE!</span>;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center z-10 mb-10">
        <span className="text-pink-500 font-bold tracking-widest uppercase text-sm mb-2 block">Arena Zone</span>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 neon-text">DEATHMATCH</h1>
        <p className="text-slate-400 mt-2 font-mono text-sm opacity-50"># {roomId}</p>
      </motion.div>

      <div className="w-full max-w-5xl z-10 flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Player 1 */}
        <motion.div className="glass-panel p-6 rounded-3xl w-56 flex flex-col items-center border-blue-500/30 shrink-0" initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 border-2 border-blue-400 border-dashed">
            <UserCircle2 size={40} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-black text-blue-400">YOU</h2>
          {mySymbol && <span className="mt-1 text-blue-300 font-mono font-black text-lg">{mySymbol}</span>}
          <span className="animate-pulse flex h-3 w-3 rounded-full bg-green-500 mt-3"></span>
        </motion.div>

        {/* Center panel */}
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/5 flex-1 min-h-[360px]">

          {status === 'waiting' && (
            <div className="text-center">
              <Skull className="mx-auto mb-4 text-slate-600 animate-pulse" size={48} />
              <p className="text-xl text-slate-400 font-mono tracking-widest mb-4">AWAITING OPPONENT</p>
              <div className="flex gap-2 justify-center">
                {[0,1,2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: `${i*100}ms` }}></span>)}
              </div>
            </div>
          )}

          {status === 'ready' && (
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-center">
              <p className="text-2xl text-green-400 font-black tracking-widest neon-text">CHALLENGER IDENTIFIED</p>
              <p className="text-slate-400 mt-2">Starting match...</p>
            </motion.div>
          )}

          {status === 'playing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full">
              <h2 className="text-xl text-yellow-400 font-black mb-6 tracking-widest">
                {{
                  'tic-tac-toe': '⚔️ TIC-TAC-TOE',
                  'rps': '✊ ROCK PAPER SCISSORS',
                  'memory': '🧠 MEMORY MATCH',
                  'reflex': '⚡ REFLEX TAP',
                }[gameType] || '⚔️ FIGHT!'}
              </h2>

              {gameType === 'tic-tac-toe' && (
                <TicTacToe board={board} mySymbol={mySymbol} isMyTurn={isMyTurn} onCellClick={handleCellClick} />
              )}
              {gameType === 'rps' && (
                <RPS onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
              )}
              {gameType === 'memory' && (
                <MemoryMatch onResult={handleGameResult} />
              )}
              {gameType === 'reflex' && (
                <ReflexTap onResult={handleGameResult} socket={socketRef.current} roomId={roomId} />
              )}
            </motion.div>
          )}

          {status === 'ended' && (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center w-full">
              <p className="text-4xl font-black neon-text uppercase drop-shadow-2xl mb-4">{resultLabel()}</p>

              {gameType === 'tic-tac-toe' && (
                <div className="grid grid-cols-3 gap-1.5 mx-auto w-36 h-36 bg-slate-800 p-1.5 rounded-xl mb-4">
                  {board.map((cell, i) => (
                    <div key={i} className={`bg-slate-900 rounded border border-white/5 flex items-center justify-center text-lg font-black ${cell === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>{cell}</div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 mt-2 max-w-xs mx-auto">
                {winner === 'me' && (
                  <button onClick={handleDownload} className="px-6 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-colors">
                    Download Payload
                  </button>
                )}
                {replayUrl && (
                  <>
                    <button
                      onClick={() => { navigator.clipboard.writeText(replayUrl); setReplayCopied(true); setTimeout(() => setReplayCopied(false), 2000); }}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-white/10"
                    >
                      {replayCopied ? <CheckCircle size={16} className="text-green-400" /> : <Share2 size={16} />}
                      {replayCopied ? 'Copied!' : 'Share Replay Link'}
                    </button>
                    <Link to={`/replay/${battleId}`} className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-900/40 border border-purple-500/40 text-purple-300 font-bold rounded-xl hover:bg-purple-900/60 transition-colors">
                      Watch Replay
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Player 2 */}
        <motion.div className="glass-panel p-6 rounded-3xl w-56 flex flex-col items-center border-red-500/30 shrink-0" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border-2 border-red-400 border-dashed">
            <UserCircle2 size={40} className="text-red-400" />
          </div>
          <h2 className="text-xl font-black text-red-400">ENEMY</h2>
          {mySymbol && <span className="mt-1 text-rose-300 font-mono font-black text-lg">{mySymbol === 'X' ? 'O' : 'X'}</span>}
          {status === 'waiting'
            ? <span className="flex h-3 w-3 rounded-full bg-slate-600 mt-3 animate-pulse"></span>
            : <span className="flex h-3 w-3 rounded-full bg-red-500 mt-3 blur-[2px]"></span>
          }
        </motion.div>

      </div>
    </div>
  );
}
