import {
  W, H, VIEW_EXTRA, FLOOR_Y, START_X, TAKEOFF_X, MAN, CHARACTERS, bodyOf, stompSpotFor,
  SPEED_METER_PERIOD, ANGLE_METER_PERIOD, POINTS_PER_CLEAR, STREAK_BONUS,
  PHOTOBOMB,
} from './config.js';
import { launch, step, angleFromMeter } from './physics.js';
import {
  drawHallway, drawFloorMan, drawJumper, drawSpeedMeter, drawAngleMeter, drawAngleArrow,
  speechBubble, panel, button, statBar, text,
} from './draw.js';
import { unlock, sfx } from './audio.js';
import { getHighScore, submitScore } from './scores.js';
import { tryLockLandscape } from './orientation.js';
import * as photobomb from './photobomb.js';

// ---------- canvas setup ----------
// The game stage is 960x540. It's scaled to the screen height, and on wider
// screens the hallway extends left/right (up to VIEW_EXTRA) to fill the width.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let scale = 1;
const view = { left: 0, right: W, offset: 0, padL: 0, padR: 0 };  // visible stage x-range

// Notch / rounded-corner safe areas (CSS env values), in screen pixels.
function safeInsets() {
  const el = document.getElementById('safe-probe');
  if (!el) return { l: 0, r: 0 };
  const cs = getComputedStyle(el);
  return { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0 };
}

function screenSize() {
  const vv = window.visualViewport;      // excludes the browser's address bar
  return { w: vv ? vv.width : window.innerWidth, h: vv ? vv.height : window.innerHeight };
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const { w, h } = screenSize();
  scale = h / H;
  if (w / scale < W) scale = w / W;      // narrower than 16:9 (tablets): fit width
  const viewW = Math.min(w / scale, W + 2 * VIEW_EXTRA);
  view.offset = (viewW - W) / 2;
  view.left = -view.offset;
  view.right = W + view.offset;
  const ins = safeInsets();
  view.padL = ins.l / scale;            // keep HUD text out from under a notch
  view.padR = ins.r / scale;
  const cssW = Math.round(viewW * scale), cssH = Math.round(H * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, view.offset * scale * dpr, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

// ---------- game state ----------
const G = {
  screen: 'title',      // title | select | play | initials | over
  phase: 'speed',       // speed | angle | run | air | stumble | result
  t: 0,                 // time in current phase
  clock: 0,             // total time (for animations)
  char: CHARACTERS[1],
  speed01: 0, angle01: 0,
  x: START_X, h: 0, legPhase: 0,
  jump: null,
  outcome: null,
  manMood: 'idle',
  score: 0, streak: 0, clears: 0,
  lastPoints: 0,
  high: { score: 0, initials: '---' },
  initials: ['A', 'A', 'A'],
  shake: 0,
  forced: null,         // test hook: { s, a } to lock exact meter values
};

getHighScore().then(h => { G.high = h; });
try {
  const last = localStorage.getItem('hallwayJump.lastInitials');
  if (last && /^[A-Z ]{3}$/.test(last)) G.initials = last.split('');
} catch { /* ignore */ }

function setPhase(p) { G.phase = p; G.t = 0; }

function tri(u) { // 0 -> 1 -> 0 triangle wave
  const m = u % 1;
  return m < 0.5 ? m * 2 : 2 - m * 2;
}

function startRun() {
  G.screen = 'play';
  G.score = 0; G.streak = 0; G.clears = 0;
  nextJump();
}

function nextJump() {
  G.x = START_X; G.h = 0; G.jump = null; G.outcome = null;
  G.manMood = 'idle';
  setPhase('speed');
}

// ---------- buttons (logical coords) ----------
const CARDS = CHARACTERS.map((ch, i) => ({ x: 52 + i * 220, y: 120, w: 196, h: 330, ch }));
// Game-over and initials panels sit on the right so Bob stays visible.
const SIDE = { x: 668, w: 272, cx: 668 + 136 };
const BTN_RETRY = { x: SIDE.x + 20, y: 300, w: SIDE.w - 40, h: 60 };
const BTN_CHARS = { x: SIDE.x + 30, y: 380, w: SIDE.w - 60, h: 46 };
const INIT_X = [SIDE.cx - 80, SIDE.cx, SIDE.cx + 80];
const BTN_UP = INIT_X.map(x => ({ x: x - 33, y: 150, w: 66, h: 52 }));
const BTN_DOWN = INIT_X.map(x => ({ x: x - 33, y: 292, w: 66, h: 52 }));
const BTN_OK = { x: SIDE.cx - 80, y: 392, w: 160, h: 56 };
const BLANK = ' ';
const inside = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

// ---------- input ----------
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / scale - view.offset, y: (e.clientY - r.top) / scale };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlock();
  tryLockLandscape();
  onTap(toLogical(e));
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); unlock(); onTap({ x: W / 2, y: H / 2, key: true }); }
});

