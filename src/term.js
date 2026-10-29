import './term.css';
import { createTerminal } from './ui/terminal.js';
import { mountVariantBar } from './ui/variantBar.js';
import { resume } from './data/resume.js';
import { profile } from './data/worlds.js';

// The terminal variant: a résumé that prints itself, then lets you type at it.

// "anirudh" in a figlet Standard-style font, unsmushed for readability.
const BANNER = [
  '                 _                      _   _',
  '  __ _   _ __   (_)  _ __   _   _    __| | | |__',
  " / _` | | '_ \\  | | | '__| | | | |  / _` | | '_ \\",
  '| (_| | | | | | | | | |    | |_| | | (_| | | | | |',
  ' \\__,_| |_| |_| |_| |_|     \\__,_|  \\__,_| |_| |_|',
].join('\n');

// Where each project lives in the outer space variant.
const WORLD_FOR = {
  'solar-system': 'star',
  'train-game': 'railhead',
  'garden-game': 'verdance',
  'rust-bevy-web-test': 'ferris',
  'solar-system-mars-data': 'ares',
  'solar-system-mercury-data': 'swift',
  anirudh: 'star',
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = window.matchMedia('(pointer: coarse)').matches;
const projects = Object.fromEntries(resume.projects.map((p) => [p.id, p]));
const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));

const commands = {
  help(_, t) {
    t.print('commands', 'head');
    const rows = [
      ['whoami', 'the short version'],
      ['skills', 'what he works with, and where you can see it'],
      ['projects', 'things he has built   (alias: ls)'],
      ['cat <project>', 'details on one project'],
      ['open <project>', 'open it on github'],
      ['experience', 'work history'],
      ['contact', 'where to find him'],
      ['resume', 'print everything again'],
      ['neofetch', 'system information'],
      ['space', 'the outer space variant (3D)'],
      ['text', 'the plain text variant'],
      ['clear', 'clear the screen   (ctrl+l)'],
    ];
    for (const [cmd, desc] of rows) t.row([[{ cmd: cmd.split(' ')[0], label: cmd }], desc], { width: 17 });
    t.print('tab completes, ↑/↓ for history. a few things are not listed.', 'dim');
  },

  whoami(_, t) {
    t.print(`${resume.name.toLowerCase()} · ${resume.headline}`, 'head');
    t.print(resume.location, 'dim');
    for (const line of resume.summary) t.print(line);
  },

  skills(_, t) {
    t.print('skills', 'head');
    for (const s of resume.skills) {
      const evidence = [];
      s.evidence.forEach((e, i) => {
        if (i) evidence.push(', ');
        evidence.push(projects[e] ? { cmd: `cat ${e}`, label: e } : e);
      });
      t.row([s.area, [s.items.join(' · '), '\n', { text: 'seen in ', cls: 'dim' }, ...evidence]], { width: 16 });
    }
  },

  projects(_, t) {
    t.print('projects', 'head');
    for (const p of resume.projects) {
      t.row([[{ cmd: `cat ${p.id}`, label: p.id }], [p.blurb, { text: `  ${p.lang}`, cls: 'dim' }]], { width: 27 });
    }
  },

  cat([id], t) {
    if (!id) return t.print(['cat: which one? try ', { cmd: 'projects' }], 'err');
    const p = projects[id.replace(/\/$/, '')];
    if (!p) return t.print(`cat: ${id}: no such project`, 'err');
    t.print(p.id, 'head');
    t.print(p.blurb);
    t.print(`language   ${p.lang}`, 'dim');
    t.print(['source     ', { href: p.href, label: p.href.replace('https://', '') }]);
    const world = WORLD_FOR[p.id];
    if (world) {
      t.print(['in space   ', { href: `space.html#${world}`, label: `~/worlds/${world}` }, world === 'star' ? ' (the star itself)' : '']);
    }
  },

  open([id], t) {
    const p = projects[id] ?? (id ? null : { href: profile.github });
    if (!p) return t.print(`open: ${id}: no such project`, 'err');
    window.open(p.href, '_blank', 'noopener');
    t.print(['opening ', { href: p.href, label: p.href.replace('https://', '') }]);
  },

  experience(_, t) {
    t.print('experience', 'head');
    for (const job of resume.experience) {
      t.print([job.role, ' @ ', job.org, job.when ? `   ${job.when}` : ''].join(''));
      if (job.where) t.print(job.where, 'dim');
      for (const n of job.notes) t.print(`- ${n}`, 'indent');
    }
  },

  contact(_, t) {
    t.print('contact', 'head');
    for (const l of resume.links) t.row([l.label, [{ href: l.href, label: l.href.replace(/^(https:\/\/|mailto:)/, '') }]], { width: 11 });
  },

  async resume(_, t) {
    for (const c of ['whoami', 'skills', 'projects', 'experience', 'contact']) {
      t.print('');
      commands[c]([], t);
    }
  },

  neofetch(_, t) {
    const art = BANNER.split('\n');
    const info = [
      'anirudh@system',
      '--------------',
      `role:    ${resume.experience[0].role} @ ${resume.experience[0].org}`,
      `host:    ${resume.location}`,
      `langs:   TypeScript, JavaScript, Rust`,
      `likes:   orbits, trains, gardens`,
      `uptime:  on github since ${profile.githubSince}`,
      `shell:   you are in it`,
      `theme:   amber phosphor`,
    ];
    const width = Math.max(...art.map((l) => l.length)) + 3;
    info.forEach((line, i) => t.print(pad(art[i] ?? '', width) + line, 'art'));
  },

  ls(args, t) {
    commands.projects(args, t);
  },
  space() {
    window.location.href = 'space.html';
  },
  text() {
    window.location.href = 'text.html';
  },
  clear(_, t) {
    t.clear();
  },
  history(_, t) {
    t.print('there is no history here yet. only orbits.', 'dim');
  },
  exit(_, t) {
    t.print('logout? you can check out any time you like, but you can never leave.', 'dim');
  },
  sudo(_, t) {
    t.print('anirudh is not in the sudoers file. this incident will be reported.', 'err');
  },
  hire(_, t) {
    t.print(['excellent choice. ', { cmd: 'contact' }, ' is a good place to start.'], 'ok');
  },
  slack(_, t) {
    t.print('#general  anirudh: 👋 (typed from a terminal, naturally)', 'hi');
  },
  sl: steamLocomotive,
  choo: steamLocomotive,
};

