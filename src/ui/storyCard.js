// Each world's story, shown as a terminal window.
export function createStoryCard(root, { onClose, onPrev, onNext }) {
  root.innerHTML = `
    <header class="win-bar">
      <span class="win-path"></span>
      <button type="button" class="win-close" aria-label="Back to overview (Esc)">[x]</button>
    </header>
    <div class="win-body">
      <p class="win-cmd">$ cat log.txt</p>
      <h2 class="card-name"></h2>
      <p class="card-tag"></p>
      <div class="card-log"></div>
      <div class="card-timeline-wrap">
        <p class="win-cmd">$ git log --reverse --oneline</p>
        <ol class="card-timeline"></ol>
      </div>
      <div class="card-facts-wrap">
        <p class="win-cmd">$ ls facts/</p>
        <ul class="card-facts"></ul>
      </div>
      <p class="card-link-wrap"><span class="win-cmd">$ open </span><a class="card-link" target="_blank" rel="noopener"></a></p>
      <p class="card-coda"></p>
    </div>
    <nav class="win-nav" aria-label="Voyage">
      <button type="button" class="nav-prev">[← prev]</button>
      <span class="nav-count"></span>
      <button type="button" class="nav-next">[next →]</button>
    </nav>
  `;
  const $ = (s) => root.querySelector(s);
  $('.win-close').addEventListener('click', onClose);
  $('.nav-prev').addEventListener('click', onPrev);
  $('.nav-next').addEventListener('click', onNext);

  const fill = (el, items, render) => {
    el.innerHTML = '';
    for (const item of items) el.appendChild(render(item));
  };

  function show(def, index, total) {
    $('.win-path').textContent = def.id === 'star' ? '~/' : `~/worlds/${def.id}`;
    $('.card-name').textContent = def.name;
    $('.card-tag').textContent = `# ${def.tag}`;

    fill($('.card-log'), def.log, (text) => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    });

    const timeline = def.timeline ?? [];
    $('.card-timeline-wrap').hidden = !timeline.length;
    fill($('.card-timeline'), timeline, ({ when, what }) => {
      const li = document.createElement('li');
      const time = document.createElement('span');
      time.className = 'when';
      time.textContent = when.padEnd(12, ' ');
      li.append(time, document.createTextNode(what));
      return li;
    });

    const facts = def.facts ?? [];
    $('.card-facts-wrap').hidden = !facts.length;
    fill($('.card-facts'), facts, (text) => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    });

    $('.card-link-wrap').hidden = !def.link;
    if (def.link) {
      $('.card-link').href = def.link.href;
      $('.card-link').textContent = def.link.href.replace('https://', '');
    }

    $('.card-coda').textContent = def.coda ?? '';
    $('.card-coda').hidden = !def.coda;

    $('.nav-count').textContent = index >= 0 ? `${index + 1}/${total}` : '';
    root.classList.remove('swap');
    void root.offsetWidth; // restart the fade-in
    root.classList.add('open', 'swap');
    $('.win-body').scrollTop = 0;
  }

  function hide() {
    root.classList.remove('open');
  }

  return { show, hide };
}
