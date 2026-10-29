// The shell's vocabulary. Every command prints plain text; a few also move the camera.
export function createCommands({ tour, defs, profile, visit, leave, step, current, slackPing, choo, sim, describe }) {
  const worldIds = tour.filter((id) => id !== 'star');

  function resolve(name) {
    const q = name.toLowerCase().replace(/^~\/(worlds\/)?/, '').replace(/\/$/, '');
    if (['', '~', '/', '..', 'home'].includes(q)) return 'home';
    if (['star', 'anirudh', 'sun'].includes(q)) return 'star';
    if (defs.has(q)) return q;
    for (const [id, def] of defs) if (def.name.toLowerCase().startsWith(q)) return id;
    return null;
  }

  const commands = {
    help(_, t) {
      t.print('commands:', 'hi');
      const rows = [
        ['tour', 'take the guided voyage through every world'],
        ['ls', 'list the worlds'],
        ['cd <world>', 'fly to a world   (cd .. to come back)'],
        ['cat [world]', 'read a world\'s log'],
        ['open', 'open the current world\'s repo'],
        ['next / prev', 'step through the voyage   (or ← →)'],
        ['warp [rate]', 'time per second: pause 1d 1w 1m 1y'],
        ['scale [mode]', 'sizes: true or readable (distances are always true)'],
        ['date', 'the simulated date'],
        ['whoami', 'the short version'],
        ['neofetch', 'system information'],
        ['text', 'the whole page as plain text'],
        ['clear', 'clear the screen   (ctrl+l)'],
      ];
      for (const [cmd, desc] of rows) {
        const name = cmd.split(' ')[0];
        t.print(['  ', { cmd: name, label: cmd }, ' '.repeat(Math.max(1, 14 - cmd.length)) + desc]);
      }
      t.print('there may also be a secret or two.', 'dim');
    },

    ls(_, t) {
      for (const id of worldIds) {
        const def = defs.get(id);
        t.print([{ cmd: `cd ${id}`, label: `${id}/` }, ' '.repeat(Math.max(1, 11 - id.length)) + `# ${def.tag}`]);
      }
    },

    cd([target = '~'], t) {
      const id = resolve(target);
      if (id === 'home') return leave();
      if (!id) return t.print(`cd: no such world: ${target}`, 'err');
      visit(id);
    },

    cat([target], t) {
      const id = target ? resolve(target) : current() ?? 'star';
      if (!id || id === 'home') return t.print(`cat: ${target}: no such world`, 'err');
      const def = defs.get(id);
      t.print(def.name, 'hi');
      for (const p of def.log) t.print(p);
      for (const { when, what } of def.timeline ?? []) t.print(`${when.padEnd(12)}${what}`);
      for (const line of describe(id)) t.print(line, 'dim');
    },

    warp([rate], t) {
      if (!rate) return t.print(`warp: ${sim.warp}/s   options: ${sim.warps.join(' ')}`);
      if (rate === '0' || rate === 'stop') rate = 'pause';
      if (!sim.setWarp(rate)) return t.print(`warp: unknown rate ${rate}. try ${sim.warps.join(' ')}`, 'err');
      t.print(rate === 'pause' ? 'time stopped. the orbits wait for you.' : `time warp: ${rate} per second`);
    },

    scale([mode], t) {
      const on = mode === 'true' || mode === 'real';
      if (mode && !on && mode !== 'readable') return t.print('scale: try `scale true` or `scale readable`', 'err');
      if (!mode) {
        t.print('distances: true (1 AU = 22 units). sizes: compressed with a square root so you can see them.');
        return t.print(['try ', { cmd: 'scale true', label: 'scale true' }, ' to see how empty space really is.']);
      }
      sim.setTrueScale(on);
      t.print(
        on
          ? 'true scale. the worlds shrink to specks: space is mostly space. labels still find them.'
          : 'readable scale: sizes compressed (√), distances and periods still true.'
      );
    },

    date(_, t) {
      t.print(`${sim.date.toUTCString().slice(0, 16)}  (simulated, warp ${sim.warp}/s)`);
    },

    open([target], t) {
      const id = target ? resolve(target) : current() ?? 'star';
      const link = defs.get(id)?.link;
      if (!link) return t.print('open: nothing to open here', 'err');
      window.open(link.href, '_blank', 'noopener');
      t.print(['opening ', { href: link.href, label: link.href.replace('https://', '') }]);
    },

    tour() {
      visit(tour[0]);
    },
    next() {
      step(1);
    },
    prev() {
      step(-1);
    },

    pwd(_, t) {
      const id = current();
      t.print(!id || id === 'star' ? '/home/anirudh' : `/home/anirudh/worlds/${id}`);
    },

    whoami(_, t) {
      t.print('anirudh', 'hi');
      t.print(`engineer at ${profile.company}. lives in ${profile.city}. on github since ${profile.githubSince}.`);
      t.print('keeps building solar systems, trains and gardens. this page is the latest one.');
    },

    neofetch(_, t) {
      const art = [
        '      .   *   .    ',
        '   *   \\  |  /   * ',
        '     -- ( @ ) --   ',
        '   *   /  |  \\   * ',
        '      .   *   .    ',
        '                   ',
        '                   ',
      ];
      const info = [
        ['', 'anirudh@system'],
        ['', '--------------'],
        ['os', 'System Anirudh (three.js)'],
        ['physics', 'Kepler orbits, N-body checked'],
        ['host', `${profile.city}, WA`],
        ['work', profile.company],
        ['uptime', `on github since ${profile.githubSince}`],
        ['worlds', `${worldIds.length - 1} + 1 comet`],
        ['shell', 'you are in it'],
        ['theme', 'amber phosphor'],
      ];
      info.forEach(([k, v], i) => {
        const left = (art[i] ?? ' '.repeat(19)) + '  ';
        t.print(left + (k ? `${k}: `.padEnd(8) : '') + v, 'art');
      });
    },

    text() {
      window.location.href = 'text.html';
    },

    clear(_, t) {
      t.clear();
    },

    exit(_, t) {
      leave();
      t.print('there is no exit. only orbits.', 'dim');
    },

    sudo(_, t) {
      t.print('anirudh is not in the sudoers file. this incident will be reported.', 'err');
    },

    slack(_, t) {
      slackPing();
      t.print('#general: every world just said hi to the star.', 'hi');
    },

    choo(_, t) {
      choo();
      t.print('railhead express: all aboard. choo choo!', 'hi');
    },
  };

  function complete(parts, word) {
    const w = word.toLowerCase();
    if (parts[0] === 'warp') return sim.warps.filter((c) => c.startsWith(w));
    if (parts[0] === 'scale') return ['true', 'readable'].filter((c) => c.startsWith(w));
    const pool = parts.length ? ['..', ...tour] : Object.keys(commands).filter((c) => !['slack', 'choo', 'sudo'].includes(c));
    return pool.filter((c) => c.startsWith(w));
  }

  function welcome(t) {
    t.print(`system anirudh: 1 star, ${worldIds.length - 1} worlds, 1 comet.`, 'hi');
    t.print(['type ', { cmd: 'help' }, ', or try ', { cmd: 'tour' }, '  ', { cmd: 'ls' }, '  ', { cmd: 'neofetch' }, '  ', { cmd: 'text' }]);
  }

  return { commands, complete, welcome };
}
