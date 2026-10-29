import './variantBar.css';

// A tmux-style status bar listing the three variants as windows: [anirudh] 0:term* 1:space 2:text
export const VARIANTS = [
  { id: 'term', href: './', title: 'terminal résumé' },
  { id: 'space', href: 'space.html', title: 'outer space (3D)' },
  { id: 'text', href: 'text.html', title: 'plain text man page' },
];

export function mountVariantBar(current, { right = () => '' } = {}) {
  const bar = document.createElement('nav');
  bar.className = 'vbar';
  bar.setAttribute('aria-label', 'Variants');
  const session = document.createElement('span');
  session.className = 'vbar-session';
  session.textContent = '[anirudh]';
  bar.appendChild(session);
  VARIANTS.forEach((v, i) => {
    const a = document.createElement('a');
    a.href = v.href;
    a.title = v.title;
    a.textContent = `${i}:${v.id}${v.id === current ? '*' : ''}`;
    if (v.id === current) a.setAttribute('aria-current', 'page');
    bar.appendChild(a);
  });
  const clock = document.createElement('span');
  clock.className = 'vbar-right';
  bar.appendChild(clock);
  const tick = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    clock.textContent = `${right()} seattle ${time}`.trim();
  };
  tick();
  setInterval(tick, 15000);
  document.body.appendChild(bar);
  return { tick };
}
