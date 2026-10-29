// A small shell pinned to the bottom of the page.
// `commands` maps a name to (args, term) => void; `complete` returns candidates for tab completion.
// `scroll`: 'output' scrolls the output box (overlay layout); 'page' scrolls the window (full-screen layout).
export function createTerminal(root, { commands, complete, prompt = () => '~', maxLines = 60, scroll = 'output' }) {
  root.innerHTML = `
    <div class="term-out" aria-live="polite"></div>
    <form class="term-line" autocomplete="off">
      <label class="term-prompt" for="term-input"></label>
      <input id="term-input" class="term-input" spellcheck="false" autocapitalize="off" autocorrect="off"
             enterkeyhint="go" aria-label="Command line. Type help for commands." />
    </form>
  `;
  const out = root.querySelector('.term-out');
  const form = root.querySelector('.term-line');
  const input = root.querySelector('.term-input');
  const promptEl = root.querySelector('.term-prompt');
  const history = [];
  let historyIndex = 0;
  let follow = true; // auto-scroll on print; switched off while the boot sequence prints the résumé

  function renderPrompt() {
    promptEl.textContent = `anirudh@system:${prompt()}$`;
  }

  // Lines can be plain strings or arrays of segments: strings, { cmd } (a clickable command),
  // { href } (a link) or { text, cls } (styled text).
  function append(parent, line) {
    const segments = Array.isArray(line) ? line : [line];
    for (const seg of segments) {
      if (typeof seg === 'string') parent.appendChild(document.createTextNode(seg));
      else if (seg.cmd) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'term-cmd';
        b.textContent = seg.label ?? seg.cmd;
        b.addEventListener('click', () => run(seg.cmd));
        parent.appendChild(b);
      } else if (seg.href) {
        const a = document.createElement('a');
        a.href = seg.href;
        a.target = seg.href.startsWith('http') ? '_blank' : '_self';
        a.rel = 'noopener';
        a.textContent = seg.label ?? seg.href;
        parent.appendChild(a);
      } else if (seg.text != null) {
        const span = document.createElement('span');
        span.className = seg.cls ?? '';
        span.textContent = seg.text;
        parent.appendChild(span);
      }
    }
  }

  function print(line = '', cls = '') {
    const div = document.createElement('div');
    div.className = `term-row ${cls}`.trim();
    append(div, line);
    return emit(div);
  }

  // A two-column row; the first column is `width` characters wide (stacks on narrow screens).
  function row(cells, { width = 16, cls = '' } = {}) {
    const div = document.createElement('div');
    div.className = `term-row cols ${cls}`.trim();
    div.style.setProperty('--c1', `${width}ch`);
    for (const cell of cells) {
      const span = document.createElement('span');
      append(span, cell);
      div.appendChild(span);
    }
    return emit(div);
  }

  function emit(div) {
    out.appendChild(div);
    while (out.children.length > maxLines) out.firstChild.remove();
    if (!follow) return div;
    if (scroll === 'page') form.scrollIntoView({ block: 'end' });
    else out.scrollTop = out.scrollHeight;
    return div;
  }

  function clear() {
    out.innerHTML = '';
  }

  function run(line) {
    const trimmed = line.trim();
    print(`anirudh@system:${prompt()}$ ${trimmed}`, 'echo');
    if (!trimmed) return;
    history.push(trimmed);
    historyIndex = history.length;
    const [name, ...args] = trimmed.split(/\s+/);
    const cmd = commands[name.toLowerCase()];
    if (cmd) cmd(args, api);
    else print([`${name}: command not found. try `, { cmd: 'help' }], 'err');
    renderPrompt();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value;
    input.value = '';
    run(line);
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
      } else if (matches.length > 1) {
        print(matches.join('   '), 'dim');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clear();
    }
  });

  // Type a command out character by character, then run it (used by the boot sequence).
  async function type(line, { delay = 22, skip = () => false } = {}) {
    for (const ch of line) {
      if (skip()) break;
      input.value += ch;
      await new Promise((r) => setTimeout(r, delay));
    }
    input.value = '';
    run(line);
  }

  const api = {
    print,
    row,
    clear,
    run,
    type,
    input,
    renderPrompt,
    set follow(v) {
      follow = v;
    },
  };
  renderPrompt();
  return api;
}
