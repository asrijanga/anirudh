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

## Story 6 — Terminal
*Added after Anirudh said he is "a fan of terminal and text, simplicity and readability".*

**As** Anirudh, **I want** the page to feel like a well-kept terminal and to
read like good plain text, **so that** it looks like something I would have
built for myself.

Acceptance criteria
- Monospace everywhere, amber-phosphor accent on near-black, solid
  high-contrast panels, body text ≥15px with generous line height.
- Header reads like a prompt: `$ whoami` → `anirudh`, one plain sentence.
- A real command line pinned to the bottom of the page:
  `help`, `ls`, `cd <world>` / `cd ..`, `cat`, `open`, `tour`, `next`,
  `prev`, `whoami`, `neofetch`, `text`, `clear`, and the secrets (`slack`,
  `choo`, `sudo`). Tab completion, ↑/↓ history, and clickable commands
  for people who would rather not type.
- Story cards become terminal windows (`$ cat log.txt`, `$ ls facts/`,
  `$ open <url>`), with `[← prev] n/9 [next →]` text navigation.
- `text.html`: the whole page as a readable man page, `ANIRUDH(1)`, with
  no WebGL. Linked from the shell (`text`) and used as the no-WebGL fallback.

## Story 7 — Real Orbital Mechanics
*Feedback: "the solar system needs a little realism and scale; that system
would never be stable and would collapse in a second."* He's right: the
first version had giant planets packed together with arbitrary speeds.

**As** someone who builds solar-system simulations, **I want** the system
to obey real physics and be provably stable, **so that** it holds up to
the scrutiny of someone who knows what a Hill sphere is.

Acceptance criteria
- Every world has real Keplerian elements: semi-major axis in AU,
  eccentricity, inclination, node, argument of periapsis, mean anomaly at
  epoch, plus mass, radius, axial tilt and rotation period. Data lives in
  `worlds.js`, the single source of truth for the renderer and the checks.
- Positions are solved with Kepler's equation; periods come from Kepler's
  third law (`P = 2π√(a³/μ)`), never hand-tuned.
- The architecture is physically plausible:
  - swift ≈ Mercury, emerald ≈ Earth, ares ≈ Mars, railhead ≈ a Jupiter-mass gas giant at 5.2 AU.
  - verdance is a super-Earth-ish garden world in the habitable zone at 1.26 AU.
  - hashport is a station parked at emerald's **L4 Lagrange point**, 60° ahead.
  - ferris orbits railhead well inside its Hill sphere, like Ganymede.
  - The comet is a massless Halley-type body (e ≈ 0.9).
- Distances are true to scale (1 AU = 22 units). Sizes are compressed so
  the worlds are visible, and the compression is stated openly. A
  `scale true` command animates everything to real size.
- A simulated clock: the shell shows the date, and `warp` changes the rate
  (1 day/s … 1 year/s, or pause).
- `npm run stability`: an N-body integration (symplectic leapfrog, all
  pairwise gravity) of the full system for 10,000 years, plus a moon run.
  It checks mutual Hill spacing, drift in a and e, closest approaches, and
  that the L4 station keeps librating around 60°. It runs in CI and fails
  the build if the system is not stable.
- Each story card shows the world's orbit: `$ orbit --elements`.

## Story 8 — Variants
*Feedback: "this is more like a resume and shows a lot of my capabilities,
can we have different variations? A terminal variant and an outer space one."*

**As** a recruiter, colleague or friend, **I want** to pick how I read
about Anirudh, **so that** I get the version that suits me.

Acceptance criteria
- `/`: **terminal**, the default. A full-screen shell that reads like a
  résumé without typing anything: a banner, a summary, skills, projects and
  experience printed on boot, with every command clickable. It needs no
  WebGL and loads instantly.
- `/space.html`: **outer space**, the 3D system from Stories 1–7.
- `/text.html`: **plain text**, the man page.
- A variant switcher in every variant, plus `space`, `text`, `term` commands.
- Résumé content lives in `src/data/resume.js`. Skills are listed with the
  public evidence for each, so nothing is claimed without proof. Fields
  only Anirudh can fill in (roles, years) are marked and hidden until set.

## Story 9 — Neon Terminal
*Feedback: "can we emulate a terminal-style web, cyberpunk, all in three.js?
That's what I meant."* The terminal variant should not be a web page that
looks like a terminal; it should be a terminal inside a three.js world.

**As** a visitor, **I want** to stand on a rain-soaked rooftop in a neon
city and type at a glowing CRT, **so that** the résumé feels like a place.

Acceptance criteria
- `/` renders entirely in three.js: no DOM UI beyond an invisible input
  for the keyboard and a screen-reader log.
- **The terminal:** text is rendered into a canvas texture on a curved CRT
  screen. A CRT shader adds barrel distortion, scanlines, RGB fringing,
  flicker and a rolling refresh bar.
  - It has a prompt, a blinking cursor, history, tab completion, wheel and
    touch scrolling, and line wrapping with aligned two-column rows.
  - Commands and links on the glass are clickable: raycast → UV → the same
    barrel distortion → character cell.
  - The tmux-style variant bar is drawn on the screen itself.
  - `theme` switches phosphor colours: neon, amber, green.
- **The world**, a cyberpunk Seattle at night:
  - an instanced skyline (one draw call) with procedurally lit windows and neon roof strips
  - a neon Space Needle and a giant `ANIRUDH` sign
  - flying cars on traffic lanes, rain, fog and a wet rooftop
  - a keyboard on the desk whose keys light up as you type
- Post-processing: bloom, chromatic aberration, film grain, vignette.
- On load the camera flies in from the skyline to the monitor and the
  terminal boots. The boot screen fits on one screen: banner, `whoami`,
  then a clickable `ls` of what to read next.
- The same résumé commands drive both this terminal and the DOM fallback
  (`src/ui/resumeCommands.js`). The fallback serves browsers without WebGL.
- Works at phone size: the screen goes portrait and the text reflows to fewer columns.
- `prefers-reduced-motion`: no fly-in, no flicker, no rolling bar.

## Story 10 — Readable Neon
*Feedback: "remove the CRT effect, the screen is hard to read; also remove
the rain. Make it a very cool cyberpunk style, but readable."*

**As** someone reading a résumé, **I want** crisp text first and atmosphere
second, **so that** the style never gets in the way of the content.

Acceptance criteria
- The CRT becomes a slim, flat widescreen panel with no barrel
  distortion, scanlines, flicker, RGB fringing, rolling bar or glare. The
  cyberpunk look moves to a glowing cyan and magenta neon edge around the
  panel.
- Text is rendered without glow blur, at a larger size, on a
  higher-resolution texture (2048×1280, or 1152×1632 in portrait), and
  isn't tone-mapped, so colours stay true.
- Bloom only catches real neon (signs, edges, windows): its threshold sits
  above the screen's brightest text. Full-screen chromatic aberration and
  grain are gone; a soft vignette stays.
- No rain.
- Clicks map straight from UV to character cell, now that there's no distortion.
- Portrait framing centres the screen.
