// The panel that tells each world's story.
export function createStoryCard(root, { onClose, onPrev, onNext }) {
  root.innerHTML = `
    <div class="card-scroll">
      <p class="card-tag"></p>
      <h2 class="card-name"></h2>
      <div class="card-log"></div>
      <ol class="card-timeline"></ol>
      <p class="card-coda"></p>
      <ul class="card-facts"></ul>
      <a class="card-link" target="_blank" rel="noopener"></a>
    </div>
    <nav class="card-nav" aria-label="Voyage">
      <button type="button" class="nav-prev" aria-label="Previous world">←</button>
      <ol class="nav-dots"></ol>
      <button type="button" class="nav-next" aria-label="Next world">→</button>
    </nav>
    <button type="button" class="card-close" aria-label="Back to overview">✕</button>
  `;
  const $ = (s) => root.querySelector(s);
  $('.card-close').addEventListener('click', onClose);
  $('.nav-prev').addEventListener('click', onPrev);
  $('.nav-next').addEventListener('click', onNext);

  let dotsBuilt = false;
  function buildDots(stops, onJump) {
    const ol = $('.nav-dots');
    ol.innerHTML = '';
    stops.forEach((s, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.title = s.name;
      b.setAttribute('aria-label', s.name);
      b.addEventListener('click', () => onJump(i));
      li.appendChild(b);
      ol.appendChild(li);
    });
    dotsBuilt = true;
  }

  function show(def, index) {
    $('.card-tag').textContent = def.tag;
    $('.card-name').textContent = def.name;
    const log = $('.card-log');
    log.innerHTML = '';
    for (const para of def.log) {
      const p = document.createElement('p');
      p.textContent = para;
      log.appendChild(p);
    }
    const timeline = $('.card-timeline');
    timeline.innerHTML = '';
    for (const { when, what } of def.timeline ?? []) {
      const li = document.createElement('li');
      const time = document.createElement('span');
      time.className = 'when';
      time.textContent = when;
      li.append(time, document.createTextNode(what));
      timeline.appendChild(li);
    }
    const coda = $('.card-coda');
    coda.textContent = def.coda ?? '';
    coda.hidden = !def.coda;

    const facts = $('.card-facts');
    facts.innerHTML = '';
    for (const f of def.facts ?? []) {
      const li = document.createElement('li');
      li.textContent = f;
      facts.appendChild(li);
    }
    const link = $('.card-link');
    link.hidden = !def.link;
    if (def.link) {
      link.href = def.link.href;
      link.textContent = `${def.link.label} ↗`;
    }
    root.querySelectorAll('.nav-dots button').forEach((b, i) => b.classList.toggle('on', i === index));
    root.classList.remove('swap');
    void root.offsetWidth; // restart the fade-in
    root.classList.add('open', 'swap');
    root.querySelector('.card-scroll').scrollTop = 0;
  }

  function hide() {
    root.classList.remove('open');
  }

  return {
    show,
    hide,
    buildDots,
    get dotsBuilt() {
      return dotsBuilt;
    },
  };
}
