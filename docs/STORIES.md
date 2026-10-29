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
