// All the drawing. Placeholder cartoon art made from simple shapes,
// to be swapped for the AI-cartoonified character images later.

import { W, H, VIEW_EXTRA, FLOOR_Y, CEILING_Y, TAKEOFF_X, WALL_X, MAN, MAN_SPRITES, FLOOR_MAN, WALL_PHOTOS, bodyOf } from './config.js';

// ---------- helpers ----------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function text(ctx, str, x, y, { size = 24, color = '#222', align = 'center', weight = '800', stroke = null, strokeW = 6, baseline = 'middle' } = {}) {
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Arial Rounded MT Bold", system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// ---------- hallway ----------
let carpetPattern = null;
function getCarpet(ctx) {
  if (carpetPattern) return carpetPattern;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#2d5fb8';
  g.fillRect(0, 0, 64, 64);
  // speckled carpet texture (fixed seed so it doesn't shimmer)
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(20,50,120,0.55)' : 'rgba(90,140,230,0.45)';
    g.fillRect(Math.floor(rnd() * 64), Math.floor(rnd() * 64), 2, 2);
  }
  carpetPattern = ctx.createPattern(c, 'repeat');
  return carpetPattern;
}

function door(ctx, x, w) {
  const top = 150, bottom = FLOOR_Y - 10;
  // frame
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 8, top - 8, w + 16, bottom - top + 8);
  ctx.strokeStyle = '#d9d9d2';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 8, top - 8, w + 16, bottom - top + 8);
  // door slab
  ctx.fillStyle = '#f7f7f3';
  ctx.fillRect(x, top, w, bottom - top);
  ctx.strokeStyle = '#d0d0c8';
  ctx.strokeRect(x, top, w, bottom - top);
  // panels
  ctx.strokeStyle = '#dcdcd4';
  ctx.strokeRect(x + 12, top + 14, w - 24, 110);
  ctx.strokeRect(x + 12, top + 140, w - 24, bottom - top - 160);
  // knob
  ctx.fillStyle = '#c9a54a';
  ctx.beginPath(); ctx.arc(x + w - 14, top + 150, 6, 0, Math.PI * 2); ctx.fill();
}

// Wall photos (loaded once).
const photoImgs = WALL_PHOTOS.map(p => { const img = new Image(); img.src = p.src; return img; });

// Picture frame: wood border + thin white mat + photo (w/h = photo size).
function frame(ctx, x, y, w, h, img) {
  const border = 6, mat = 3, fw = w + 2 * (border + mat), fh = h + 2 * (border + mat);
  // soft shadow on the wall
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x + 3, y + 4, fw, fh);
  ctx.fillStyle = '#6b4f35';
  ctx.fillRect(x, y, fw, fh);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(x + 1, y + 1, fw - 2, 2);
  ctx.fillStyle = '#fdfaf0';
  ctx.fillRect(x + border, y + border, fw - 2 * border, fh - 2 * border);
  const px = x + border + mat, py = y + border + mat;
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, px, py, w, h);
    // a little glass glare
    const g = ctx.createLinearGradient(px, py, px + w, py + h);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.35, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, w, h);
  } else {
    ctx.fillStyle = '#d8d8d0';
    ctx.fillRect(px, py, w, h);
  }
}

