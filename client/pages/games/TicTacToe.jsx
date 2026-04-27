import { motion } from 'framer-motion';

export const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function tttWinner(b) {
  for (const [a,x,c] of TTT_LINES) if (b[a] && b[a]===b[x] && b[a]===b[c]) return b[a];
  return null;
}

export default function TicTacToe({ board, mySymbol, isMyTurn, onCellClick }) {
  const winner = tttWinner(board);
  const winLine = winner
    ? TTT_LINES.find(([a,b,c]) => board[a] && board[a]===board[b] && board[a]===board[c])
    : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-slate-400 font-mono h-5">
        {winner ? '' : isMyTurn ? '⚡ Your turn' : "⏳ Opponent's turn"}
      </p>
      <div className="grid grid-cols-3 gap-2 w-56 h-56 bg-slate-800 p-2 rounded-2xl">
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i);
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.88 }}
              onClick={() => onCellClick(i)}
              className={`rounded-xl border text-3xl font-black transition-all duration-150 flex items-center justify-center
                ${cell === 'X' ? 'text-blue-400' : 'text-rose-400'}
                ${isWinCell ? 'bg-yellow-500/20 border-yellow-400/60 scale-105' : 'bg-slate-900 border-white/5'}
                ${!cell && isMyTurn && !winner ? 'hover:bg-slate-700 cursor-pointer' : 'cursor-default'}
              `}
            >
              {cell && (
                <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}>
                  {cell}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
      <p className="text-xs text-slate-600 font-mono">
        You are <span className={mySymbol === 'X' ? 'text-blue-400' : 'text-rose-400'}>{mySymbol}</span>
        {' · '}First to 3 in a row wins
      </p>
    </div>
  );
}
