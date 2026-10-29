# System Anirudh — Story Map

> A personal page, rendered as a planetary system.

## The concept

Anirudh keeps building worlds. His public GitHub reads like a mission log:
`solar-system` ("a simulation of all the known worlds in solar system"),
`solar-system-mars-data`, `solar-system-mercury-data`, `rust-bevy-web-test`
(a Bevy solar-system game), `train-game` (a railway tycoon in three.js) and
`garden-game`. He works at **Slack** and lives in **Seattle**, and has been
on GitHub since **April 2014**.

So instead of an "about me" page *about* someone who builds solar systems,
the page **is** one. Anirudh is the star at the center, and every world
orbiting him is one part of his story:

| World | What it stands for | Visual idea |
|---|---|---|
| **The Star** | Anirudh himself | Glowing animated-noise sun with a name ring |
| **Emerald** (Seattle) | Home | Green-blue planet with drifting rain clouds, a tiny Space Needle and a snow-capped Rainier |
| **Hashport** (Slack) | Work | Orbital station shaped like the `#` channel symbol, with message "pings" blinking between its arms |
| **Railhead** (`train-game`) | Railway tycoon | Desert planet with a ring railway and a little train looping around it |
| **Verdance** (`garden-game`) | Garden game | Soft planet covered in flowers that sway and bloom |
| **Ares Archive** (`solar-system-mars-data`) | Data, real science | Rust-red world with data-point beacons |
| **Swift** (`solar-system-mercury-data`) | Data | Small, fast, cratered world closest to the star |
| **Ferris** (`rust-bevy-web-test`) | Rust & Bevy experiments | A crab-orange moon of Railhead |
| **The 2014 Comet** | The journey since joining GitHub | A comet on an eccentric orbit whose tail leaves the timeline behind it |

Tone: playful, warm, a little nerdy, and honest. We only claim facts we can
see publicly (Slack, Seattle, the repos, joined 2014) and frame the rest as
the planets' "mission logs".

---

## Story 1 — Launch Pad
**As** a visitor, **I want** the page to load fast at its Pages URL and
greet me with a living star in deep space, **so that** I know immediately
this is not a template portfolio.

Acceptance criteria
- Vite + three.js project, `npm run build` outputs `dist/`.
- GitHub Actions workflow builds on push to `main` and deploys `dist/` to
  GitHub Pages (`actions/deploy-pages`). Vite `base` set to `/anirudh/`.
- Full-screen WebGL canvas, resizes correctly, capped pixel ratio.
- Layered starfield (thousands of points, subtle twinkle via shader).
- Central star: shader-driven animated surface and an additive glow halo.
- Title overlay: "ANIRUDH" with a one-line subtitle.
- Graceful message if WebGL is unavailable.

## Story 2 — The Orrery
**As** a visitor, **I want** worlds orbiting the star that I can look
around, **so that** the page feels like an explorable system.

Acceptance criteria
- Data-driven `worlds.js` config (name, radius, orbit distance, speed,
  colours, story copy) so content and rendering are separate.
- Each world on its own orbit with a faint orbit ring, axial tilt and spin.
- Procedural planet materials (noise-based shader, per-world palette,
  atmosphere rim glow), no texture downloads.
- OrbitControls with damping and sensible zoom limits; slow auto-drift
  when idle.
- Floating HTML labels that follow each world and hide when behind the star.

## Story 3 — Worlds With Character
**As** a visitor, **I want** each world to visually *say* what it stands
for, **so that** I learn about Anirudh just by looking.

Acceptance criteria
- Emerald: drifting cloud shell + rain streaks, Space Needle and Rainier.
- Hashport: `#`-shaped station that rotates, with blinking message pings.
- Railhead: ring track around the planet with a multi-car train running on it.
- Verdance: instanced flowers on the surface that sway and bloom.
- Ares Archive: pulsing data beacons rising from the surface.
- Swift: cratered, quick orbit.
- Ferris: crab-orange moon orbiting Railhead.
- All extras are cheap (instancing, few draw calls) and stay at 60fps on a laptop.

## Story 4 — The Voyage
**As** a visitor, **I want** to click a world (or take a guided tour) and
fly there to read its story, **so that** the page tells a narrative rather
than just looking pretty.

Acceptance criteria
- Raycast click/tap on worlds and labels → smooth camera flight that
  follows the moving world.
- Story card panel: title, "mission log" copy, fact chips, link to the repo
  where relevant.
- "Begin the voyage" guided tour: intro flythrough then Next/Prev through
  every world in a deliberate order (Star → Emerald → Hashport → Railhead →
  Ferris → Verdance → Ares → Swift → Comet).
- Keyboard: ←/→ to step, Esc to return to the overview.
- Progress dots in the HUD.

## Story 5 — Comet, Polish & Secrets
**As** a visitor, **I want** the experience to feel finished, delightful
and accessible, **so that** I want to share it.

Acceptance criteria
- The 2014 Comet: eccentric orbit, particle tail; its story is a timeline
  (2014 → today) built from public repo dates.
- Bloom post-processing for the star and glows.
- Loading screen with a "systems coming online" check-list.
- Mobile layout (bottom-sheet story card, touch controls).
- `prefers-reduced-motion` respected (no auto-drift, instant cuts).
- Easter egg: type `slack` to make every world send a ping to the star.
  Type `choo` to speed the train.
- OG/meta tags, favicon, README with how it's built.