export function drawHallway(ctx, { showTakeoff = true } = {}) {
  // ceiling
  ctx.fillStyle = '#ecebe6';
  ctx.fillRect(-VIEW_EXTRA, 0, W + 2 * VIEW_EXTRA, CEILING_Y);
  // ceiling light
  ctx.fillStyle = '#ffffff';
  rr(ctx, 440, CEILING_Y - 22, 80, 18, 9); ctx.fill();
  ctx.strokeStyle = '#d5d5cf'; ctx.lineWidth = 2; ctx.stroke();
  const glow = ctx.createRadialGradient(480, CEILING_Y, 5, 480, CEILING_Y + 40, 260);
  glow.addColorStop(0, 'rgba(255,250,225,0.55)');
  glow.addColorStop(1, 'rgba(255,250,225,0)');

  // white wall
  const wall = ctx.createLinearGradient(0, CEILING_Y, 0, FLOOR_Y);
  wall.addColorStop(0, '#fbfbf8');
  wall.addColorStop(1, '#efefea');
  ctx.fillStyle = wall;
  ctx.fillRect(-VIEW_EXTRA, CEILING_Y, W + 2 * VIEW_EXTRA, FLOOR_Y - CEILING_Y);
  ctx.fillStyle = glow;
  ctx.fillRect(-VIEW_EXTRA, CEILING_Y, W + 2 * VIEW_EXTRA, FLOOR_Y - CEILING_Y);

  // crown molding
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-VIEW_EXTRA, CEILING_Y - 6, W + 2 * VIEW_EXTRA, 12);
  ctx.fillStyle = '#dcdcd5';
  ctx.fillRect(-VIEW_EXTRA, CEILING_Y + 6, W + 2 * VIEW_EXTRA, 2);

  // doors + pictures
  door(ctx, 150, 90);
  door(ctx, 720, 90);
  WALL_PHOTOS.forEach((p, i) => frame(ctx, p.x, p.y, p.w, p.h, photoImgs[i]));

  // light switch
  ctx.fillStyle = '#fff'; rr(ctx, 262, 270, 16, 26, 3); ctx.fill();
  ctx.strokeStyle = '#d2d2ca'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#e4e4dc'; ctx.fillRect(267, 278, 6, 10);

  // end-of-hallway wall
  ctx.fillStyle = '#e3e3dc';
  ctx.fillRect(WALL_X, CEILING_Y, W + VIEW_EXTRA - WALL_X, FLOOR_Y - CEILING_Y);
  ctx.fillStyle = '#d6d6cf';
  ctx.fillRect(WALL_X, CEILING_Y, 3, FLOOR_Y - CEILING_Y);

  // baseboard
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-VIEW_EXTRA, FLOOR_Y - 14, W + 2 * VIEW_EXTRA, 14);
  ctx.fillStyle = '#d8d8d0';
  ctx.fillRect(-VIEW_EXTRA, FLOOR_Y - 14, W + 2 * VIEW_EXTRA, 2);

  // blue carpet
  ctx.fillStyle = getCarpet(ctx);
  ctx.fillRect(-VIEW_EXTRA, FLOOR_Y, W + 2 * VIEW_EXTRA, H - FLOOR_Y);
  const shade = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
  shade.addColorStop(0, 'rgba(0,0,40,0.25)');
  shade.addColorStop(0.2, 'rgba(0,0,40,0)');
  shade.addColorStop(1, 'rgba(0,0,40,0.15)');
  ctx.fillStyle = shade;
  ctx.fillRect(-VIEW_EXTRA, FLOOR_Y, W + 2 * VIEW_EXTRA, H - FLOOR_Y);

  // takeoff tape line
  if (showTakeoff) {
    ctx.fillStyle = '#f5d76e';
    ctx.save();
    ctx.translate(TAKEOFF_X, FLOOR_Y + 2);
    ctx.transform(1, 0, -0.35, 1, 0, 0);
    ctx.fillRect(-4, 0, 8, 34);
    ctx.restore();
  }
}

// ---------- the man on the floor ----------
// Bob's sprites (dad_chill / dad_oww). Falls back to shape drawing until loaded.
const manImgs = {};
for (const [key, s] of Object.entries(MAN_SPRITES)) {
  const img = new Image();
  img.src = s.src;
  manImgs[key] = img;
}
const ready = (img) => img && img.complete && img.naturalWidth > 0;

