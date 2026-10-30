# Anirudh — A Meadow One-Pager

> One page. One scene. A sunlit clearing at the edge of the woods, a meadow
> full of wildflowers, and everything worth knowing about Anirudh, written so
> it reads well.

*This plan replaces the earlier variants (the terminal, the planetary system
and the man page). Their story map lives in git history. Content comes from
web research, not just the GitHub profile: see [RESEARCH.md](RESEARCH.md).*

## The idea

Anirudh lives in Seattle, two hours from Mount Rainier, whose subalpine
meadows are famous for their wildflowers. He builds gardens in code
(`garden-game`), simulates the sky (`solar-system`), and may well photograph
flowers, rivers and stars. So the page is a **Pacific Northwest meadow in
high summer**:

- warm late-afternoon sun low over the trees, with light shafts through the
  canopy
- a meadow of grass with **real PNW wildflowers**: lupine (violet-blue),
  Indian paintbrush (scarlet), avalanche lilies (white), arnica (yellow),
  magenta paintbrush and a scatter of daisies
- an edge of Douglas fir and western red cedar woods framing the clearing,
  with **Rainier**, snow-capped and hazy, far behind
- a breeze moving through everything, a few butterflies, pollen in the light

The content sits **over** the scene as a calm, readable column. The scene is
atmosphere; the words are the point.

### Ground rules
- **Readability first.** Text sits on a soft, solid-enough panel with high
  contrast (at least WCAG AA). The scene never sits behind body text without one.
- **One page, one scene.** No variants, no switcher, no routing.
- **Honest content.** Only facts from RESEARCH.md that Anirudh has
  confirmed. Team work is described as team work.
- **Light.** A small bundle, procedural (no large textures), 60fps on a laptop,
  smooth on a phone.

---

## Story M1 — Clear the Ground
**As** the maintainer, **I want** the repo reduced to a single page,
**so that** there's nothing left to maintain but the meadow.

Acceptance criteria
- Remove `space.html`, `text.html`, `src/cyber/`, `src/scene/`, `src/physics/`,
  the terminal modules, `scripts/stability.mjs`, the variant bar and their CSS.
- Remove the N-body step from CI. The workflow builds and deploys `dist/` to
  Pages on push to `main`, as before.
- Keep: Vite, three.js, the Pages workflow, the favicon (redrawn as a small
  flower or sun).
- Leave `index.html` as a clean shell with a single canvas and a content
  container; the build passes and the deploy works.
- The README says what the page is, links to the live site, and points to
  RESEARCH.md.

## Story M2 — The Meadow
**As** a visitor, **I want** to arrive in a sunlit meadow at the edge of the
woods, **so that** the page feels calm, warm and alive.

Acceptance criteria
- **Sky and sun:** an analytic sky (Rayleigh/Mie style, e.g. three's
  `Sky`) with the sun low in the west, about 12–18° up, giving warm golden
  light. Soft aerial-perspective fog so distance turns blue-grey.
- **Terrain:** a gently rolling meadow from procedural noise, a small rise in
  the foreground, opening onto a clearing.
- **Grass:** instanced blades (about 60–120k on desktop, scaled down on phones)
  with a wind shader using layered noise gusts, colour varying from green to
  straw, and a subtle sun-facing translucency.
- **Wildflowers:** instanced flower heads in natural drifts (clustered by
  noise, not uniform), with PNW species and their colours:
  - lupine: spikes of violet-blue
  - paintbrush: scarlet and magenta
  - avalanche lily: white with yellow centres
  - arnica: yellow daisy-like
  - a few oxeye daisies

  Flowers sway with the same wind field as the grass.
- **Woods:** a ring of conifers (Douglas fir and cedar silhouettes,
  instanced, two or three LODs) closing in on the sides and back, darker
  and cooler in shadow.
- **Rainier:** a distant snow-capped volcano on the horizon, softened by haze.
- **Light shafts:** god rays from the sun through the tree line
  (post-process), plus gentle bloom on the sun only.
- **Life:** five to eight butterflies on looping flight paths, pollen and dust
  motes drifting in the sunbeams.
- Colour grade: warm highlights, cool shadows, tasteful and not saturated.

## Story M3 — The One-Pager
**As** a recruiter, colleague or friend, **I want** to read who Anirudh is
in under a minute, **so that** I leave knowing what he does and how to
reach him.

Acceptance criteria
- Content lives as semantic HTML in `index.html`, so it's readable
  instantly, without JavaScript, and by search engines. It's editable
  without touching the scene.
