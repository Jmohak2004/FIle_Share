// Client-side bot socket: mimics Socket.IO interface, responds as AI opponent.
export function createBotSocket(gameType) {
  const _handlers = {};
  let _alive = true;

  const socket = {
    id: 'bot',
    on(event, handler) { _handlers[event] = handler; },
    off(event) { delete _handlers[event]; },
    emit(event, data) { if (_alive) _botRespond(event, data); },
    disconnect() { _alive = false; },
  };

  function fire(event, data) {
    if (_alive && _handlers[event]) _handlers[event](data);
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function _botRespond(event, data) {
    if (!_alive) return;
    if (event === 'rps-pick') {
      const opts = ['rock', 'paper', 'scissors'];
      setTimeout(() => fire('rps-opponent-pick', opts[Math.floor(Math.random() * 3)]), rand(400, 1200));
    }
    // Other game events are handled by independent startBotBehavior timers
  }

  // Call once when the game starts to kick off independent bot behaviors
  function startBotBehavior() {
    if (!_alive) return;

    if (gameType === 'reflex') {
      setTimeout(() => fire('reflex-opponent-time', rand(180, 480)), rand(1800, 4500));
    }

    if (gameType === 'type-racer') {
      const totalChars = 72;
      const wpm = rand(28, 52);
      const msPerChar = 60000 / (wpm * 5);
      let chars = 0;
      const t = setInterval(() => {
        if (!_alive) { clearInterval(t); return; }
        chars = Math.min(totalChars, chars + 1);
        fire('opponent-type-progress', chars / totalChars);
        if (chars >= totalChars) clearInterval(t);
      }, msPerChar);
    }

    if (gameType === 'math-duel') {
      (async () => {
        for (let round = 1; round <= 5; round++) {
          await new Promise(r => setTimeout(r, rand(700, 2200)));
          if (!_alive) return;
          fire('opponent-math-answer', { round, correct: Math.random() > 0.28 });
        }
      })();
    }

    if (gameType === 'quiz-battle') {
      (async () => {
        for (let round = 1; round <= 5; round++) {
          await new Promise(r => setTimeout(r, rand(900, 2800)));
          if (!_alive) return;
          fire('opponent-quiz-answer', { round, correct: Math.random() > 0.42 });
        }
      })();
    }

    if (gameType === 'memory') {
      let m = 0;
      const t = setInterval(() => {
        if (!_alive) { clearInterval(t); return; }
        m++;
        fire('opponent-memory-progress', m);
        if (m >= 8) clearInterval(t);
      }, rand(1600, 2800));
    }
  }

  return { socket, startBotBehavior, fire };
}
