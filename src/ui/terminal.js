// A small shell pinned to the bottom of the page.
// `commands` maps a name to (args, term) => void; `complete` returns candidates for tab completion.
export function createTerminal(root, { commands, complete, prompt = () => '~' }) {
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
  const MAX_LINES = 60;

  function renderPrompt() {
    promptEl.textContent = `anirudh@system:${prompt()}$`;
  }

  // Lines can be plain strings or arrays of segments: strings and { cmd } (a clickable command).
  function print(line = '', cls = '') {
    const div = document.createElement('div');
    div.className = `term-row ${cls}`.trim();
    const segments = Array.isArray(line) ? line : [line];
    for (const seg of segments) {
      if (typeof seg === 'string') div.appendChild(document.createTextNode(seg));
      else if (seg.cmd) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'term-cmd';
        b.textContent = seg.label ?? seg.cmd;
        b.addEventListener('click', () => run(seg.cmd));
        div.appendChild(b);
      } else if (seg.href) {
        const a = document.createElement('a');
        a.href = seg.href;
        a.target = seg.href.startsWith('http') ? '_blank' : '_self';
        a.rel = 'noopener';
        a.textContent = seg.label ?? seg.href;
        div.appendChild(a);
      }
    }
    out.appendChild(div);
    while (out.children.length > MAX_LINES) out.firstChild.remove();
    out.scrollTop = out.scrollHeight;
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

  const api = { print, clear, run, input, renderPrompt };
  renderPrompt();
  return api;
}
