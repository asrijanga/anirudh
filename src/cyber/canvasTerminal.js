// A terminal emulator that draws into a <canvas>, which the CRT uses as its screen texture.
// Same API as the DOM terminal (print, row, clear, run, type), so the résumé shell drives either.

export const THEMES = {
  neon: {
    bg: '#06040f', ink: '#d6f6ff', dim: '#6f7aa3', hi: '#ff2a6d', head: '#f9f002', cmd: '#05d9e8',
    link: '#ff8ad8', err: '#ff3b5c', ok: '#3cffa0', art: '#ff2a6d', prompt: '#05d9e8',
    barBg: '#ff2a6d', barInk: '#06040f', glow: '#05d9e8', label: 'neon',
  },
  amber: {
    bg: '#0a0602', ink: '#ffd9a0', dim: '#9a7748', hi: '#ffb347', head: '#ffcf70', cmd: '#ffe2b0',
    link: '#ffe2b0', err: '#ff7a4a', ok: '#ffe08a', art: '#ffb347', prompt: '#ffb347',
    barBg: '#ffb347', barInk: '#0a0602', glow: '#ffb347', label: 'amber phosphor',
  },
  green: {
    bg: '#020a04', ink: '#b8ffc4', dim: '#4f8a5a', hi: '#5dff7a', head: '#d4ff9a', cmd: '#9dffb0',
    link: '#9dffb0', err: '#ffd36b', ok: '#5dff7a', art: '#5dff7a', prompt: '#5dff7a',
    barBg: '#5dff7a', barInk: '#020a04', glow: '#5dff7a', label: 'P1 green phosphor',
  },
};

const VARIANTS = [
  { label: '0:term*', href: './' },
  { label: '1:space', href: 'space.html' },
  { label: '2:text', href: 'text.html' },
];

