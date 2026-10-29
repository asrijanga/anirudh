# anirudh@system

A personal page for Anirudh in three variants, like windows in a tmux
session (switch between them from the bar at the bottom):

    0:term    https://asrijanga.github.io/anirudh/            Night City: a CRT terminal in a neon city
    1:space   https://asrijanga.github.io/anirudh/space.html  a Kepler-accurate planetary system
    2:text    https://asrijanga.github.io/anirudh/text.html   ANIRUDH(1), the man page

`0:term` is all three.js: a rainy rooftop in a cyberpunk Seattle, a chunky
CRT on a desk, and a terminal rendered into a canvas texture on its curved
glass (scanlines, barrel distortion, RGB fringing, a rolling refresh bar).
You type into the screen: history, tab completion, wheel/touch scrolling,
clickable commands and links right on the glass, `theme neon|amber|green`.
Keys on the desk keyboard light up as you type; drag to look around the roof.
The tmux bar is drawn on the screen itself. Without WebGL (or with `?lite`)
the same résumé shell runs as a plain DOM terminal.

Every skill the résumé lists names the public work that shows it.
`cat <project>` links each project to its world in space, e.g.
space.html#railhead.


## Editing the résumé

Everything lives in `src/data/resume.js`. Fields only Anirudh can fill in
(exact title, years, impact notes, LinkedIn, email) are marked `fill in`
and stay hidden until they are set.


## The space variant

Anirudh keeps building solar systems, so this variant is one. The star is him.
Every world orbiting it is a part of the story:

    star       anirudh            the centre of it all
    emerald    home, seattle      rain clouds, a needle, a mountain
    hashport   work, slack        a # shaped station passing messages
    railhead   train-game         a ring railway with a train on it
    ferris     rust-bevy-web-test a crab-orange moon of railhead
    verdance   garden-game        flowers that bloom as you get close
    ares       mars data          beacons plotting data from the surface
    swift      mercury data       small, cratered, fast
    comet      the timeline       2014 -> now, tail pointing away from the star


## Physics

The system is meant to survive scrutiny from someone who writes solar-system
simulations.

    orbits      real Keplerian elements (a, e, i, node, periapsis, M0),
                solved with Kepler's equation; periods from Kepler's third law
    scale       distances true (1 AU = 22 units); sizes compressed with a
                square root so you can see them. `scale true` shows reality
    time        simulated clock from today's date; `warp 1d|1w|1m|1y|pause`
    hashport    parked at emerald's L4 Lagrange point
    ferris      orbits railhead at ~2% of its Hill radius, like Ganymede
    proof       npm run stability: a 10,000-year N-body integration
                (symplectic leapfrog, full pairwise gravity). It checks Hill
                spacing, drift in a and e, close encounters, energy error and
                L4 libration, and fails CI if the system isn't stable.


## Using the space variant

Start typing anywhere and it lands on the prompt.

    help           list commands
    tour           guided voyage through every world
    ls             list the worlds
    cd <world>     fly to a world (tab completes; cd .. to come back)
    cat [world]    read a world's log
    open           open the current world's repo
    next / prev    step through the voyage (or <- ->)
    warp [rate]    simulated time per second
    scale [mode]   true or readable sizes
    neofetch       system information
    text           the plain text version

Mouse and touch work too: drag to look, scroll to zoom, click a world.
There are a couple of undocumented commands.


## How it's built

Plain three.js and Vite, no framework. Everything is procedural, with no
textures or models to download.

    src/data/worlds.js        all content, in one file
    src/scene/                star, planets, orbits, decorations, comet, camera
    src/shaders/noise.js      simplex noise + fbm shared by the shaders
    src/physics/kepler.js     two-body orbital mechanics (AU, days, solar masses)
    scripts/stability.mjs     the N-body stability check
    src/ui/terminal.js        the shell: history, tab completion, clickable commands
    src/ui/commands.js        what the shell knows how to do
    src/term.js               terminal entry: Night City, or the DOM fallback
    src/cyber/                Night City: canvas terminal, CRT, city, post
    src/ui/resumeCommands.js  the résumé shell, shared by both terminals
    src/data/resume.js        résumé content, evidence-backed
    src/ui/variantBar.js      the tmux-style variant switcher
    src/text.js               renders the man page from the same data
    docs/STORIES.md           how it was planned, story by story

Run it locally:

    npm install
    npm run dev

Every push to main builds and deploys to GitHub Pages with
.github/workflows/deploy.yml.
