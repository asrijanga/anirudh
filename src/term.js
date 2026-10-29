// The terminal variant. With WebGL it's a CRT in a neon city (three.js);
// without it, the same résumé shell runs as a plain DOM terminal.

function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

if (hasWebGL2() && !new URLSearchParams(location.search).has('lite')) {
  import('./cyber/main.js').then((m) => m.startNightCity());
} else {
  document.getElementById('cy-boot')?.remove();
  import('./termDom.js').then((m) => m.startDomTerminal());
}
