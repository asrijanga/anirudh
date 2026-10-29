import './text.css';
import { profile, star, worlds, comet } from './data/worlds.js';

// Renders the whole system as a man page: ANIRUDH(1).
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const man = document.getElementById('man');
const section = (name) => {
  const s = el('section');
  s.appendChild(el('h2', null, name));
  man.appendChild(s);
  return s;
};
const para = (parent, text) => parent.appendChild(el('p', null, text));
const link = (parent, href, label = href.replace('https://', '')) => {
  const p = el('p');
  const a = el('a', null, label);
  a.href = href;
  p.appendChild(a);
  parent.appendChild(p);
};

const header = el('header', 'man-head');
header.append(el('span', null, 'ANIRUDH(1)'), el('span', 'mid', 'User Commands'), el('span', null, 'ANIRUDH(1)'));
man.appendChild(header);

const name = section('NAME');
para(name, 'anirudh - engineer, world-builder, occasional railway tycoon');

const synopsis = section('SYNOPSIS');
para(synopsis, `anirudh [--city ${profile.city.toLowerCase()}] [--work ${profile.company.toLowerCase()}] [--since ${profile.githubSince}] [world ...]`).className = 'code';

const desc = section('DESCRIPTION');
for (const p of star.log.slice(0, 2)) para(desc, p);
para(desc, 'This page is the plain text version of System Anirudh, a planetary system built in three.js where every world stands for something he has made or cares about. The 3D version has a shell; this one is just text.');

const ws = section('WORLDS');
for (const w of worlds) {
  const item = el('div', 'world');
  item.appendChild(el('h3', null, `${w.id}`));
  item.lastChild.appendChild(el('span', 'tag', `  ${w.tag}`));
  const body = el('div', 'indent');
  for (const p of w.log) para(body, p);
  if (w.facts?.length) para(body, w.facts.join(' · ')).className = 'facts';
  if (w.link) link(body, w.link.href);
  item.appendChild(body);
  ws.appendChild(item);
}

const hist = section('HISTORY');
const dl = el('dl');
for (const { when, what } of comet.timeline) dl.append(el('dt', null, when), el('dd', null, what));
hist.appendChild(dl);

const files = section('FILES');
para(files, 'docs/STORIES.md    how this page was planned, story by story').className = 'code';
para(files, 'src/data/worlds.js everything the page knows, in one file').className = 'code';

const bugs = section('BUGS');
para(bugs, 'The trains never arrive because the track is a circle. Working as intended.');
para(bugs, 'The 3D version keeps a couple of secrets. They are not documented here.');

const see = section('SEE ALSO');
const seeP = el('p');
const a3d = el('a', null, 'system-anirudh(3d)');
a3d.href = './';
const agh = el('a', null, 'github(1)');
agh.href = profile.github;
seeP.append(a3d, ', ', agh);
see.appendChild(seeP);

const footer = el('footer', 'man-head');
footer.append(el('span', null, 'System Anirudh'), el('span', 'mid', String(new Date().getFullYear())), el('span', null, 'ANIRUDH(1)'));
man.appendChild(footer);
