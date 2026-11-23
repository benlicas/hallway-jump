// All tunable numbers live here. Adjust and reload.

// Logical game size (the canvas is scaled to fit the screen).
export const W = 960;
export const H = 540;
// On screens wider than 16:9 the hallway is drawn this much further on each
// side so the game fills the whole phone width (gameplay positions don't change).
export const VIEW_EXTRA = 340;

// Hallway layout (screen x / y in logical pixels).
export const FLOOR_Y = 450;        // top of the carpet
export const CEILING_Y = 90;       // bottom of the crown molding
export const START_X = 50;         // where the jumper starts the run-up
export const TAKEOFF_X = 330;      // tape line where the jump happens
export const WALL_X = 940;         // end-of-hallway wall

// The man lying on the floor (Bob).
export const MAN = {
  start: 460,   // left edge (his head)
  end: 660,     // right edge (his feet)
  // How tall he is (px above the carpet) across 10 equal slices from head to
  // feet, traced from dad_chill.png and shrunk ~15% so near-misses feel fair.
  // Landing on his head is higher than landing on his legs.
  profile: [72, 72, 65, 58, 57, 55, 59, 59, 21, 20],
  // Same idea for the "oww" pose (20 slices), used to settle the jumper onto
  // him after a stomp so they stand on his body, not float above it.
  owwProfile: [30, 37, 33, 35, 76, 76, 50, 48, 46, 44, 49, 58, 59, 24, 22, 20, 19, 20, 28, 15],

  // ★ STOMP SPOT ★ Where every jumper ends up standing after a failed jump
  // onto Bob, no matter where they hit him.
  //   x = screen position of the jumper's feet (bigger = further right).
  //       Bob runs from x 460 (head) to 660 (feet); 555 is about his belly.
  //   h = how high the feet are above the carpet (bigger = higher up).
  // Fine-tune per character with `stompOffset` in CHARACTERS below.
  stompSpot: { x: 538, h: 15 },
};

// Framed photos on the hallway wall. x/y = top-left of the frame,
// w/h = photo size inside the frame (the wood border is added around it).
// To swap a photo: drop a new image in assets/photos/ and change `src`.
export const WALL_PHOTOS = [
  { src: 'assets/photos/momdad.jpg',  x: 325, y: 180, w: 84,  h: 64 },
  { src: 'assets/photos/wedding.jpg', x: 512, y: 166, w: 123, h: 84 },
];

// Sound clips. Put your files in assets/sounds/ and set the names here.
// .mp4, .m4a, .mp3 and .wav all work. If a file is missing, the game falls
// back to its built-in synthesized sound.
export const SOUNDS = {
  // Which yell Bob uses when he gets stepped on:
  //   'recording' = your clip below
  //   'classic'   = the original synthesized "OWWWW!"
  yellStyle: 'classic',
  yell: 'assets/sounds/bob_yell.m4a',   // your clip (used when yellStyle is 'recording')
  yellVolume: 1.0,                      // 0.0 (silent) to 1.0 (full), recording only
};

// Mom's photobomb (src/photobomb.js).
export const PHOTOBOMB = {
  src: 'assets/photobomb/mom.png',
  onClear: true,                                  // peek in after a clean jump
  onHighScore: true,                              // 4-side sequence on a new high score
  clearSides: ['left', 'right', 'bottom'],        // a clear picks one of these at random
  highScoreSides: ['left', 'top', 'right', 'bottom'], // in this order
  sequenceGap: 1.0,                               // seconds between high-score peeks
  height: 330,                                    // her full height on screen
  peekAmount: 0.6,                                // how much of her shows (0.6 = waist up)
  positions: { bottomX: 250, topX: 420, sideY: 300 }, // where along each edge she appears
};

// Bob's two sprites. dx = horizontal offset from MAN.start; w/h = drawn size.
export const MAN_SPRITES = {
  chill: { src: 'assets/dad_chill.png', dx: 0, w: 200, h: 85.4 },
  oww:   { src: 'assets/dad_oww.png',   dx: -3.6, w: 199.2, h: 99.3 },
};

// Highest point of the man between x0 and x1 (0 if not over him).
export function manTopBetween(x0, x1, profile = MAN.profile) {
  const a = Math.max(x0, MAN.start), b = Math.min(x1, MAN.end);
  if (a >= b) return 0;
  const n = profile.length, span = MAN.end - MAN.start;
  const i0 = Math.floor(((a - MAN.start) / span) * n);
  const i1 = Math.min(n - 1, Math.floor(((b - MAN.start) / span) * n));
  let top = 0;
  for (let i = i0; i <= i1; i++) top = Math.max(top, profile[i]);
  return top;
}

// Physics.
export const GRAVITY = 1800;       // px/s^2
export const MAX_LAUNCH_SPEED = 1150; // px/s at full speed meter, weight 1.0
export const MIN_SPEED_FRACTION = 0.25; // speed meter at 0 still gives a little hop
export const ANGLE_MIN = 15;       // degrees, bottom of the angle bar
export const ANGLE_MAX = 75;       // degrees, top of the angle bar

