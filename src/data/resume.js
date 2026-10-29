// The résumé behind the terminal variant.
// Rule: nothing is claimed without public evidence. Each skill names where it can be seen.
// Fields marked `fill in` are hidden until Anirudh sets them.

import { profile } from './worlds.js';

const gh = (repo) => `https://github.com/asrijanga/${repo}`;

export const resume = {
  name: 'Anirudh',
  handle: profile.handle,
  headline: 'Software engineer · builds simulations, games and 3D on the web',
  location: `${profile.city}, WA`,
  summary: [
    `Engineer at ${profile.company}, based in ${profile.city}.`,
    'Spends his own time building worlds: solar-system simulations fed by real planetary data, a railway tycoon and a garden game in three.js, and a Rust/Bevy experiment compiled for the web.',
  ],

  links: [
    { label: 'github', href: profile.github },
    // { label: 'linkedin', href: '' },  // fill in
    // { label: 'email', href: 'mailto:' },  // fill in
  ],

  experience: [
    {
      org: profile.company,
      role: 'Engineer', // fill in: exact title
      when: '', // fill in: e.g. '2021 – now'
      where: profile.city,
      notes: [], // fill in: a few lines on scope and impact
    },
  ],

  // Grouped skills, each with the public work that shows it.
  skills: [
    { area: '3D & graphics', items: ['three.js', 'WebGL', 'GLSL shaders', 'procedural generation'], evidence: ['train-game', 'solar-system', 'this page'] },
    { area: 'Simulation', items: ['orbital mechanics', 'N-body integration', 'real ephemeris data'], evidence: ['solar-system', 'solar-system-mars-data', 'solar-system-mercury-data'] },
    { area: 'Game dev', items: ['game loops', 'ECS (Bevy)', 'tycoon & sim design'], evidence: ['train-game', 'garden-game', 'rust-bevy-web-test'] },
    { area: 'Languages', items: ['TypeScript', 'JavaScript', 'Rust'], evidence: ['solar-system', 'garden-game', 'train-game', 'rust-bevy-web-test'] },
    { area: 'Web platform', items: ['Vite', 'WebAssembly', 'GitHub Actions', 'GitHub Pages'], evidence: ['rust-bevy-web-test', 'this page'] },
  ],

  projects: [
    { id: 'solar-system', href: gh('solar-system'), lang: 'TypeScript', blurb: 'A simulation of all the known worlds in the solar system.' },
    { id: 'train-game', href: gh('train-game'), lang: 'JavaScript', blurb: 'A railway tycoon built with three.js.' },
    { id: 'garden-game', href: gh('garden-game'), lang: 'TypeScript', blurb: 'A slower game about growing things.' },
    { id: 'rust-bevy-web-test', href: gh('rust-bevy-web-test'), lang: 'Rust', blurb: 'A solar-system game in Rust with Bevy, built for the web.' },
    { id: 'solar-system-mars-data', href: gh('solar-system-mars-data'), lang: 'data', blurb: 'Mars data for the solar-system simulation.' },
    { id: 'solar-system-mercury-data', href: gh('solar-system-mercury-data'), lang: 'data', blurb: 'Mercury data for the solar-system simulation.' },
    { id: 'anirudh', href: gh('anirudh'), lang: 'JavaScript', blurb: 'This page: a terminal, a Kepler-accurate planetary system, and a man page.' },
  ],
};
