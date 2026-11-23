# Hallway Jump: Design Doc

_Working title. Living doc: update as decisions are made._

## Pitch
A 2D long-jump-style game set in a house hallway. The player runs and jumps to clear a man lying in the middle of the floor. If the jump is timed right, he's cleared. If it's timed wrong, he gets stepped on and yells.

## Core Loop
1. Pick a character (first time, or from the menu)
2. Run up the hallway
3. Set power/speed and distance with the meters
4. Jump
5. **Clear** → points + streak continues
   **Fail** → man gets stepped on, yells, streak resets
6. Try again (quick restart)

## Characters
- **Jumpers:** 4 selectable characters
- Each jumper has a different **weight** and **size**, and both feed into the trajectory math
  - Weight: affects how far a given speed + angle carries (heavier = less carry)
  - Size: affects the jumper's body/feet hitbox when checking whether they cleared the man
- **The man on the floor:** always the same character: **Bob** (cartoon art in `assets/dad_chill.png` and `assets/dad_oww.png`)
  - chill pose while waiting / being jumped over; oww pose when stepped on
  - Collision shape traced from the art (head/torso taller than legs), shrunk ~15% to feel fair
- **Art style:** cartoon versions of real people, made by running photos through an AI cartoon filter
  - Get permission from everyone whose photo is used, the man on the floor included

## Mechanics
- **Input:** tap anywhere on the screen (one-tap controls, phone-first)
- **Tap 1 — Speed (horizontal bar):** needle slides back and forth; tap locks run-up speed
- **Tap 2 — Takeoff angle (vertical bar):** needle slides up and down; tap locks jump angle
- Jump distance = speed + angle (angle sweet spot around the middle; too low = flat and short, too high = floaty and short)
- Success = jumper lands completely past the man
- **Run:** consecutive jumps; a fail ends the run and the run score is checked against the high score
- **Hallway end wall:** too much speed at a low angle hits the wall = fail (BONK!)
- **Ceiling:** too much speed at a high angle bonks the ceiling and drops the jumper
- Failure = landing on or short of the man → stomp + yell

## Scoring / Rewards
- Points for each successful clear
- 100 points per clear, plus a **flat +50 bonus** on every clear after the first in a row; a miss ends the run
- **Endless retries:** no lives, no game over
- **Global high score:** one all-time high shared by everyone who plays
  - Beating it shows a "NEW HIGH SCORE!" alert to that player only
  - Player enters initials (arcade style, 3 letters) when they set it
  - Current high score + initials shown on the start screen and end screen
  - Needs a small backend to store the score (e.g. Vercel KV / Upstash Redis, or Supabase)

## Scope
### First playable (v0.1): built
- [x] Home hallway: white walls, blue carpet, doors, pictures; man always in the same spot
- [x] 4 placeholder jumpers with weight/size stats + select screen
- [x] Speed + angle tap meters
- [x] Clear / stomp / landed-short / ceiling and wall bonk detection
- [x] Synth "OWWW!" yell, screen shake, phone vibration on stomp
- [x] Score, flat streak bonus, endless retries
- [x] High score with 3-letter initials, shown on title/select/game-over screens (this device only for now)
- [x] Landscape lock (Android) + rotate overlay (iPhone)

### Next (v0.2)
- [ ] Global high score backend (Vercel KV / Upstash)
- [ ] Deploy to Vercel

### Later
- 4-character select screen
- Man's position and distance vary
- Polish: animations, reactions, sound effects

## Tech
- **Platform:** mobile web browser (play by visiting a URL, no install); works on desktop too
- **Engine:** plain HTML5 canvas + JavaScript, no dependencies or build step (can move to Phaser later if needed)
- **Hosting:** Vercel (push to GitHub → auto-deploys to a URL)
- **Orientation:** landscape only
  - Android: on the first tap, go fullscreen and lock the screen to landscape (Screen Orientation API)
  - iPhone and other browsers that can't lock: in portrait, cover the game with a "Rotate your phone" screen
  - Web app manifest set to `"orientation": "landscape"` for anyone who adds it to their home screen

## Open Questions
- Exact stats (weight/size) for each of the 4 jumpers
- Whose photos will be used for the characters?

## Decisions Log
- 2026-11-19: Concept set: 2D long-jump mechanics, hallway setting, jump over a man lying down. 4 selectable jumpers, same man every time. Simple try-and-repeat loop. Start with a fixed position for the man; vary it later.
- 2026-11-19: Controls: two taps. Horizontal bar = speed, vertical bar = takeoff angle, each with a needle moving back and forth. Tap to lock each.
- 2026-11-19: Tech: mobile web (play from a URL), Phaser 3 + Vite, hosted on Vercel.
- 2026-11-19: Jumpers differ in weight and size, which affects trajectory. Flat streak bonus. Endless retries. Global high score with an alert when beaten. Art style: AI-cartoonified photos of real people. Landscape only.
- 2026-11-19: High score alert shown only to the player who beat it. Initials entry for high scores. Current high score displayed on start/end screens.
- 2026-11-19: Built v0.1 with plain canvas (no dependencies) instead of Phaser. A miss ends the run, and the run score counts toward the high score. Added end-wall and ceiling bonks so max speed isn't always safe. High score stored per-device until the backend is added.
- 2026-11-19: Bob's real art added (chill + oww sprites). Bob is taller than the placeholder, so the layout was retuned: takeoff line moved back to x=330, Bob at x=460–660, launch speed raised, meters slowed slightly (1.3s / 1.2s). About 10–12% of speed/angle combos clear now (was 14–23%).
- 2026-11-19: First real jumper art: BJ replaces the third placeholder (was "Stretch"), using Stretch's stats for now (weight 1.05, size 1.15). Sprite sheet cut into 6 poses in `assets/bj/`: stand, run1, run2, air, cheer, oops. All poses scale from the standing height so the character's size stat still works.
- 2026-11-20: All 4 jumpers now have real art. Lightest to heaviest: Ashley (0.80 weight / 0.85 size), Jeff (0.95 / 1.05, on an electric unicycle), BJ (1.05 / 1.15), JR (1.25 / 1.22). Every failed jump ends at a fixed stomp spot on Bob (`MAN.stompSpot`, plus per-character `stompOffset`).