- Sections, top to bottom:
  1. **Hero:** "Anirudh Janga", "Senior Software Engineer at Slack ·
     Seattle", and one human sentence (e.g. builds AI tools for engineers
     by day, worlds and gardens in code by night).
  2. **Work:** Slack's internal AI developer tooling, described as team
     work: the escalation bot (25+ channels), the in-Slack assistant and
     web app (4,000+ monthly chat turns), and the unified LLM platform
     (16+ teams, an estimated 10,000+ engineering hours a year), linked to
     the Slack Engineering post.
  3. **Making things:** solar-system, chess-3d, garden-game, train-game,
     the Rust/Bevy experiment. One line each, linked.
  4. **Photography:** flowers, rivers, mountains and the Milky Way, with a
     link to Unsplash.
  5. **Contact:** GitHub, LinkedIn, Unsplash.
- **Readability:** a single centred column (max ~64ch) on a frosted panel
  (backdrop blur plus a warm off-white or deep forest tint) with WCAG AA
  contrast. Typography: a humanist serif for headings and a clean sans for
  body text, 17–18px, line-height 1.6.
- Semantic HTML (header, sections, headings, lists, links). Fully readable
  with the canvas absent.

## Story M4 — Walking Through
**As** a visitor, **I want** the scene to respond as I read, **so that**
scrolling feels like a slow walk into the meadow.

Acceptance criteria
- **Scroll-linked camera:** the hero frames the clearing and the sun;
  scrolling drifts the camera slowly forward and down into the flowers,
  ending near the tree line for Contact. Movement is eased and gentle.
- **Section moments,** each subtle and never in front of text:
  - the Work section brings a light breeze ripple across the grass
  - Making things lifts a butterfly into frame
  - Contact settles on the golden-hour light
- **Pointer:** a little parallax, and the grass bends softly away from the cursor.
- **`prefers-reduced-motion`:** a static camera, minimal wind, no butterflies
  flying through.

## Story M5 — Fast, Accessible, Everywhere
**As** any visitor on any device, **I want** the page to load quickly and
work for me, **so that** the scene never gets in the way.

Acceptance criteria
- **Adaptive quality:** grass and flower counts, shadow resolution and god
  rays scale with device class and a measured frame rate. Phones get a
  lighter meadow.
- **Fallbacks:** without WebGL, a CSS sky gradient with a meadow
  silhouette sits behind the same content. The content renders before the
  scene, so it's readable immediately.
- **Accessibility:**
  - the canvas is `aria-hidden`
  - visible focus styles and a skip link
  - all text AA or better
  - the page works by keyboard and screen reader alone
- **Performance:**
  - JS within a reasonable budget (three.js plus scene code, gzipped)
  - no layout shift from the canvas
  - Lighthouse performance ≥ 85 on mobile and accessibility ≥ 95
- **Meta:** title, description, an OG image rendered from the meadow, and a
  favicon.

## Story M6 — Review & Ship
**As** Anirudh, **I want** to confirm the content before it goes live,
**so that** the page is accurate and says what I want.

Acceptance criteria
- Every claim on the page maps to a confirmed line in RESEARCH.md (all items
  were confirmed on 2026-10-29).
- Screenshots at desktop and phone sizes, across hero, middle and end
  scroll positions, are attached to the PR for review.
- Merged to `main` and deployed to Pages via Actions.

---

## Order of work
M1 → M2 → M3 → M4 → M5 → M6, each merged to `main` when done.
Content questions are resolved (see RESEARCH.md).

---

# Part 2 — The Wind (Flower ambiance)

*Feedback: "I am going for the atmosphere and ambiance of the flower game."*
Read as **Flower** (thatgamecompany, 2009): you don't walk through the meadow,
**you are the wind**. A stream of petals rides on you over endless rolling hills
of grass. Closed buds open as you pass, each one adding its petals to your
stream, and colour floods back into the land behind you. It's calm, warm and
wordless, close to a lullaby.

The content (RESEARCH.md, the panels in `index.html`) stays exactly as it is.
This part changes how the world **feels**.

### What changes from Part 1
| Part 1 (realistic PNW) | Part 2 (Flower) |
|---|---|
| Rainier, fir woods closing in | open, endless rolling hills, a few lone trees on far crests |
| physically based sky, white glare | a painted warm gradient sky, a soft sun, gentle bloom we control |
| knee-high grass, flower specks | a deep, lush sea of grass with large visible wind waves |
| butterflies | **a petal stream**: the wind made visible, following you |
| static flowers | **buds that bloom** as the stream passes, and colour returns to the field |
| silent | optional ambient sound: wind, and a soft chime per bloom (opt-in) |

