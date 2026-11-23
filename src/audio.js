// Game sounds. Most are synthesized; Bob's yell can be your own recording
// (see SOUNDS in config.js). Phones block sound until the first tap, so
// unlock() runs on the first tap and also loads the recorded clip then.
import { SOUNDS } from './config.js';

let ac = null;
let muted = false;

export function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    loadYellClip();
  }
  if (ac.state === 'suspended') ac.resume();
}

// ---- recorded yell clip ----
let yellBuffer = null;     // decoded clip, if the file loaded
let yellSource = null;     // currently playing clip (so it doesn't overlap)

async function loadYellClip() {
  if (!SOUNDS || !SOUNDS.yell || SOUNDS.yellStyle === 'classic') return;
  try {
    const res = await fetch(SOUNDS.yell);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.arrayBuffer();
    yellBuffer = await new Promise((ok, fail) => ac.decodeAudioData(data, ok, fail));
  } catch (e) {
    console.info('Bob yell clip not used (falling back to synth):', SOUNDS.yell, e && e.message);
    yellBuffer = null;
  }
}

function playYellClip() {
  if (!ac || !yellBuffer) return false;
  if (yellSource) { try { yellSource.stop(); } catch { /* already done */ } }
  const src = ac.createBufferSource();
  src.buffer = yellBuffer;
  const g = ac.createGain();
  g.gain.value = SOUNDS.yellVolume ?? 1;
  src.connect(g).connect(ac.destination);
  src.start();
  yellSource = src;
  return true;
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone({ type = 'sine', from = 440, to = from, dur = 0.15, vol = 0.2, delay = 0 }) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.2, vol = 0.3, freq = 800, delay = 0 }) {
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  tap() { tone({ type: 'square', from: 660, to: 880, dur: 0.07, vol: 0.08 }); },
  jump() { tone({ type: 'triangle', from: 300, to: 700, dur: 0.25, vol: 0.15 }); },
  land() { noise({ dur: 0.15, vol: 0.35, freq: 400 }); },
  clear() {
    tone({ type: 'square', from: 523, dur: 0.1, vol: 0.1 });
    tone({ type: 'square', from: 659, dur: 0.1, vol: 0.1, delay: 0.1 });
    tone({ type: 'square', from: 784, dur: 0.2, vol: 0.1, delay: 0.2 });
  },
  // Camera shutter: two quick mechanical clicks.
  shutter() {
    noise({ dur: 0.035, vol: 0.5, freq: 6000 });
    tone({ type: 'square', from: 1800, to: 900, dur: 0.03, vol: 0.06 });
    noise({ dur: 0.05, vol: 0.4, freq: 3500, delay: 0.085 });
  },
  bonk() { tone({ type: 'sine', from: 180, to: 60, dur: 0.25, vol: 0.4 }); noise({ dur: 0.1, vol: 0.3, freq: 1200 }); },
  // Bob's yell: your recorded clip if it loaded, otherwise the synth "OWWWW!".
  yell() {
    if (!ac || muted) return;
    if (playYellClip()) return;
    // synth fallback: sawtooth voice through a sweeping filter with vibrato
    const t0 = ac.currentTime + 0.03;
    const dur = 0.9;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(320, t0);
    o.frequency.linearRampToValueAtTime(380, t0 + 0.12);
    o.frequency.exponentialRampToValueAtTime(140, t0 + dur);
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 7; lfoGain.gain.value = 14;
    lfo.connect(lfoGain).connect(o.frequency);
    const f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(1100, t0);
    f.frequency.exponentialRampToValueAtTime(450, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.05);
    g.gain.setValueAtTime(0.5, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(f).connect(g).connect(ac.destination);
    o.start(t0); lfo.start(t0);
    o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    noise({ dur: 0.12, vol: 0.4, freq: 500 });
  },
  highScore() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ type: 'square', from: f, dur: 0.12, vol: 0.09, delay: i * 0.11 }));
  },
};