function onTap(p) {
  switch (G.screen) {
    case 'title':
      sfx.tap();
      G.screen = 'select';
      return;
    case 'select': {
      const card = CARDS.find(c => inside(p, c));
      if (card) { sfx.tap(); G.char = card.ch; startRun(); }
      return;
    }
    case 'play': return onPlayTap();
    case 'initials': return onInitialsTap(p);
    case 'over':
      if (p.key || inside(p, BTN_RETRY)) { sfx.tap(); startRun(); }
      else if (inside(p, BTN_CHARS)) { sfx.tap(); G.screen = 'select'; }
      return;
  }
}

function onPlayTap() {
  if (G.phase === 'speed') {
    G.speed01 = G.forced ? G.forced.s : tri(G.t / SPEED_METER_PERIOD);
    sfx.tap();
    setPhase('angle');
  } else if (G.phase === 'angle') {
    G.angle01 = G.forced ? G.forced.a : tri(G.t / ANGLE_METER_PERIOD);
    sfx.tap();
    setPhase('run');
  } else if (G.phase === 'result' && G.outcome === 'clear' && G.t > 0.35) {
    nextJump();
  }
}

function onInitialsTap(p) {
  for (let i = 0; i < 3; i++) {
    if (inside(p, BTN_UP[i])) { G.initials[i] = shiftLetter(G.initials[i], 1); sfx.tap(); return; }
    if (inside(p, BTN_DOWN[i])) { G.initials[i] = shiftLetter(G.initials[i], -1); sfx.tap(); return; }
  }
  if (inside(p, BTN_OK)) {
    sfx.tap();
    const ini = G.initials.join('');
    try { localStorage.setItem('hallwayJump.lastInitials', ini); } catch { /* ignore */ }
    submitScore(G.score, ini).then(h => { G.high = h; G.screen = 'over'; });
  }
}

// Cycle: blank, A..Z, blank, ...  (▼ from A gives a blank)
const LETTERS = BLANK + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function shiftLetter(c, d) {
  const i = Math.max(0, LETTERS.indexOf(c));
  return LETTERS[(i + d + LETTERS.length) % LETTERS.length];
}

// ---------- update ----------
const FIXED = 1 / 120;

photobomb.setSnapHandler(() => sfx.shutter());

function update(dt) {
  G.t += dt;
  G.clock += dt;
  photobomb.update(dt);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
  if (G.screen !== 'play') return;

  const body = bodyOf(G.char);

  if (G.phase === 'run') {
    // run-up: slower is easier to watch; faster speed = quicker steps
    const runSpeed = 170 + 380 * G.speed01;
    G.x += runSpeed * dt;
    const stepTime = 0.17 - 0.07 * G.speed01;   // seconds each run frame shows
    G.legPhase += dt * Math.PI / stepTime;
    if (G.x >= TAKEOFF_X) {
      G.x = TAKEOFF_X;
      G.jump = launch(G.char, G.speed01, G.angle01);
      G.manMood = 'worried';
      sfx.jump();
      setPhase('air');
    }
  } else if (G.phase === 'air') {
    const ev = step(G.jump, dt);
    G.x = G.jump.x; G.h = G.jump.h;
    if (ev.includes('ceiling') || ev.includes('wall')) { sfx.bonk(); G.shake = 0.25; }
    if (G.jump.done) land(G.jump.outcome);
  } else if (G.phase === 'stumble') {
    // landed short: stumble forward until we bump into him
    G.x += 170 * dt;
    G.legPhase += dt * 9;
    if (G.x + body.halfW >= MAN.start) stomp();
  } else if (G.phase === 'result') {
    if (G.outcome === 'stomp' && G.stompFrom) {
      // slide onto the fixed stomp spot (quick, so it reads as one motion)
      const k = Math.min(1, G.t / 0.12);
      const e = 1 - (1 - k) * (1 - k);
      const to = stompSpotFor(G.char);
      G.x = G.stompFrom.x + (to.x - G.stompFrom.x) * e;
      G.h = G.stompFrom.h + (to.h - G.stompFrom.h) * e;
    }
    if (G.outcome === 'clear' && G.t > 1.5) nextJump();
    if (G.outcome !== 'clear' && G.t > 1.6) endRun();
  }
}