export function createCanvasTerminal({ commands, complete, host = 'nightcity', form, input, srLog }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, fontSize = 26, cw = 16, lh = 34, pad = 40, cols = 80, rows = 30;
  let themeName = 'neon';
  let T = THEMES.neon;

  let entries = []; // { type: 'line', cls, segs } | { type: 'row', width, cls, cells }
  const layoutCache = new WeakMap();
  let scrollOffset = 0;
  let hits = [];
  let dirty = true;
  let cursorOn = true;
  let marquee = null; // { lines, start }
  const history = [];
  let historyIndex = 0;
  const promptText = () => `anirudh@${host}:~$ `;

  // ---------- model ----------
  function normalize(line) {
    const segs = Array.isArray(line) ? line : [line];
    return segs.map((s) => {
      if (typeof s === 'string') return { text: s };
      if (s.cmd) return { text: s.label ?? s.cmd, link: { cmd: s.cmd } };
      if (s.href) return { text: s.label ?? s.href, link: { href: s.href } };
      return { text: s.text ?? '', cls: s.cls };
    });
  }

  function push(entry, plain) {
    entries.push(entry);
    if (entries.length > 1500) entries.splice(0, entries.length - 1500);
    scrollOffset = 0;
    dirty = true;
    if (srLog) {
      const p = document.createElement('p');
      p.textContent = plain;
      srLog.appendChild(p);
      while (srLog.childElementCount > 200) srLog.firstChild.remove();
    }
  }

  const plainOf = (segs) => segs.map((s) => s.text).join('');

  function print(line = '', cls = '') {
    const segs = normalize(line);
    push({ type: 'line', cls, segs }, plainOf(segs));
  }

  function row(cells, { width = 16, cls = '' } = {}) {
    const norm = cells.map(normalize);
    push({ type: 'row', width, cls, cells: norm }, norm.map(plainOf).join('  '));
  }

  function clear() {
    entries = [];
    scrollOffset = 0;
    dirty = true;
  }

  // ---------- layout: entries → visual rows of runs ----------
  // A run is { col, text, cls, link }. Characters inherit the line's class unless a segment has its own.
  function toCells(segs, baseCls) {
    const out = [];
    for (const s of segs) for (const ch of s.text) out.push({ ch, cls: s.cls || baseCls, link: s.link });
    return out;
  }

  function wrap(cells, width, { hard = false } = {}) {
    const lines = [];
    let cur = [];
    const flush = () => (lines.push(cur), (cur = []));
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.ch === '\n') { flush(); continue; }
      cur.push(c);
      if (cur.length > width) {
        if (hard) { cur.pop(); continue; } // art: clip instead of wrapping
        let br = -1;
        for (let k = cur.length - 1; k > 0; k--) if (cur[k].ch === ' ') { br = k; break; }
        if (br > width * 0.4) {
          const rest = cur.slice(br + 1);
          cur = cur.slice(0, br);
          flush();
          cur = rest;
        } else {
          const last = cur.pop();
          flush();
          cur = [last];
        }
      }
    }
    lines.push(cur);
    return lines;
  }

  function runsOf(cells, col0) {
    const runs = [];
    let run = null;
    cells.forEach((c, i) => {
      if (run && run.cls === c.cls && run.link === c.link) run.text += c.ch;
      else runs.push((run = { col: col0 + i, text: c.ch, cls: c.cls, link: c.link }));
    });
    return runs;
  }

  function layoutEntry(e) {
    const cached = layoutCache.get(e);
    if (cached && cached.cols === cols) return cached.rows;
    let out = [];
    if (e.type === 'line') {
      const indent = e.cls === 'indent' ? 2 : 0;
      const lines = wrap(toCells(e.segs, e.cls), cols - indent, { hard: e.cls === 'art' });
      out = lines.map((cells) => runsOf(cells, indent));
    } else {
      const [a, b = []] = e.cells.map((segs) => toCells(segs, e.cls));
      if (cols >= 60) {
        const left = wrap(a, e.width - 1);
        const right = wrap(b, cols - e.width - 2);
        for (let i = 0; i < Math.max(left.length, right.length); i++) {
          out.push([...runsOf(left[i] ?? [], 0), ...runsOf(right[i] ?? [], e.width + 2)]);
        }
      } else {
        // narrow screens: stack the columns
        out = [...wrap(a, cols).map((c) => runsOf(c, 0)), ...wrap(b, cols - 2).map((c) => runsOf(c, 2))];
      }
    }
    layoutCache.set(e, { cols, rows: out });
    return out;
  }

  function promptRows() {
    const cells = [
      ...toCells([{ text: promptText() }], 'prompt'),
      ...toCells([{ text: input.value }], ''),
    ];
    const lines = wrap(cells, cols - 1, {});
    const rowsOut = lines.map((c) => runsOf(c, 0));
    return { rows: rowsOut, cursorCol: lines[lines.length - 1].length };
  }

  // ---------- drawing ----------
  function colorFor(run) {
    if (run.link?.cmd) return T.cmd;
    if (run.link?.href) return T.link;
    return T[run.cls] ?? T.ink;
  }

  function draw(now) {
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'top';
    hits = [];

    const all = [];
    for (const e of entries) {
      const rs = layoutEntry(e);
      if (e.cls === 'echo' || e.cls === 'head') all.push({ gap: true });
      for (const r of rs) all.push(r);
    }
    const prompt = promptRows();
    const contentRows = rows - 1; // the last row is the status bar
    const total = all.length + prompt.rows.length;
    const maxScroll = Math.max(0, total - contentRows);
    scrollOffset = Math.min(scrollOffset, maxScroll);
    const end = total - scrollOffset;
    const start = Math.max(0, end - contentRows);

    ctx.shadowColor = T.glow;
    ctx.shadowBlur = fontSize * 0.35;
    for (let i = start; i < end; i++) {
      const y = pad + (i - start) * lh;
      const isPrompt = i >= all.length;
      const r = isPrompt ? prompt.rows[i - all.length] : all[i];
      if (!r || r.gap) continue;
      for (const run of r) {
        const x = pad + run.col * cw;
        ctx.fillStyle = colorFor(run);
        ctx.fillText(run.text, x, y);
        if (run.link) {
          const w = run.text.length * cw;
          ctx.fillRect(x, y + fontSize * 1.08, w, Math.max(1.5, fontSize * 0.06));
          hits.push({ x, y: y - lh * 0.15, w, h: lh, link: run.link });
        }
      }
      if (isPrompt && i === total - 1 && cursorOn) {
        ctx.fillStyle = T.prompt;
        ctx.fillRect(pad + prompt.cursorCol * cw, y + 2, cw * 0.9, fontSize * 1.12);
      }
    }
    ctx.shadowBlur = 0;

    if (scrollOffset > 0) {
      ctx.fillStyle = T.dim;
      const msg = `-- ${scrollOffset} more below --`;
      ctx.fillText(msg, W - pad - msg.length * cw, pad + (contentRows - 1) * lh);
    }

    drawStatusBar();
    if (marquee) drawMarquee(now);
  }

  function drawStatusBar() {
    const y = H - pad * 0.5 - lh;
    ctx.fillStyle = T.barBg;
    ctx.fillRect(0, y - lh * 0.15, W, lh * 1.2);
    let x = pad;
    const put = (text, link, bold) => {
      ctx.font = `${bold ? '700 ' : ''}${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillStyle = T.barInk;
      ctx.fillText(text, x, y);
      if (link) hits.push({ x, y: y - lh * 0.15, w: text.length * cw, h: lh * 1.2, link });
      x += (text.length + 2) * cw;
    };
    put('[anirudh]', null, true);
    for (const v of VARIANTS) put(v.label, { href: v.href }, true);
    const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    const right = cols > 60 ? `seattle ${time}` : time;
    ctx.font = `700 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillText(right, W - pad - right.length * cw, y);
  }

  function drawMarquee(now) {
    const k = (now - marquee.start) / 6000;
    if (k >= 1) { marquee = null; return; }
    const width = Math.max(...marquee.lines.map((l) => l.length)) * cw;
    const x = W - k * (W + width);
    const y0 = H / 2 - (marquee.lines.length * lh) / 2;
    ctx.shadowColor = T.glow;
    ctx.shadowBlur = fontSize * 0.5;
    marquee.lines.forEach((l, i) => {
      ctx.fillStyle = T.bg;
      ctx.fillRect(x - cw, y0 + i * lh, l.length * cw + 2 * cw, lh);
      ctx.fillStyle = T.hi;
      ctx.fillText(l, x, y0 + i * lh);
    });
    ctx.shadowBlur = 0;
  }

  // ---------- commands ----------
  function run(line) {
    const trimmed = line.trim();
    print([{ text: promptText(), cls: 'prompt' }, trimmed], 'echo');
    if (!trimmed) return;
    history.push(trimmed);
    historyIndex = history.length;
    const [name, ...args] = trimmed.split(/\s+/);
    const cmd = commands[name.toLowerCase()];
    if (cmd) cmd(args, api);
    else print([`${name}: command not found. try `, { cmd: 'help' }], 'err');
  }

  async function type(line, { delay = 30, skip = () => false } = {}) {
    for (const ch of line) {
      if (skip()) break;
      input.value += ch;
      dirty = true;
      await new Promise((r) => setTimeout(r, delay));
    }
    input.value = '';
    run(line);
  }

  // ---------- input ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value;
    input.value = '';
    run(line);
  });
  input.addEventListener('input', () => {
    scrollOffset = 0;
    dirty = true;
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      if (!history.length) return;
      e.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] ?? '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.value.split(/\s+/);
      const word = parts.pop() ?? '';
      const matches = complete(parts, word);
      if (matches.length === 1) {
        parts.push(matches[0]);
        input.value = parts.join(' ') + ' ';
      } else if (matches.length > 1) print(matches.join('   '), 'dim');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clear();
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      scroll(e.key === 'PageUp' ? rows - 3 : -(rows - 3));
    }
    dirty = true;
  });

  function scroll(deltaRows) {
    scrollOffset = Math.max(0, scrollOffset + Math.round(deltaRows));
    dirty = true;
  }

  // Canvas-pixel hit test for links and commands.
  function hitTest(px, py) {
    return hits.find((h) => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h)?.link ?? null;
  }

  function activate(link) {
    if (link.cmd) run(link.cmd);
    else if (link.href.startsWith('http')) window.open(link.href, '_blank', 'noopener');
    else window.location.href = link.href;
  }

  function resize(width, height, size) {
    W = canvas.width = width;
    H = canvas.height = height;
    fontSize = size;
    ctx.font = `${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
    cw = ctx.measureText('M').width;
    lh = Math.round(fontSize * 1.38);
    pad = Math.round(fontSize * 1.4);
    cols = Math.floor((W - pad * 2) / cw);
    rows = Math.floor((H - pad * 1.5) / lh);
    dirty = true;
  }

  // Called every frame; returns true when the texture needs uploading.
  let lastMinute = -1;
  function tick(now) {
    const on = Math.floor(now / 530) % 2 === 0;
    if (on !== cursorOn) (cursorOn = on), (dirty = true);
    const minute = Math.floor(Date.now() / 60000);
    if (minute !== lastMinute) (lastMinute = minute), (dirty = true);
    if (marquee) dirty = true;
    if (!dirty) return false;
    draw(now);
    dirty = false;
    return true;
  }

  const api = {
    canvas,
    print,
    row,
    clear,
    run,
    type,
    input,
    tick,
    hitTest,
    activate,
    scroll,
    resize,
    renderPrompt: () => (dirty = true),
    invalidate: () => (dirty = true),
    marquee(text) {
      marquee = { lines: text.split('\n'), start: performance.now() };
    },
    setTheme(name) {
      themeName = name;
      T = THEMES[name];
      dirty = true;
      api.onTheme?.(name, T);
    },
    get theme() {
      return T.label;
    },
    get themeName() {
      return themeName;
    },
    get colors() {
      return T;
    },
    get cols() {
      return cols;
    },
    set follow(v) {
      if (v) scrollOffset = 0;
    },
  };
  return api;
}
