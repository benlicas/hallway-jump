// Mom's photobomb: she peeks in from the edge of the screen, snaps a
// picture (shutter sound + white flash), and ducks back out.
// Settings live in PHOTOBOMB in config.js.

import { W, H, PHOTOBOMB } from './config.js';

const img = new Image();
img.src = PHOTOBOMB.src;

const IN = 0.28, HOLD = 0.6, OUT = 0.28;   // seconds
const SNAP_AT = IN + 0.12;                 // when the shutter fires
const TOTAL = IN + HOLD + OUT;

const peeks = [];        // { side, t } — t < 0 means "waiting to start"
let flash = 0;           // white flash strength 0..1
let onSnap = () => {};

export function setSnapHandler(fn) { onSnap = fn; }

// One peek from a side ('left' | 'right' | 'top' | 'bottom'), optionally delayed.
export function peek(side, delay = 0) {
  peeks.push({ side, t: -delay, snapped: false });
}

// Several peeks one after another.
export function sequence(sides, gap = PHOTOBOMB.sequenceGap) {
  sides.forEach((s, i) => peek(s, i * gap));
}

export function randomPeek() {
  const sides = PHOTOBOMB.clearSides;
  peek(sides[Math.floor(Math.random() * sides.length)]);
}

export function update(dt) {
  flash = Math.max(0, flash - dt / 0.3);
  for (const p of peeks) {
    p.t += dt;
    if (!p.snapped && p.t >= SNAP_AT) {
      p.snapped = true;
      flash = 1;
      onSnap();
    }
  }
  for (let i = peeks.length - 1; i >= 0; i--) if (peeks[i].t >= TOTAL) peeks.splice(i, 1);
}

function progress(t) {           // 0 = hidden, 1 = fully peeking in
  if (t < 0) return 0;
  if (t < IN) return easeOut(t / IN);
  if (t < IN + HOLD) return 1;
  return 1 - easeIn((t - IN - HOLD) / OUT);
}
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;

// view = { left, right } visible x-range of the stage
export function draw(ctx, view) {
  const ready = img.complete && img.naturalWidth > 0;
  if (ready) {
    const hd = PHOTOBOMB.height;
    const wd = hd * img.naturalWidth / img.naturalHeight;
    const vis = hd * PHOTOBOMB.peekAmount;
    const P = PHOTOBOMB.positions;
    for (const p of peeks) {
      const k = progress(p.t);
      if (k <= 0) continue;
      ctx.save();
      // Move to the screen edge and turn so "up" in the picture points into the screen.
      if (p.side === 'bottom') { ctx.translate(P.bottomX, H); }
      else if (p.side === 'top') { ctx.translate(P.topX, 0); ctx.rotate(Math.PI); }
      else if (p.side === 'left') { ctx.translate(view.left, P.sideY); ctx.rotate(Math.PI / 2); }
      else { ctx.translate(view.right, P.sideY); ctx.rotate(-Math.PI / 2); }
      ctx.drawImage(img, -wd / 2, -vis * k, wd, hd);
      ctx.restore();
    }
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * flash})`;
    ctx.fillRect(view.left, 0, view.right - view.left, H);
  }
}

export function busy() { return peeks.length > 0; }