### Ground rules (unchanged)
Readability first: text stays on solid-enough panels at AA contrast. One page,
one scene. Content renders before and without WebGL. Respect
`prefers-reduced-motion`.

## Story F1 — Rolling Hills
**As** a visitor, **I want** wide, soft, endless hills under a warm sky,
**so that** the world feels open and dreamy rather than enclosed.

Acceptance criteria
- Terrain becomes broad, smooth swells (long-wavelength noise, rounded
  crests) stretching to the horizon. No forest ring, no Rainier.
- Distant hills fade into a warm haze, layered like a painting (three or four
  value steps toward the horizon).
- Three to five lone deciduous trees on far crests: round, soft canopies,
  silhouetted against the light.
- **Painted sky:** our own gradient shader (warm apricot horizon, rose
  mid-sky, soft blue zenith) with a large soft sun disc and halo, and a
  few slow, flat, painterly cloud bands. All values stay in a controlled
  range, so bloom is safe again.
- **Grade:** warm and slightly saturated, lifted shadows (never black),
  soft bloom on the sun, highlights and petals only, and a gentle vignette.

## Story F2 — A Sea of Grass
**As** a visitor, **I want** the grass to move like water, **so that** I can
see the wind.

Acceptance criteria
- Denser, taller, lusher grass that covers the hills to the horizon. A
  dense near field plus a cheap far field (instanced cards or a shader on the
  terrain) carries the texture into the distance.
- **Wind waves:** broad bands of gust roll across the field in one
  direction, so the sheen visibly travels over the hills (tips brighten as
  they bow towards the light).
- Colour runs from deep green at the roots to sunlit yellow-green tips, with
  backlit glow when looking towards the sun.
- The pointer **is** wind too: the grass bows in a trail behind the cursor.

## Story F3 — The Petal Stream
**As** a visitor, **I want** a ribbon of petals that flows with me,
**so that** I feel like the wind carrying them.

Acceptance criteria
- 150–400 petals (instanced, curved, two-sided, lit, slightly translucent),
  each fluttering and tumbling as it follows a smooth flowing path.
- The stream leads the camera along the scroll walk, sweeping low over
  the grass and curling around blooms. On desktop it bends toward the
  cursor, as if the pointer were the wind.
- It starts small (a handful of petals) and grows as flowers bloom (F4).
  Each bloom adds petals of its own colour.
- Reduced motion: the stream rests gently in place. No sweeping.

## Story F4 — Bring Back the Colour
**As** a visitor, **I want** the field to come alive as I read, **so that**
scrolling through Anirudh's story literally makes the meadow bloom.

Acceptance criteria
- Flowers start as **closed buds**. When the petal stream passes nearby they
  open over about a second (petals unfold and lift), with a small burst of
  light, and add petals to the stream.
- Clusters of buds sit along the walk, roughly one cluster per section:
  - Hero: a first cluster that blooms on load
  - At Slack: a field of violet
  - Making things: scarlet and gold
  - Photography: white
  - Say hello: everything at once at golden hour
- **Colour returns:** the land starts slightly desaturated and dusky. A
  "life" field (painted into a small texture as blooms happen) saturates and
  warms the grass and terrain around every opened flower, spreading slowly.
  By the end of the page the whole valley is in colour.
- Scrolling back up doesn't undo it: what has bloomed stays bloomed.

## Story F5 — Sound (opt-in)
**As** a visitor who wants the full feeling, **I want** soft ambient sound,
**so that** the meadow feels alive. It's never on by default.

Acceptance criteria
- A small, quiet "sound" toggle in the corner, off by default, keyboard
  accessible, and remembered for the visit.
- Generated with the Web Audio API, with no audio files:
  - a soft wind bed of filtered noise, swelling with the gusts
  - a gentle pentatonic chime for each bloom, pitched by colour, panned by position
  - a low warm drone pad
- Volume stays modest. Sound pauses when the tab is hidden.

## Story F6 — Polish, Performance & Review
**As** Anirudh, **I want** the new ambiance to stay fast, readable and
accessible, **so that** nothing from Part 1 regresses.

Acceptance criteria
- Adaptive quality still scales the grass, petals, bloom and far field
  on phones and weaker machines, with the same frame-rate watcher.
- axe-core still reports 0 violations, the panels still pass AA contrast
  against the new brighter scene, the no-WebGL fallback gets a warm
  gradient to match, and reduced motion is honoured throughout.
- A new OG image comes from the bloomed valley.
- Review screenshots (hero, mid-page with part of the valley bloomed, end
  with everything in colour) at desktop and phone sizes go in `docs/review/`.

## Order of work
F1 → F2 → F3 → F4 → F5 → F6, each merged to `main` when done.