function land(outcome) {
  sfx.land();
  if (outcome === 'clear') {
    G.streak += 1;
    G.clears += 1;
    G.lastPoints = POINTS_PER_CLEAR + (G.streak > 1 ? STREAK_BONUS : 0);
    G.score += G.lastPoints;
    G.outcome = 'clear';
    G.manMood = 'relieved';
    sfx.clear();
    if (PHOTOBOMB.onClear) photobomb.randomPeek();
    setPhase('result');
  } else if (outcome === 'stomp') {
    stomp();
  } else if (outcome === 'short') {
    G.outcome = 'short';
    setPhase('stumble');
  } else if (outcome === 'wall') {
    G.outcome = 'wall';
    G.streak = 0;
    G.manMood = 'relieved';
    setPhase('result');
  }
}

function stomp() {
  G.outcome = 'stomp';
  // always end up on the same spot on Bob (see MAN.stompSpot in config.js)
  G.stompFrom = { x: G.x, h: G.h };
  G.streak = 0;
  G.manMood = 'ouch';
  G.shake = 0.45;
  sfx.yell();
  if (navigator.vibrate) navigator.vibrate([80, 40, 160]);
  setPhase('result');
}

function endRun() {
  if (G.score > 0 && G.score > G.high.score) {
    G.screen = 'initials';
    sfx.highScore();
    if (PHOTOBOMB.onHighScore) photobomb.sequence(PHOTOBOMB.highScoreSides);
  } else {
    G.screen = 'over';
  }
}

