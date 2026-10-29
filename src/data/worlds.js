// Everything the page "knows" about Anirudh lives here, separate from rendering.
// Facts come from his public GitHub profile; the rest is framed as mission logs.

const gh = (repo) => `https://github.com/asrijanga/${repo}`;

export const profile = {
  name: 'Anirudh',
  handle: 'asrijanga',
  github: 'https://github.com/asrijanga',
  city: 'Seattle',
  company: 'Slack',
  githubSince: 2014,
};

// Distances are true to scale; sizes are not, or nothing would be visible.
// Sizes use a square-root compression, stated openly in the UI. `scale true` shows reality.
export const AU = 22; // scene units per astronomical unit
export const SUN = { mass: 1, radiusKm: 695700, displayRadius: 2.4 };
export const displayRadius = (km) => 0.55 * Math.sqrt(km / 6371);

export const star = {
  id: 'star',
  name: 'Anirudh',
  tag: 'The star at the centre',
  log: [
    'Every system needs something to orbit. This one orbits Anirudh: an engineer at Slack, living in Seattle, who builds worlds in his spare time.',
    'He keeps coming back to the same idea: simulate the sky. Planets, orbits, real data from Mars and Mercury, a whole solar system in Rust. So it only felt right that his page should be one.',
    'Click any world to fly there, or take the voyage and visit them in order.',
  ],
  facts: ['Seattle, WA', 'Engineer at Slack', 'On GitHub since 2014'],
  link: { label: 'github.com/asrijanga', href: 'https://github.com/asrijanga' },
};

export const worlds = [
  {
    id: 'swift',
    name: 'Swift',
    tag: 'solar-system-mercury-data',
    kind: 'planet',
    // Mercury-like. Elements (J2000-ish): a in AU, angles in degrees, mass in solar masses.
    orbit: { a: 0.387, e: 0.2056, i: 7.0, node: 48.3, peri: 29.1, M0: 174.8 },
    mass: 1.66e-7,
    radiusKm: 2440,
    tiltDeg: 0.03,
    dayHours: 1407.6,
    palette: ['#4b4a4f', '#8c8781', '#c9c1b6'],
    atmosphere: null,
    noiseScale: 3.2,
    craters: true,
    log: [
      'The innermost world, and the quickest. Swift laps the star while everyone else is still thinking about it.',
      'It stands for solar-system-mercury-data: the raw numbers behind a Mercury that moves the way the real one does. Small repo, precise purpose.',
    ],
    facts: ['Closest orbit', 'Fastest year', 'Made of data'],
    link: { label: 'solar-system-mercury-data', href: gh('solar-system-mercury-data') },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    tag: 'Home · Seattle',
    kind: 'planet',
    // Earth-like.
    orbit: { a: 1.0, e: 0.0167, i: 0.0, node: -11.3, peri: 114.2, M0: 358.6 },
    mass: 3.003e-6,
    radiusKm: 6371,
    tiltDeg: 23.4,
    dayHours: 23.93,
    palette: ['#0e3b5c', '#1f7a5a', '#cfe8dc'],
    ocean: 0.48,
    atmosphere: '#8fd3ff',
    noiseScale: 1.8,
    log: [
      'Home world. Evergreen, mostly water, and permanently a little bit cloudy. You can just about make out a needle on the skyline and a snow-capped mountain that shows up on the clear days.',
      'Anirudh lives in Seattle, the Emerald City, so this is where the system keeps its gravity.',
    ],
    facts: ['Seattle, WA', 'Chance of rain: yes', 'Mountain visible: sometimes'],
  },
  {
    id: 'hashport',
    name: 'Hashport',
    tag: 'Work · Slack',
    kind: 'station',
    // Parked at emerald's L4 Lagrange point: same orbit, 60° ahead. Gravity holds it there.
    trojanOf: 'emerald',
    lead: 60,
    mass: 0,
    radiusKm: 2,
    displayRadius: 0.5,
    tiltDeg: 0,
    dayHours: 0.05,
    palette: ['#4a154b', '#36c5f0', '#ecb22e'],
    log: [
      'Not a planet. A station, parked at Emerald\'s L4 Lagrange point: same orbit as home, 60° ahead, held in place by the balance of two gravities. Hashport is shaped like the symbol at the start of every channel name, and it never stops passing messages between its arms.',
      'Anirudh works at Slack, where the work is keeping a lot of people connected. Hashport keeps the whole system talking.',
    ],
    facts: ['Engineer at Slack', 'Stable at L4', 'Unread: 0 (aspirational)'],
  },
  {
    id: 'ares',
    name: 'Ares Archive',
    tag: 'solar-system-mars-data',
    kind: 'planet',
    // Mars-like.
    orbit: { a: 1.524, e: 0.0934, i: 1.85, node: 49.6, peri: 286.5, M0: 19.4 },
    mass: 3.227e-7,
    radiusKm: 3390,
    tiltDeg: 25.2,
    dayHours: 24.62,
    palette: ['#5a1d10', '#b4492a', '#e6a274'],
    atmosphere: '#ff9a6b',
    noiseScale: 2.4,
    log: [
      'Rust-red and dusty, with beacons that pulse up from the surface like data points being plotted in real time.',
      'This is solar-system-mars-data: real Martian numbers feeding a simulation, because a believable sky starts with honest data.',
    ],
    facts: ['Red', 'Data-driven', 'Beacons online'],
    link: { label: 'solar-system-mars-data', href: gh('solar-system-mars-data') },
  },
  {
    id: 'railhead',
    name: 'Railhead',
    tag: 'train-game',
    kind: 'planet',
    // A Jupiter-mass gas giant at 5.2 AU. It anchors the system, like Jupiter does ours.
    orbit: { a: 5.203, e: 0.0484, i: 1.3, node: 100.5, peri: 273.9, M0: 20.0 },
    mass: 9.548e-4,
    radiusKm: 69911,
    tiltDeg: 3.1,
    dayHours: 9.93,
    palette: ['#6b4a2b', '#c58f4e', '#f1d29a'],
    atmosphere: '#ffd59a',
    noiseScale: 1.5,
    log: [
      'A sandy gas giant wrapped in a railway. It has the mass of Jupiter, and like Jupiter it keeps the rest of the system in line. The train on the ring never stops; somewhere, a tycoon is optimising the timetable.',
      'Railhead is train-game, a railway tycoon built in three.js. Same engine as this page, which makes Railhead the closest thing this system has to a sibling.',
    ],
    facts: ['Railway tycoon', 'three.js', 'Trains on time'],
    link: { label: 'train-game', href: gh('train-game') },
  },
  {
    id: 'ferris',
    name: 'Ferris',
    tag: 'rust-bevy-web-test',
    kind: 'moon',
    parent: 'railhead',
    // A Ganymede-like moon: ~15 railhead radii out, a small fraction of the Hill sphere.
    orbit: { a: 0.007155, e: 0.0013, i: 0.2, node: 0, peri: 0, M0: 90 },
    mass: 7.45e-8,
    radiusKm: 2634,
    tiltDeg: 0,
    dayHours: 171.7, // tidally locked: one day per orbit
    palette: ['#7a2a0e', '#e05a24', '#ffb07a'],
    noiseScale: 3.0,
    log: [
      'A small, crab-orange moon of Railhead, tidally locked like Ganymede. It is named after the Rust mascot, because this is where the Rust experiments live.',
      'rust-bevy-web-test is a solar-system game written in Rust with the Bevy engine and compiled for the web. A whole other system, orbiting quietly inside this one.',
    ],
    facts: ['Rust', 'Bevy', 'WebAssembly'],
    link: { label: 'rust-bevy-web-test', href: gh('rust-bevy-web-test') },
  },
  {
    id: 'verdance',
    name: 'Verdance',
    tag: 'garden-game',
    kind: 'planet',
    // A garden world in the habitable zone, between emerald and ares.
    orbit: { a: 1.26, e: 0.03, i: 1.2, node: 160.0, peri: 40.0, M0: 250.0 },
    mass: 2.7e-6,
    radiusKm: 6100,
    tiltDeg: 17,
    dayHours: 30,
    palette: ['#1d3b1f', '#4f8f3a', '#b6dd7a'],
    atmosphere: '#c8ffb0',
    noiseScale: 2.0,
    log: [
      'A soft world in the habitable zone, just beyond home. Verdance is covered in flowers that sway and open when you come close.',
      'It is garden-game: something slower to set against the trains and the orbital mechanics. Things grow here if you leave them be.',
    ],
    facts: ['Garden game', 'TypeScript', 'Perpetually in bloom'],
    link: { label: 'garden-game', href: gh('garden-game') },
  },
];

