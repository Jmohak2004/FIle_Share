let audioCtx;

async function ctx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration, type = 'sine', vol = 0.15, startAt = 0) {
  ctx().then(c => {
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + startAt);
      gain.gain.setValueAtTime(vol, c.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startAt + duration);
      osc.start(c.currentTime + startAt);
      osc.stop(c.currentTime + startAt + duration + 0.05);
    } catch (_) {}
  }).catch(() => {});
}

export const sounds = {
  upload() {
    [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'sine', 0.2, i * 0.12));
  },
  battleStart() {
    tone(220, 0.1, 'square', 0.15, 0);
    tone(330, 0.1, 'square', 0.15, 0.1);
    tone(440, 0.2, 'square', 0.18, 0.2);
  },
  opponentJoined() {
    tone(880, 0.15, 'sine', 0.15, 0);
    tone(1047, 0.2, 'sine', 0.15, 0.12);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.2, i * 0.13));
  },
  lose() {
    [400, 300, 200].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, i * 0.15));
  },
  reaction() {
    tone(660, 0.08, 'sine', 0.1, 0);
  },
};
