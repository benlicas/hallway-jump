// Landscape lock.
// - Android Chrome: go fullscreen on the first tap and lock to landscape.
// - iPhone Safari can't lock orientation, so style.css shows a
//   "Rotate your phone" overlay whenever the phone is held upright.

let tried = false;

export async function tryLockLandscape() {
  if (tried) return;
  tried = true;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (!isTouch) return; // don't force fullscreen on desktop
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    }
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch {
    // Not supported (iOS) or user declined; the rotate overlay covers it.
  }
}
