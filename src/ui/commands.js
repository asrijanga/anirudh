// The shell's vocabulary. Every command prints plain text; a few also move the camera.
export function createCommands({ tour, defs, profile, visit, leave, step, current, slackPing, choo }) {
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
    const pool = parts.length ? ['..', ...tour] : Object.keys(commands).filter((c) => !['slack', 'choo', 'sudo'].includes(c));
    return pool.filter((c) => c.startsWith(w));
  }

  function welcome(t) {
    t.print(`system anirudh: 1 star, ${worldIds.length - 1} worlds, 1 comet.`, 'hi');
    t.print(['type ', { cmd: 'help' }, ', or try ', { cmd: 'tour' }, '  ', { cmd: 'ls' }, '  ', { cmd: 'neofetch' }, '  ', { cmd: 'text' }]);
  }

  return { commands, complete, welcome };
}
