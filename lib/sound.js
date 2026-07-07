// lib/sound.js
// A little synthesized "ping" — two quick tones, slightly detuned, with a
// fast decay. Generated in-browser with the Web Audio API rather than a
// sample file, so there's zero licensing to worry about and it's tiny.

let ctx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  return ctx;
}

function tone(audioCtx, freq, startTime, duration, gainPeak) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// The signature "ping": a bright high note followed by a slightly lower
// one a beat later — quick, quirky, unmistakably "new stuff arrived."
export function playPing() {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const now = audioCtx.currentTime;
  tone(audioCtx, 1318.5, now, 0.16, 0.18); // E6
  tone(audioCtx, 987.77, now + 0.09, 0.22, 0.14); // B5
}
