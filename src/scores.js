// High score storage.
//
// v0.1: saved in this browser only (localStorage), so it's per-device for now.
// Next step: replace the bodies of these two functions with fetch() calls to a
// small Vercel API route backed by Vercel KV / Upstash, making it one global
// high score for everyone. The rest of the game won't need to change.

const KEY = 'hallwayJump.highScore.v1';

export async function getHighScore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (typeof v.score === 'number' && typeof v.initials === 'string') return v;
    }
  } catch { /* storage blocked: fall through */ }
  return { score: 0, initials: '---' };
}

// Returns the high score that's now on record.
export async function submitScore(score, initials) {
  const current = await getHighScore();
  if (score <= current.score) return current;
  // 1-3 letters; blanks allowed (e.g. "BJ"). All blank -> "???".
  const clean = String(initials || '').toUpperCase().replace(/[^A-Z ]/g, '').slice(0, 3).trim() || '???';
  const next = { score, initials: clean, at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