// The classic `sl` joke: a train crosses the screen.
const TRAIN = String.raw`
      ooOOOOOOoo
     oO
    _||____  ___________________   ___________________
   |  []   ||  railhead express ||  |  train-game     |
  /|_______||___________________|| _|_________________|
  \_O=====O__O=O=========O=O_____|=|__O=O=========O=O_|`.slice(1);

function steamLocomotive(_, t) {
  if (reducedMotion) return t.print(TRAIN, 'art');
  const pre = document.createElement('pre');
  pre.className = 'sl';
  pre.setAttribute('aria-hidden', 'true');
  pre.textContent = TRAIN;
  document.body.appendChild(pre);
  pre.addEventListener('animationend', () => pre.remove());
  t.print('choo choo.', 'dim');
}

function complete(parts, word) {
  const w = word.toLowerCase();
  if (parts.length && ['cat', 'open'].includes(parts[0])) return Object.keys(projects).filter((p) => p.startsWith(w));
  if (parts.length) return [];
  const hidden = ['sudo', 'slack', 'sl', 'choo', 'hire', 'exit', 'history'];
  return Object.keys(commands).filter((c) => !hidden.includes(c) && c.startsWith(w));
}

const term = createTerminal(document.getElementById('shell'), {
  commands,
  complete,
  maxLines: 2000,
  scroll: 'page',
});
mountVariantBar('term');

// Typing anywhere lands on the prompt.
window.addEventListener('keydown', (e) => {
  if (e.target === term.input || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length === 1 && !e.target.closest?.('a, button')) term.input.focus();
});

// Boot: the banner, then the résumé types itself out. Any key or click skips the typing.
async function boot() {
  let skip = reducedMotion;
  const skipNow = () => (skip = true);
  window.addEventListener('keydown', skipNow, { once: true });
  window.addEventListener('pointerdown', skipNow, { once: true });

  term.follow = false; // read from the top; don't chase the cursor while the résumé prints
  term.print(BANNER, 'art');
  term.print(`last login: ${new Date().toDateString().toLowerCase()} from ${profile.city.toLowerCase()}`, 'dim');
  for (const c of ['whoami', 'skills', 'projects', 'experience', 'contact']) {
    await term.type(c, { delay: skip ? 0 : 28, skip: () => skip });
  }
  term.print('');
  term.print(['type ', { cmd: 'help' }, ', or try ', { cmd: 'neofetch' }, '  ', { cmd: 'space' }, '  ', { cmd: 'text' }], 'dim');
  term.follow = true;
  if (!touch) term.input.focus({ preventScroll: true });
}
boot();
