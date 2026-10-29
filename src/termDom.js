import './term.css';
import { createTerminal } from './ui/terminal.js';
import { mountVariantBar } from './ui/variantBar.js';
import { createResumeShell } from './ui/resumeCommands.js';

// The DOM terminal: the fallback when WebGL isn't available. The résumé prints itself in full.
export function startDomTerminal() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const shell = createResumeShell({ host: 'system', reducedMotion });
  const root = document.getElementById('shell');
  root.hidden = false;
  const term = createTerminal(root, { commands: shell.commands, complete: shell.complete, maxLines: 2000, scroll: 'page' });
  mountVariantBar('term');

  // Typing anywhere lands on the prompt.
  window.addEventListener('keydown', (e) => {
    if (e.target === term.input || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 && !e.target.closest?.('a, button')) term.input.focus();
  });

  shell.boot(term, { full: true, onDone: () => !touch && term.input.focus({ preventScroll: true }) });
}
