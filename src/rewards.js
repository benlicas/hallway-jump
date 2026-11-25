// Bonus video rewards: score REWARDS.score (or a character's rewardScore)
// in a single run to unlock that character's video. Unlocks are saved on
// this device only. Videos live in assets/rewards/<character id>.mp4
// (or a character's rewardVideo path) and only download when played.

import { REWARDS } from './config.js';

const KEY = 'hallwayJump.rewards.v1';
let unlocked = load();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(unlocked)); } catch { /* storage blocked */ }
}

export const scoreNeeded = (ch) => ch.rewardScore ?? REWARDS.score;
export const videoFor = (ch) => ch.rewardVideo || `${REWARDS.dir}/${ch.id}.mp4`;
export const isUnlocked = (ch) => !!unlocked[ch.id];

// Returns true only the first time this character is unlocked.
export function unlock(ch) {
  if (unlocked[ch.id]) return false;
  unlocked[ch.id] = new Date().toISOString();
  save();
  return true;
}

// ---------- fullscreen video player (plain HTML on top of the game) ----------
let overlay, video, title, msg;

function build() {
  overlay = document.createElement('div');
  overlay.id = 'reward-overlay';
  overlay.innerHTML = `
    <div class="reward-top">
      <span class="reward-title"></span>
      <button class="reward-close" aria-label="Close video">✕</button>
    </div>
    <video playsinline controls preload="none"></video>
    <div class="reward-msg"></div>`;
  document.body.appendChild(overlay);
  video = overlay.querySelector('video');
  title = overlay.querySelector('.reward-title');
  msg = overlay.querySelector('.reward-msg');
  overlay.querySelector('.reward-close').addEventListener('click', close);
  // keep taps on the player from reaching the game underneath
  for (const ev of ['pointerdown', 'touchstart', 'keydown']) overlay.addEventListener(ev, e => e.stopPropagation());
  video.addEventListener('ended', close);
  video.addEventListener('error', comingSoon);
}

function comingSoon() {
  if (!overlay || !isOpen()) return;
  video.style.display = 'none';
  msg.textContent = 'Bonus video coming soon!';
  msg.style.display = 'block';
}

export function play(ch) {
  if (!overlay) build();
  title.textContent = `🎬 ${ch.name}'s bonus video`;
  msg.style.display = 'none';
  video.style.display = 'block';
  overlay.classList.add('open');
  video.src = videoFor(ch);
  video.currentTime = 0;
  const p = video.play();
  if (p && p.catch) p.catch(err => { if (err && err.name !== 'AbortError' && err.name !== 'NotAllowedError') comingSoon(); });
}

export function close() {
  if (!overlay) return;
  video.pause();
  video.removeAttribute('src');
  video.load();               // stop any download in progress
  overlay.classList.remove('open');
}

export const isOpen = () => !!overlay && overlay.classList.contains('open');
