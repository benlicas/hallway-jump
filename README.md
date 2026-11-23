# Hallway Jump

A 2D long-jump-style phone game set in a house hallway. Tap once to lock your speed and once to lock your takeoff angle, then try to clear the man lying on the floor.

Plain HTML5 canvas + JavaScript. **No dependencies, no build step.**

## Run it locally

Double-click **`start.bat`**, or in a terminal:

```
cd D:\Projects\hallway-jump\hallway-jump
py serve.py
```

It opens http://localhost:8000 and prints a **Phone** address to use on the same Wi-Fi.
`serve.py` turns off browser caching, so new art, sounds and code show up after a
normal refresh. On desktop you can click or press Space/Enter.

## Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel: **Add New → Project**, import the repo.
3. Framework preset: **Other**. Leave the build command empty and the output directory as the repo root.
4. Deploy. Anyone can play at the URL it gives you.

## Where things are

| File | What it does |
|---|---|
| `src/config.js` | **All tunable numbers**: hallway layout, man's position, gravity, meter speeds, points, the 4 jumpers' weight/size |
| `src/physics.js` | Jump math (speed + angle + weight → trajectory, ceiling/wall bonks, landing check) |
| `src/main.js` | Game flow: screens, taps, scoring, streaks |
| `src/draw.js` | All drawing (hallway, characters, meters, buttons). Jumpers are still placeholder shapes |
| `assets/` | Bob's sprites (`dad_chill.png`, `dad_oww.png`) and jumper poses (`assets/bj/`) |
| `src/audio.js` | Synthesized sounds, including the placeholder "OWWW!" yell |
| `src/scores.js` | High score storage (this device only for now; see below) |
| `src/orientation.js` + `style.css` | Landscape lock / "Rotate your phone" screen |
| `tests/tuning.mjs` | `node tests/tuning.mjs` prints how forgiving each jumper is |

## Tuning

Change numbers in `src/config.js` and reload. After changing physics or jumper stats, run `node tests/tuning.mjs` to see what share of speed/angle combos clear for each jumper. Right now it's about 10–12% for each jumper.

## Next steps

- **Global high score:** replace the two functions in `src/scores.js` with calls to a Vercel API route + Vercel KV/Upstash.
- **Real art:** Bob and BJ are done. Other jumpers: make a 6-pose sheet (stand, run, run, air, cheer, oops; side view facing right, transparent background), cut it into `assets/<name>/`, and add a `sprites` entry like BJ's in `src/config.js`.
- **Replacing Bob's art:** keep the file names in `assets/`; if the new pose is a different shape, re-trace `MAN.profile` / `MAN.owwProfile` in `src/config.js`.
- **Real yell:** replace `sfx.yell()` in `src/audio.js` with a recorded clip.