// mood: 'idle' | 'worried' | 'ouch' | 'relieved'
export function drawFloorMan(ctx, mood = 'idle', t = 0) {
  const key = mood === 'ouch' ? 'oww' : 'chill';
  const img = manImgs[key];
  if (ready(img)) {
    const s = MAN_SPRITES[key];
    const shake = mood === 'ouch' ? Math.sin(t * 60) * 2 : 0;
    // tiny nervous wobble while someone's flying at him
    const wobble = mood === 'worried' ? Math.sin(t * 40) * 0.8 : 0;
    ctx.fillStyle = 'rgba(0,0,30,0.25)';
    ctx.beginPath();
    ctx.ellipse((MAN.start + MAN.end) / 2, FLOOR_Y + 3, (MAN.end - MAN.start) / 2 + 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(img, MAN.start + s.dx + shake + wobble, FLOOR_Y - s.h + 2, s.w, s.h);
    return;
  }
  drawFloorManShapes(ctx, mood, t);
}

function drawFloorManShapes(ctx, mood, t) {
  const c = FLOOR_MAN;
  const y = FLOOR_Y;            // floor line
  const headX = MAN.start + 17;
  const headY = y - 17;
  const shake = mood === 'ouch' ? Math.sin(t * 60) * 2 : 0;

  ctx.save();
  ctx.translate(shake, 0);

  // shadow
  ctx.fillStyle = 'rgba(0,0,30,0.25)';
  ctx.beginPath(); ctx.ellipse((MAN.start + MAN.end) / 2, y + 4, (MAN.end - MAN.start) / 2 + 6, 6, 0, 0, Math.PI * 2); ctx.fill();

  // legs (pants)
  ctx.fillStyle = c.pants;
  rr(ctx, MAN.start + 100, y - 24, 70, 22, 8); ctx.fill();
  // shoes pointing up
  ctx.fillStyle = c.shoes;
  rr(ctx, MAN.end - 14, y - 36, 14, 34, 6); ctx.fill();

  // torso (shirt)
  ctx.fillStyle = c.shirt;
  rr(ctx, MAN.start + 30, y - 30, 78, 28, 12); ctx.fill();
  // belly bump
  ctx.beginPath(); ctx.ellipse(MAN.start + 75, y - 28, 26, 8, 0, Math.PI, 0); ctx.fill();
  // belt
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(MAN.start + 102, y - 27, 6, 25);

  // arm resting on chest
  ctx.strokeStyle = c.skin;
  ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'ouch') { ctx.moveTo(MAN.start + 45, y - 26); ctx.lineTo(MAN.start + 40, y - 58); }
  else { ctx.moveTo(MAN.start + 45, y - 26); ctx.lineTo(MAN.start + 80, y - 32); }
  ctx.stroke();

  // head
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(headX, headY, 17, 0, Math.PI * 2); ctx.fill();
  // hair (on the floor side / back of head)
  ctx.fillStyle = c.hair;
  ctx.beginPath(); ctx.arc(headX - 3, headY + 2, 17, Math.PI * 0.55, Math.PI * 1.35); ctx.fill();

  // face: he's looking up at the ceiling
  ctx.fillStyle = '#222';
  if (mood === 'ouch') {
    // squeezed eyes
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(headX + 1, headY - 12); ctx.lineTo(headX + 7, headY - 9); ctx.lineTo(headX + 1, headY - 6); ctx.stroke();
    // big O mouth
    ctx.fillStyle = '#6b1b1b';
    ctx.beginPath(); ctx.ellipse(headX + 10, headY + 2, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    const look = mood === 'worried' ? -2 : 0;
    ctx.beginPath(); ctx.arc(headX + 4 + look, headY - 9, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (mood === 'worried') { ctx.moveTo(headX + 9, headY + 1); ctx.lineTo(headX + 13, headY + 5); }
    else { ctx.arc(headX + 8, headY + 2, 5, -0.6, 0.9); }
    ctx.stroke();
  }
  // nose
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.arc(headX + 15, headY - 3, 4, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ---------- a jumper ----------
// Sprite-based jumpers (characters with a `sprites` entry in config.js).
const spriteCache = {};
function spriteImgs(ch) {
  if (!spriteCache[ch.id]) {
    const imgs = {};
    for (const name of Object.keys(ch.sprites.poses)) {
      const img = new Image();
      img.src = `${ch.sprites.dir}/${name}.png`;
      imgs[name] = img;
    }
    spriteCache[ch.id] = imgs;
  }
  return spriteCache[ch.id];
}

const POSE_TO_SPRITE = { stand: 'stand', air: 'air', land: 'stand', cheer: 'cheer', oops: 'oops' };

function drawJumperSprite(ctx, ch, x, footY, pose, phase, scale) {
  const imgs = spriteImgs(ch);
  let name = pose === 'run' ? (Math.sin(phase) > 0 ? 'run1' : 'run2') : (POSE_TO_SPRITE[pose] || 'stand');
  const img = imgs[name];
  if (!ready(img)) return false;
  const p = ch.sprites.poses[name];
  const k = (bodyOf(ch).height * scale) / ch.sprites.standH;
  const kx = k * (ch.spriteWidth || 1);   // optional wider/narrower look
  // small bounce while running
  const bob = pose === 'run' ? Math.abs(Math.sin(phase)) * 2 * scale : 0;

  // shadow on the floor
  if (footY <= FLOOR_Y + 1) {
    const lift = Math.max(0, FLOOR_Y - footY);
    const a = Math.max(0.05, 0.28 - lift / 900);
    ctx.fillStyle = `rgba(0,0,30,${a})`;
    ctx.beginPath(); ctx.ellipse(x, FLOOR_Y + 3, bodyOf(ch).halfW * 1.8 * scale * (ch.spriteWidth || 1), 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.drawImage(img, x - p.ax * kx, footY - p.h * k - bob + 2 * scale, p.w * kx, p.h * k);
  return true;
}

// pose: 'stand' | 'run' | 'air' | 'land' | 'oops' | 'cheer'
export function drawJumper(ctx, ch, x, footY, pose = 'stand', phase = 0, scale = 1) {
  if (ch.sprites && drawJumperSprite(ctx, ch, x, footY, pose, phase, scale)) return;
  drawJumperShapes(ctx, ch, x, footY, pose, phase, scale);
}

function drawJumperShapes(ctx, ch, x, footY, pose, phase, scale) {
  const b = bodyOf(ch);
  const Hh = b.height * scale;
  const girth = Math.sqrt(ch.weight);
  const legLen = Hh * 0.42;
  const torsoLen = Hh * 0.33;
  const headR = Hh * 0.12;
  const torsoW = 26 * ch.size * girth * scale;
  const hipY = footY - legLen;
  const shoulderY = hipY - torsoLen;
  const headY = shoulderY - headR * 1.05;
  const lw = 9 * ch.size * scale;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // shadow on the floor
  if (footY <= FLOOR_Y + 1) {
    const lift = Math.max(0, FLOOR_Y - footY);
    const a = Math.max(0.05, 0.28 - lift / 900);
    ctx.fillStyle = `rgba(0,0,30,${a})`;
    ctx.beginPath(); ctx.ellipse(x, FLOOR_Y + 3, b.halfW * 1.6 * scale, 5, 0, 0, Math.PI * 2); ctx.fill();
  }

  // legs
  let l1, l2; // [kneeDX, kneeDY, footDX, footDY] relative to hip
  const s = Math.sin(phase), c2 = Math.cos(phase);
  if (pose === 'run') {
    l1 = [s * legLen * 0.35, legLen * 0.5, s * legLen * 0.55, legLen * (0.95 - Math.max(0, c2) * 0.15)];
    l2 = [-s * legLen * 0.35, legLen * 0.5, -s * legLen * 0.55, legLen * (0.95 - Math.max(0, -c2) * 0.15)];
  } else if (pose === 'air') {
    l1 = [legLen * 0.45, legLen * 0.25, legLen * 0.75, legLen * 0.5];
    l2 = [legLen * 0.3, legLen * 0.35, legLen * 0.65, legLen * 0.6];
  } else if (pose === 'land') {
    l1 = [legLen * 0.35, legLen * 0.45, legLen * 0.15, legLen * 0.85];
    l2 = [legLen * 0.25, legLen * 0.5, -legLen * 0.1, legLen * 0.85];
  } else {
    l1 = [legLen * 0.08, legLen * 0.5, legLen * 0.12, legLen];
    l2 = [-legLen * 0.08, legLen * 0.5, -legLen * 0.12, legLen];
  }
  const hipDrop = pose === 'land' ? legLen * 0.15 : 0;
  ctx.strokeStyle = ch.pants;
  ctx.lineWidth = lw;
  for (const l of [l2, l1]) {
    ctx.beginPath();
    ctx.moveTo(x, hipY + hipDrop);
    ctx.lineTo(x + l[0], hipY + hipDrop + l[1]);
    ctx.lineTo(x + l[2], hipY + hipDrop + l[3]);
    ctx.stroke();
    // shoe
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.ellipse(x + l[2] + lw * 0.5, hipY + hipDrop + l[3], lw * 0.9, lw * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  // torso
  const lean = pose === 'run' ? 0.18 : pose === 'air' ? 0.12 : pose === 'land' ? 0.25 : 0;
  ctx.save();
  ctx.translate(x, hipY + hipDrop);
  ctx.rotate(lean);
  ctx.fillStyle = ch.shirt;
  rr(ctx, -torsoW / 2, -torsoLen - 4, torsoW, torsoLen + 8, torsoW * 0.4); ctx.fill();

  // arms
  ctx.strokeStyle = ch.skin;
  ctx.lineWidth = lw * 0.8;
  const sh = -torsoLen + 6;
  const armLen = torsoLen * 0.95;
  let a1, a2;
  if (pose === 'run') { a1 = [-s * armLen * 0.7, armLen * 0.6]; a2 = [s * armLen * 0.7, armLen * 0.6]; }
  else if (pose === 'air') { a1 = [armLen * 0.4, -armLen * 0.8]; a2 = [armLen * 0.7, -armLen * 0.5]; }
  else if (pose === 'oops') { a1 = [-armLen * 0.7, -armLen * 0.7]; a2 = [armLen * 0.7, -armLen * 0.7]; }
  else if (pose === 'cheer') { a1 = [-armLen * 0.3, -armLen * 0.95]; a2 = [armLen * 0.3, -armLen * 0.95]; }
  else if (pose === 'land') { a1 = [armLen * 0.8, armLen * 0.2]; a2 = [armLen * 0.6, armLen * 0.35]; }
  else { a1 = [-armLen * 0.2, armLen * 0.9]; a2 = [armLen * 0.2, armLen * 0.9]; }
  const ax = [-torsoW * 0.42, torsoW * 0.42];
  [a1, a2].forEach((a, i) => {
    ctx.beginPath(); ctx.moveTo(ax[i], sh); ctx.lineTo(ax[i] + a[0], sh + a[1]); ctx.stroke();
  });

  // head
  const hy = -torsoLen - headR * 1.05 - 4;
  ctx.fillStyle = ch.skin;
  ctx.beginPath(); ctx.arc(0, hy, headR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ch.hair;
  ctx.beginPath(); ctx.arc(0, hy - 2, headR, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.fillRect(-headR, hy - 4, headR * 0.5, headR * 0.6);
  // face (facing right)
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(headR * 0.4, hy - headR * 0.15, headR * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath();
  if (pose === 'oops') { ctx.arc(headR * 0.45, hy + headR * 0.45, headR * 0.18, 0, Math.PI * 2); }
  else { ctx.arc(headR * 0.35, hy + headR * 0.3, headR * 0.3, 0.2, 1.4); }
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ---------- meters ----------
export const SPEED_BAR = { x: 280, y: 22, w: 400, h: 36 };
export const ANGLE_BAR = { x: 880, y: 120, w: 40, h: 300 };

export function drawSpeedMeter(ctx, value, { active, locked }) {
  const b = SPEED_BAR;
  ctx.save();
  ctx.globalAlpha = active || locked ? 1 : 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, b.x - 6, b.y - 6, b.w + 12, b.h + 12, 12); ctx.fill();
  const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
  g.addColorStop(0, '#4cd964'); g.addColorStop(0.55, '#ffd23f'); g.addColorStop(1, '#ff3b30');
  ctx.fillStyle = g;
  rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
  // ticks
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 1; i < 10; i++) ctx.fillRect(b.x + (b.w * i) / 10 - 1, b.y + b.h - 10, 2, 10);
  // needle
  const nx = b.x + b.w * value;
  ctx.fillStyle = locked ? '#ffffff' : '#111';
  ctx.strokeStyle = locked ? '#111' : '#fff';
  ctx.lineWidth = 2;
  rr(ctx, nx - 5, b.y - 10, 10, b.h + 20, 4); ctx.fill(); ctx.stroke();
  text(ctx, 'SPEED', b.x - 16, b.y + b.h / 2, { size: 20, color: '#fff', align: 'right', stroke: '#000', strokeW: 5 });
  ctx.restore();
}

export function drawAngleMeter(ctx, value, { active, locked }) {
  const b = ANGLE_BAR;
  ctx.save();
  ctx.globalAlpha = active || locked ? 1 : 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, b.x - 6, b.y - 6, b.w + 12, b.h + 12, 12); ctx.fill();
  const g = ctx.createLinearGradient(0, b.y + b.h, 0, b.y);
  g.addColorStop(0, '#5ac8fa'); g.addColorStop(0.5, '#af52de'); g.addColorStop(1, '#ff2d55');
  ctx.fillStyle = g;
  rr(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 1; i < 10; i++) ctx.fillRect(b.x, b.y + (b.h * i) / 10 - 1, 10, 2);
  const ny = b.y + b.h * (1 - value);
  ctx.fillStyle = locked ? '#ffffff' : '#111';
  ctx.strokeStyle = locked ? '#111' : '#fff';
  ctx.lineWidth = 2;
  rr(ctx, b.x - 10, ny - 5, b.w + 20, 10, 4); ctx.fill(); ctx.stroke();
  text(ctx, 'ANGLE', b.x + b.w / 2, b.y + b.h + 30, { size: 20, color: '#fff', stroke: '#000', strokeW: 5 });
  ctx.restore();
}

// Arrow at the takeoff line previewing the jump angle.
export function drawAngleArrow(ctx, deg) {
  const r = deg * Math.PI / 180;
  const x0 = TAKEOFF_X, y0 = FLOOR_Y - 4, len = 90;
  const x1 = x0 + Math.cos(r) * len, y1 = y0 - Math.sin(r) * len;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 5;
  ctx.setLineDash([10, 7]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1 + Math.cos(r) * 10, y1 - Math.sin(r) * 10);
  ctx.lineTo(x1 + Math.cos(r + 2.4) * 14, y1 - Math.sin(r + 2.4) * 14);
  ctx.lineTo(x1 + Math.cos(r - 2.4) * 14, y1 - Math.sin(r - 2.4) * 14);
  ctx.fill();
  text(ctx, `${Math.round(deg)}°`, x1 + 18, y1 - 10, { size: 18, color: '#fff', stroke: '#000', strokeW: 4, align: 'left' });
  ctx.restore();
}

// ---------- UI pieces ----------
// (x, y) = bubble's horizontal center and bottom edge.
// Text can have several lines separated by \n.
// tail: 'left' or 'right' = which way the pointer at the bottom leans.
export function speechBubble(ctx, x, y, str, size = 34, tail = 'right') {
  ctx.save();
  const lines = String(str).split('\n');
  ctx.font = `900 ${size}px "Trebuchet MS", system-ui, sans-serif`;
  const lineH = size * 1.15;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 40;
  const h = lineH * lines.length + 22;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 4;
  rr(ctx, x - w / 2, y - h, w, h, 18); ctx.fill(); ctx.stroke();
  // tail: base sits on the bubble's bottom edge, tip pokes down-left or down-right
  const dir = tail === 'right' ? 1 : -1;
  const bx = x + dir * w * 0.3;          // where the tail leaves the bubble
  const b0 = bx - 9 * dir, b1 = bx + 9 * dir;
  const tipX = bx + dir * 30, tipY = y + 24;
  ctx.beginPath();
  ctx.moveTo(b0, y - 2); ctx.lineTo(tipX, tipY); ctx.lineTo(b1, y - 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillRect(Math.min(b0, b1) + 1, y - 6, Math.abs(b1 - b0) - 2, 6);   // hide the seam
  const top = y - h + 11 + lineH / 2;
  lines.forEach((l, i) => text(ctx, l, x, top + i * lineH, { size, color: '#d0021b', weight: '900' }));
  ctx.restore();
}

export function panel(ctx, x, y, w, h, alpha = 0.88) {
  ctx.fillStyle = `rgba(15,25,55,${alpha})`;
  rr(ctx, x, y, w, h, 22); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function button(ctx, btn, label, { color = '#ffcc00', textColor = '#1a1a1a', size = 26 } = {}) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(ctx, btn.x, btn.y + 5, btn.w, btn.h, 14); ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 14); ctx.fill();
  text(ctx, label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1, { size, color: textColor, weight: '900' });
}

export function statBar(ctx, x, y, w, label, v) {
  text(ctx, label, x, y, { size: 14, color: '#cfd8ff', align: 'left', weight: '700' });
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  rr(ctx, x + 58, y - 6, w - 58, 12, 6); ctx.fill();
  ctx.fillStyle = '#ffcc00';
  rr(ctx, x + 58, y - 6, (w - 58) * v, 12, 6); ctx.fill();
}