// ---------- render ----------
function render() {
  ctx.save();
  if (G.shake > 0) {
    const m = G.shake * 18;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawHallway(ctx);

  if (G.screen === 'title') renderTitle();
  else if (G.screen === 'select') renderSelect();
  else {
    renderPlay();
    if (G.screen === 'initials') renderInitials();
    if (G.screen === 'over') renderOver();
  }
  ctx.restore();
  photobomb.draw(ctx, view);   // on top of everything, not shaken
}

function renderHighLine(y, size = 22) {
  const hs = G.high.score > 0 ? `HIGH SCORE  ${G.high.score}  ${G.high.initials}` : 'HIGH SCORE  —  be the first!';
  text(ctx, hs, W / 2, y, { size, color: '#ffe066', stroke: '#1a1a3a', strokeW: 6 });
}

function renderTitle() {
  drawFloorMan(ctx, 'idle', G.clock);
  drawJumper(ctx, CHARACTERS[1], 200, FLOOR_Y, 'stand');
  text(ctx, 'HALLWAY', W / 2, 150, { size: 84, color: '#ffcc00', stroke: '#1a1a3a', strokeW: 12, weight: '900' });
  text(ctx, 'JUMP', W / 2, 235, { size: 84, color: '#ffffff', stroke: '#1a1a3a', strokeW: 12, weight: '900' });
  renderHighLine(300);
  const pulse = 0.6 + 0.4 * Math.sin(G.clock * 5);
  ctx.globalAlpha = pulse;
  text(ctx, 'TAP TO START', W / 2, 360, { size: 34, color: '#fff', stroke: '#1a1a3a', strokeW: 8 });
  ctx.globalAlpha = 1;
}

function renderSelect() {
  ctx.fillStyle = 'rgba(10,20,50,0.55)';
  ctx.fillRect(view.left, 0, view.right - view.left, H);
  text(ctx, 'PICK YOUR JUMPER', W / 2, 60, { size: 44, color: '#fff', stroke: '#1a1a3a', strokeW: 10, weight: '900' });
  renderHighLine(100, 18);
  for (const c of CARDS) {
    panel(ctx, c.x, c.y, c.w, c.h);
    drawJumper(ctx, c.ch, c.x + c.w / 2, c.y + 200, 'stand', 0, 1.15);
    text(ctx, c.ch.name, c.x + c.w / 2, c.y + 238, { size: 28, color: '#fff', weight: '900' });
    statBar(ctx, c.x + 18, c.y + 278, c.w - 36, 'WEIGHT', (c.ch.weight - 0.7) / 0.6);
    statBar(ctx, c.x + 18, c.y + 304, c.w - 36, 'SIZE', (c.ch.size - 0.75) / 0.5);
  }
}

function renderPlay() {
  const body = bodyOf(G.char);
  const p = G.phase;

  drawFloorMan(ctx, G.manMood, G.clock);

  // jumper
  const footY = FLOOR_Y - G.h;
  let pose = 'stand';
  if (p === 'run' || p === 'stumble') pose = 'run';
  else if (p === 'air') pose = 'air';
  else if (p === 'result') {
    if (G.outcome === 'clear') pose = G.t < 0.3 ? 'land' : 'cheer';
    else if (G.outcome === 'stomp') pose = 'oops';
    else pose = 'land';
  }
  drawJumper(ctx, G.char, G.x, footY, pose, G.legPhase);

  // meters
  const live = p === 'speed' || p === 'angle';
  const sv = p === 'speed' ? tri(G.t / SPEED_METER_PERIOD) : G.speed01;
  const av = p === 'angle' ? tri(G.t / ANGLE_METER_PERIOD) : (p === 'speed' ? 0 : G.angle01);
  if (live || p === 'run') {
    drawSpeedMeter(ctx, sv, { active: p === 'speed', locked: p !== 'speed' });
    drawAngleMeter(ctx, av, { active: p === 'angle', locked: p === 'run' });
    if (p !== 'speed') drawAngleArrow(ctx, angleFromMeter(av));
  }
  if (p === 'speed') text(ctx, 'TAP to lock SPEED', W / 2, 108, { size: 26, color: '#fff', stroke: '#1a1a3a', strokeW: 7 });
  if (p === 'angle') text(ctx, 'TAP to lock ANGLE', W / 2, 108, { size: 26, color: '#fff', stroke: '#1a1a3a', strokeW: 7 });

  // HUD
  text(ctx, `SCORE ${G.score}`, view.left + view.padL + 18, 30, { size: 24, color: '#fff', align: 'left', stroke: '#1a1a3a', strokeW: 6 });
  if (G.streak > 1) text(ctx, `STREAK x${G.streak}`, view.left + view.padL + 18, 60, { size: 20, color: '#ffcc00', align: 'left', stroke: '#1a1a3a', strokeW: 5 });
  if (!live && p !== 'run') {
    const hs = G.high.score > 0 ? `HI SCORE ${G.high.score} ${G.high.initials}` : 'HI SCORE —';
    text(ctx, hs, view.right - view.padR - 18, 30, { size: 22, color: '#ffe066', align: 'right', stroke: '#1a1a3a', strokeW: 6 });
  }

  // results
  if (p === 'result') {
    if (G.outcome === 'clear') {
      const rise = Math.min(1, G.t * 3);
      text(ctx, 'CLEARED!', W / 2, 66 - rise * 12, { size: 56, color: '#4cd964', stroke: '#0d2a12', strokeW: 10, weight: '900' });
      const bonus = G.streak > 1 ? `  (+${STREAK_BONUS} streak bonus)` : '';
      text(ctx, `+${G.lastPoints}${bonus}`, W / 2, 108, { size: 26, color: '#fff', stroke: '#1a1a3a', strokeW: 6 });
      if (G.t > 0.35) text(ctx, 'tap for next jump', W / 2, 140, { size: 20, color: '#fff', stroke: '#1a1a3a', strokeW: 5 });
    } else if (G.outcome === 'stomp') {
      // Below the picture frames, left of the jumper; tail points right at Bob.
      // Use \n to split the text onto two lines.
      speechBubble(ctx, MAN.start - 190, FLOOR_Y - 84, 'OWW!\nYa stepped on my bird!', 30, 'right');
    } else if (G.outcome === 'wall') {
      text(ctx, 'BONK!', W / 2, 58, { size: 64, color: '#ff3b30', stroke: '#2a0d0d', strokeW: 10, weight: '900' });
      text(ctx, 'DOH! — hit the wall', W / 2, 112, { size: 24, color: '#fff', stroke: '#1a1a3a', strokeW: 6 });
    }
  }
}

function renderInitials() {
  panel(ctx, SIDE.x, 40, SIDE.w, 430, 0.62);
  const flash = Math.sin(G.clock * 8) > 0 ? '#ffcc00' : '#ff8a00';
  text(ctx, 'NEW HIGH SCORE!', SIDE.cx, 80, { size: 25, color: flash, weight: '900', stroke: '#0c1430', strokeW: 5 });
  text(ctx, `${G.score}`, SIDE.cx, 120, { size: 32, color: '#fff', weight: '900', stroke: '#0c1430', strokeW: 5 });
  for (let i = 0; i < 3; i++) {
    button(ctx, BTN_UP[i], '▲', { color: '#4a6cf7', textColor: '#fff', size: 24 });
    ctx.fillStyle = 'rgba(12,20,48,0.85)';
    ctx.beginPath(); ctx.roundRect(INIT_X[i] - 33, 212, 66, 72, 12); ctx.fill();
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3; ctx.stroke();
    if (G.initials[i] === BLANK) text(ctx, '_', INIT_X[i], 250, { size: 44, color: 'rgba(255,255,255,0.35)', weight: '900' });
    else text(ctx, G.initials[i], INIT_X[i], 250, { size: 46, color: '#fff', weight: '900' });
    button(ctx, BTN_DOWN[i], '▼', { color: '#4a6cf7', textColor: '#fff', size: 24 });
  }
  text(ctx, '_ = blank (press ▼ on A)', SIDE.cx, 366, { size: 14, color: '#cfd8ff', weight: '700' });
  button(ctx, BTN_OK, 'SAVE');
}

function renderOver() {
  panel(ctx, SIDE.x, 60, SIDE.w, 410, 0.62);
  const head = G.outcome === 'wall' ? 'BONK!' : 'OWW!';
  const sh = { stroke: '#0c1430', strokeW: 5 };
  text(ctx, head, SIDE.cx, 105, { size: 42, color: '#ff4d4d', weight: '900', ...sh });
  text(ctx, `SCORE  ${G.score}`, SIDE.cx, 158, { size: 30, color: '#fff', weight: '900', ...sh });
  text(ctx, `${G.clears} clean jump${G.clears === 1 ? '' : 's'}`, SIDE.cx, 193, { size: 18, color: '#cfd8ff', weight: '700', ...sh });
  text(ctx, 'HIGH SCORE', SIDE.cx, 232, { size: 17, color: '#ffe066', weight: '800', ...sh });
  const hs = G.high.score > 0 ? `${G.high.score}  ${G.high.initials}` : '—';
  text(ctx, hs, SIDE.cx, 262, { size: 26, color: '#ffe066', weight: '900', ...sh });
  button(ctx, BTN_RETRY, 'TRY AGAIN', { size: 28 });
  button(ctx, BTN_CHARS, 'CHANGE JUMPER', { color: '#cfd8ff', size: 18 });
}

// ---------- main loop ----------
let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= FIXED) { update(FIXED); acc -= FIXED; }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test/debug hook (harmless in production).
window.__hj = {
  get state() { return { screen: G.screen, phase: G.phase, outcome: G.outcome, score: G.score, streak: G.streak, high: G.high }; },
  force(s, a) { G.forced = s == null ? null : { s, a }; },
  photobomb,
};