for (const w of worlds) w.radius = w.displayRadius ?? displayRadius(w.radiusKm);

// The 2014 Comet carries the timeline. Dates are when each public repo was created.
export const comet = {
  id: 'comet',
  name: 'The 2014 Comet',
  tag: 'The journey so far',
  // Halley-type: massless, highly eccentric, ~22.6 year period. Starts inbound, near perihelion.
  orbit: { a: 8.0, e: 0.9, i: 24, node: 60, peri: 110, M0: -6 },
  mass: 0,
  log: [
    'Some things in a system only come around now and then. This comet left the outer dark in 2014 and has been falling inwards ever since, faster the closer it gets.',
  ],
  timeline: [
    { when: 'Apr 2014', what: 'Joins GitHub as asrijanga. The comet is spotted.' },
    { when: '2014 → 2026', what: 'A long, quiet stretch on the public timeline. Plenty happened; it just wasn\'t pushed here.' },
    { when: 'Sep 2026', what: 'solar-system: "a simulation of all the known worlds". The same day, a second system in Rust and Bevy.' },
    { when: 'Oct 2026', what: 'Real data arrives: Mars, then Mercury.' },
    { when: 'Oct 2026', what: 'garden-game sprouts, then train-game lays its first track.' },
    { when: 'Now', what: 'System Anirudh comes online. You are here.' },
  ],
  coda: 'P.S. This system keeps two secrets. Try typing "slack". Or "choo".',
  facts: ['Period: ~22.6 years', 'Perihelion: 0.8 AU', 'Tail: always points away from the star'],
  link: { label: 'github.com/asrijanga', href: 'https://github.com/asrijanga' },
};