// Meters: seconds for the needle to go end to end and back.
export const SPEED_METER_PERIOD = 1.3;
export const ANGLE_METER_PERIOD = 1.2;

// Scoring.
export const POINTS_PER_CLEAR = 100;
export const STREAK_BONUS = 50;    // flat bonus on every clear after the first in a row

// Jumpers. weight: heavier = less carry. size: taller/wider body,
// bigger footprint, and closer to the ceiling.
// stompOffset: per-character nudge from MAN.stompSpot (x + = right, y + = up).
// spriteWidth: optional, stretches the character's art wider (look only).
export const CHARACTERS = [
  // Ashley: smallest + lightest
  { id: 'ashley', name: 'Ashley', weight: 0.80, size: 0.85,
    shirt: '#b48ce6', pants: '#9d74d6', skin: '#d9a066', hair: '#3b2414', // fallback colors if art fails to load
    stompOffset: { x: 0, y: 0 }, // nudge stomp spot: x + = right, y + = up
    sprites: {
      dir: 'assets/ashley', standH: 488,
      poses: {
        stand: { w: 209, h: 488, ax: 105 },
        run1:  { w: 328, h: 448, ax: 173 },
        run2:  { w: 363, h: 419, ax: 189 },
        air:   { w: 315, h: 422, ax: 139 },
        cheer: { w: 312, h: 502, ax: 142 },
        oops:  { w: 381, h: 478, ax: 156 },
      },
    },
  },
  // Jeff: 2nd lightest (height includes his wheel)
  { id: 'jeff', name: 'Jeff', weight: 0.95, size: 1.05,
    shirt: '#eeeeee', pants: '#222222', skin: '#c68642', hair: '#1c1c1c', // fallback colors if art fails to load
    stompOffset: { x: 0, y: 0 }, // nudge stomp spot: x + = right, y + = up
    sprites: {
      dir: 'assets/jeff', standH: 473,
      poses: {
        stand: { w: 173, h: 473, ax: 83 },
        run1:  { w: 258, h: 447, ax: 115 },
        run2:  { w: 301, h: 428, ax: 145 },
        air:   { w: 281, h: 421, ax: 126 },
        cheer: { w: 278, h: 497, ax: 144 },
        oops:  { w: 415, h: 474, ax: 164 },
      },
    },
  },
  // BJ: tallest, 2nd heaviest
  { id: 'bj', name: 'BJ', weight: 1.05, size: 1.25,
    shirt: '#222222', pants: '#8a8a8a', skin: '#c68642', hair: '#5a3a1a', // fallback colors if art fails to load
    stompOffset: { x: 0, y: 0 }, // nudge stomp spot: x + = right, y + = up
    sprites: {
      dir: 'assets/bj', standH: 457,
      poses: {
        stand: { w: 188, h: 457, ax: 90 },
        run1:  { w: 349, h: 435, ax: 187 },
        run2:  { w: 341, h: 391, ax: 220 },
        air:   { w: 291, h: 389, ax: 139 },
        cheer: { w: 274, h: 491, ax: 142 },
        oops:  { w: 411, h: 463, ax: 161 },
      },
    },
  },
  // JR: heaviest (maxed), a little shorter than Jeff
  { id: 'jr', name: 'JR', weight: 1.30, size: 1.00,
    shirt: '#1f4fa8', pants: '#1f4fa8', skin: '#c68642', hair: '#111111', // fallback colors if art fails to load
    // Look only (doesn't change physics): 1.0 = normal, 1.3 = 30% wider.
    spriteWidth: 1,
    stompOffset: { x: 0, y: 0 }, // nudge stomp spot: x + = right, y + = up
    sprites: {
      dir: 'assets/jr', standH: 484,
      poses: {
        stand: { w: 228, h: 484, ax: 107 },
        run1:  { w: 366, h: 462, ax: 186 },
        run2:  { w: 379, h: 433, ax: 215 },
        air:   { w: 333, h: 412, ax: 153 },
        cheer: { w: 343, h: 504, ax: 161 },
        oops:  { w: 404, h: 502, ax: 170 },
      },
    },
  },
];

// The man on the floor (always the same guy).
export const FLOOR_MAN = { shirt: '#3498db', pants: '#7f6a4f', skin: '#f0c8a0', hair: '#6b4a2b', shoes: '#222' };

// Where this character stands on Bob after a failed jump.
export function stompSpotFor(ch) {
  const o = ch.stompOffset || { x: 0, y: 0 };
  return { x: MAN.stompSpot.x + (o.x || 0), h: MAN.stompSpot.h + (o.y || 0) };
}

// Body measurements derived from size.
export function bodyOf(ch) {
  return {
    height: 110 * ch.size,
    halfW: 16 * ch.size,
  };
}
