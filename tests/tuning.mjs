// Prints, for each jumper, what share of meter combos clear the man.
import { CHARACTERS } from '../src/config.js';
import { simulate } from '../src/physics.js';
const N = 60;
for (const ch of CHARACTERS) {
  const counts = { clear: 0, stomp: 0, short: 0, wall: 0 };
  let ceil = 0;
  const rows = [];
  for (let ai = N - 1; ai >= 0; ai -= 6) {
    let row = '';
    for (let si = 0; si < N; si += 2) {
      const j = simulate(ch, si / (N - 1), ai / (N - 1));
      row += { clear: '#', stomp: 'x', short: '.', wall: 'W' }[j.outcome];
    }
    rows.push(row);
  }
  for (let si = 0; si < N; si++) for (let ai = 0; ai < N; ai++) {
    const j = simulate(ch, si / (N - 1), ai / (N - 1));
    counts[j.outcome]++; if (j.hitCeiling) ceil++;
  }
  const tot = N * N;
  console.log(`\n${ch.name}: clear ${(100*counts.clear/tot).toFixed(1)}%  stomp ${(100*counts.stomp/tot).toFixed(1)}%  short ${(100*counts.short/tot).toFixed(1)}%  wall ${(100*counts.wall/tot).toFixed(1)}%  ceiling ${(100*ceil/tot).toFixed(1)}%`);
  console.log('  angle ^  speed ->   (# clear, x stomp, . short, W wall)');
  rows.forEach(r => console.log('  ' + r));
}
