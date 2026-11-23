// Pure jump physics: no drawing, no DOM. Used by the game and by tests.
// Coordinates: x = screen x of the jumper's feet center, h = height of the
// feet above the floor (up is positive).

import {
  FLOOR_Y, CEILING_Y, TAKEOFF_X, WALL_X, MAN,
  GRAVITY, MAX_LAUNCH_SPEED, MIN_SPEED_FRACTION, ANGLE_MIN, ANGLE_MAX, bodyOf, manTopBetween,
} from './config.js';

export function angleFromMeter(a01) {
  return ANGLE_MIN + (ANGLE_MAX - ANGLE_MIN) * a01;
}

// speed01 / angle01 are the locked meter values (0..1).
export function launch(ch, speed01, angle01) {
  const body = bodyOf(ch);
  const s = MIN_SPEED_FRACTION + (1 - MIN_SPEED_FRACTION) * speed01;
  const v = MAX_LAUNCH_SPEED * s / Math.sqrt(ch.weight);
  const deg = angleFromMeter(angle01);
  const rad = deg * Math.PI / 180;
  return {
    x: TAKEOFF_X, h: 0,
    vx: v * Math.cos(rad), vy: v * Math.sin(rad),
    body, angleDeg: deg,
    hitCeiling: false, hitWall: false,
    done: false, outcome: null, // 'clear' | 'stomp' | 'short' | 'wall'
  };
}

// Advance one fixed step. Returns a list of event names that happened.
export function step(j, dt) {
  const events = [];
  if (j.done) return events;
  const { height, halfW } = j.body;
  const headroom = FLOOR_Y - CEILING_Y;

  j.vy -= GRAVITY * dt;
  j.x += j.vx * dt;
  j.h += j.vy * dt;

  // Ceiling bonk: lose most forward speed and drop.
  if (j.h + height >= headroom) {
    j.h = headroom - height;
    j.vy = -Math.abs(j.vy) * 0.1;
    j.vx *= 0.35;
    if (!j.hitCeiling) events.push('ceiling');
    j.hitCeiling = true;
  }

  // End wall bonk: bounce back a little.
  if (j.x + halfW >= WALL_X) {
    j.x = WALL_X - halfW;
    j.vx = -Math.abs(j.vx) * 0.25;
    if (!j.hitWall) events.push('wall');
    j.hitWall = true;
  }

  // Ran into / came down onto the man?
  const manTop = manTopBetween(j.x - halfW, j.x + halfW);
  if (manTop > 0 && j.h <= manTop) {
    j.h = manTop;
    j.done = true;
    j.outcome = 'stomp';
    events.push('land');
    return events;
  }

  // Landing on the carpet.
  if (j.h <= 0) {
    j.h = 0;
    j.done = true;
    if (j.x - halfW > MAN.end) j.outcome = j.hitWall ? 'wall' : 'clear';
    else j.outcome = 'short';
    events.push('land');
  }
  return events;
}

// Run a whole jump instantly (for tests / tuning).
export function simulate(ch, speed01, angle01, dt = 1 / 240) {
  const j = launch(ch, speed01, angle01);
  let t = 0;
  while (!j.done && t < 10) { step(j, dt); t += dt; }
  return j;
}
