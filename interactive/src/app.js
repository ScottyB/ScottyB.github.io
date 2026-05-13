// Agentic Evaluation — interactive map of agentic-engineering problems.
//
// DATA is injected by build.mjs and shaped as:
//   {
//     hub:    { title, sub },
//     themes: [{ id, name, shortLabel, description, count, color, glyphPath }],
//     actions: [{ id, themeId, problem, description, action, constraint, category,
//                 sources: [{name, url}] }]
//   }

(function () {
  const svg       = d3.select('#mandala');
  const sectionsEl = document.getElementById('sections');
  const q         = document.getElementById('q');
  const clearBtn  = document.getElementById('clear');
  const expandBtn = document.getElementById('expand-all');
  const hitsEl    = document.getElementById('hits');
  const emptyEl   = document.getElementById('empty');
  const introEl   = document.getElementById('intro');
  const introClose = document.getElementById('intro-close');

  // ---------- intro dismiss --------------------------------------------
  // The intro shows on every page load. The × button and any engagement
  // (search, petal click, section open, "Show everything") hides it for the
  // current session only — a refresh brings it back.
  function dismissIntro() {
    if (!introEl || introEl.hidden) return;
    introEl.hidden = true;
  }
  introClose && introClose.addEventListener('click', dismissIntro);
  // Clean up any persisted dismissal from older builds.
  try { localStorage.removeItem('agentic-eval-intro-dismissed'); } catch {}

  // ---------- state ------------------------------------------------------
  let query = '';
  const openSections = new Set();    // theme ids currently open
  let selectedTheme = null;          // theme id currently in focus (drives fade)
  let scrollLock = false;            // suppresses scroll-based selection briefly after a manual select
  let scrollLockTimer = null;

  // ---------- mandala geometry -------------------------------------------
  const VB = 560;                    // viewBox size
  const cx = VB / 2, cy = VB / 2;
  const hubR = 56;
  const orbitR = 215;
  const petalR = 56;                 // hexagon "radius" (centre to vertex)

  // Build the SVG content -------------------------------------------------
  const root = svg.append('g').attr('class', 'mandala-root');

  // soft outer rings
  root.append('circle').attr('class', 'hub-ring-soft').attr('cx', cx).attr('cy', cy).attr('r', orbitR + petalR + 30);
  root.append('circle').attr('class', 'hub-ring').attr('cx', cx).attr('cy', cy).attr('r', orbitR);

  // spokes (one per petal)
  const themes = DATA.themes;
  const N = themes.length;
  const angleOf = i => -Math.PI / 2 + (i * (2 * Math.PI) / N);
  themes.forEach((t, i) => {
    const a = angleOf(i);
    root.append('line')
      .attr('class', 'hub-spoke')
      .attr('data-theme', t.id)
      .attr('x1', cx + Math.cos(a) * hubR)
      .attr('y1', cy + Math.sin(a) * hubR)
      .attr('x2', cx + Math.cos(a) * (orbitR - petalR * 0.55))
      .attr('y2', cy + Math.sin(a) * (orbitR - petalR * 0.55));
  });

  // hub — click clears selection
  const hub = root.append('g').attr('class', 'hub').attr('transform', `translate(${cx},${cy})`);
  hub.append('circle').attr('class', 'hub-disc').attr('r', hubR);
  hub.append('text').attr('class', 'hub-title').attr('y', -3).text('Agentic');
  hub.append('text').attr('class', 'hub-title').attr('y', 12).text('Engineering');
  hub.append('text').attr('class', 'hub-sub').attr('y', 28).text(`${DATA.actions.length} ACTIONS`);
  hub.on('click', (event) => { event.stopPropagation(); clearSelection(); });

  // hexagon path generator (flat-top)
  function hexPath(r) {
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 3) * k;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return 'M' + pts.map(p => p.join(',')).join(' L') + ' Z';
  }
  const HEX = hexPath(petalR);

  // petals
  const petals = root.selectAll('.petal')
    .data(themes, t => t.id)
    .join('g')
    .attr('class', 'petal')
    .attr('data-theme', d => d.id)
    .attr('transform', (_d, i) => {
      const a = angleOf(i);
      return `translate(${cx + Math.cos(a) * orbitR},${cy + Math.sin(a) * orbitR})`;
    })
    .on('click', (event, d) => { event.stopPropagation(); togglePetal(d.id); });

  petals.append('path').attr('class', 'hex').attr('d', HEX);

  // glyph
  petals.append('path')
    .attr('class', 'glyph')
    .attr('transform', 'translate(-12,-22) scale(1)')
    .attr('d', d => d.glyphPath);

  // name (clipped + multiline)
  petals.each(function (d) {
    const g = d3.select(this);
    const words = d.shortLabel.split(/\s+/);
    // split into up to 2 lines
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (test.length > 14 && line) { lines.push(line); line = w; }
      else { line = test; }
    }
    if (line) lines.push(line);
    const startY = 8 + (lines.length === 1 ? 6 : 0);
    lines.forEach((ln, i) => {
      g.append('text')
        .attr('class', 'name')
        .attr('x', 0).attr('y', startY + i * 13)
        .text(ln);
    });
  });

  // count badge (top-right of hex)
  petals.append('circle').attr('class', 'count-bg').attr('r', 12).attr('cx', petalR * 0.62).attr('cy', -petalR * 0.62);
  petals.append('text').attr('class', 'count').attr('x', petalR * 0.62).attr('y', -petalR * 0.62 + 4).text(d => d.count);

  // background click resets selection
  svg.on('click', () => { clearSelection(); });

  // ---------- sections ---------------------------------------------------
  function renderSections() {
    sectionsEl.innerHTML = '';
    for (const t of themes) {
      const section = document.createElement('div');
      section.className = 'theme-section';
      section.dataset.theme = t.id;
      section.dataset.open = openSections.has(t.id) ? 'true' : 'false';
      section.id = 'section-' + t.id;

      // header
      const hdr = document.createElement('button');
      hdr.className = 'section-header';
      hdr.type = 'button';
      hdr.innerHTML = `
        <div class="stripe"></div>
        <div>
          <div class="h-title">${escapeHtml(t.heading || t.name)}</div>
          <div class="h-desc">${escapeHtml(t.description)}</div>
        </div>
        <div class="meta">
          <span class="count-label">${t.count} problems</span>
          <span class="match-badge" data-theme-match="${t.id}" hidden></span>
          <svg class="chev" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 1 L9 6 L3 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `;
      hdr.addEventListener('click', () => togglePetal(t.id));
      section.appendChild(hdr);

      // body — cards
      const body = document.createElement('div');
      body.className = 'section-body';
      const actions = DATA.actions.filter(a => a.themeId === t.id);
      for (const a of actions) body.appendChild(renderCard(a));
      section.appendChild(body);

      sectionsEl.appendChild(section);
    }
  }

  function renderCard(a) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = a.id;
    card.dataset.themeId = a.themeId;

    const head = document.createElement('div');
    head.className = 'card-head';
    const id = document.createElement('span');
    id.className = 'id-pip';
    id.textContent = '#' + a.id;
    head.appendChild(id);
    const prob = document.createElement('h3');
    prob.className = 'problem';
    prob.textContent = a.problem;
    head.appendChild(prob);
    card.appendChild(head);

    if (a.description) {
      const desc = document.createElement('p');
      desc.className = 'description';
      desc.textContent = a.description;
      card.appendChild(desc);
    }

    const act = document.createElement('div');
    act.className = 'action';
    const lab = document.createElement('span');
    lab.className = 'action-label';
    lab.textContent = 'Try this';
    act.appendChild(lab);
    act.appendChild(document.createTextNode(a.action));
    card.appendChild(act);

    const sources = document.createElement('div');
    sources.className = 'sources';
    for (const s of a.sources) {
      if (s.url) {
        const link = document.createElement('a');
        link.className = 'src';
        link.href = s.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.innerHTML = `${escapeHtml(s.name)} <span class="arrow">↗</span>`;
        sources.appendChild(link);
      } else {
        const sp = document.createElement('span');
        sp.className = 'src';
        sp.textContent = s.name;
        sources.appendChild(sp);
      }
    }
    card.appendChild(sources);

    const ref = document.createElement('div');
    ref.className = 'ref';
    ref.innerHTML =
      `<a class="ref-link" href="https://scottnbarnett.com/docs/Physics_of_AI.pdf" ` +
      `target="_blank" rel="noopener noreferrer">Structural reference</a>: ` +
      `${escapeHtml(a.constraint)} · ${escapeHtml(a.category)}`;
    card.appendChild(ref);

    return card;
  }

  // ---------- interactions ----------------------------------------------

  // A single click on a petal or section header. If the section is closed → open it
  // and select the theme. If the section is already open → close it; clear selection
  // if it was the selected theme.
  function togglePetal(themeId) {
    if (openSections.has(themeId)) {
      openSections.delete(themeId);
      if (selectedTheme === themeId) clearSelection();
      refreshOpenState();
    } else {
      dismissIntro();                       // user engaged — onboarding card no longer needed
      openSections.add(themeId);
      setSelected(themeId);                 // manual selection — sets scroll lock too
      requestAnimationFrame(() => {
        const sec = document.getElementById('section-' + themeId);
        const container = document.getElementById('sections');
        if (sec && container) {
          const offset = sec.offsetTop - container.offsetTop - 4;
          container.scrollTo({ top: offset, behavior: 'smooth' });
        }
      });
      refreshOpenState();
    }
  }

  function refreshOpenState() {
    for (const t of themes) {
      const el = document.getElementById('section-' + t.id);
      if (el) el.dataset.open = openSections.has(t.id) ? 'true' : 'false';
    }
    expandBtn.dataset.active = openSections.size === themes.length ? 'true' : 'false';
    expandBtn.textContent = openSections.size === themes.length ? 'Hide everything' : 'Show everything';
  }

  // ---------- selection (fade) ------------------------------------------
  function setSelected(themeId, opts = {}) {
    const fromScroll = opts.fromScroll === true;
    if (fromScroll && scrollLock) return;
    if (selectedTheme === themeId) { applySelection(); return; }
    selectedTheme = themeId;
    applySelection();
    if (!fromScroll && themeId != null) {
      // Lock the scroll-driven detector while the click-triggered smooth-scroll plays out.
      scrollLock = true;
      clearTimeout(scrollLockTimer);
      scrollLockTimer = setTimeout(() => { scrollLock = false; }, 900);
    }
  }
  function clearSelection() {
    if (selectedTheme === null) return;
    selectedTheme = null;
    applySelection();
  }
  function applySelection() {
    root.attr('data-has-selection', selectedTheme ? 'true' : 'false');
    petals.attr('data-selected', d => d.id === selectedTheme ? 'true' : 'false');
    svg.selectAll('.hub-spoke').attr('data-selected', function () {
      return this.getAttribute('data-theme') === selectedTheme ? 'true' : 'false';
    });
  }

  expandBtn.addEventListener('click', () => {
    if (openSections.size === themes.length) {
      openSections.clear();
      clearSelection();                     // hide-all wipes selection
    } else {
      dismissIntro();                       // showing everything also dismisses
      for (const t of themes) openSections.add(t.id);
      // show-all keeps whatever was selected
    }
    refreshOpenState();
  });

  // ---------- scroll-based selection ------------------------------------
  // As the user scrolls, whichever section header has just crossed the trigger
  // line at the top of the .sections container becomes the selected theme.
  const TRIGGER_OFFSET = 72;     // px from the top of the .sections container
  let scrollRaf = null;
  sectionsEl.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = null;
      detectActiveFromScroll();
    });
  });
  function detectActiveFromScroll() {
    if (scrollLock) return;               // recent manual select wins
    if (openSections.size === 0) return;  // nothing to scroll through
    const cRect = sectionsEl.getBoundingClientRect();
    const triggerY = cRect.top + TRIGGER_OFFSET;
    let active = null;
    for (const t of themes) {
      if (!openSections.has(t.id)) continue;
      const sec = document.getElementById('section-' + t.id);
      if (!sec) continue;
      const r = sec.getBoundingClientRect();
      // Last section whose top is at or above the trigger line counts.
      if (r.top <= triggerY) active = t.id;
    }
    if (active !== selectedTheme) setSelected(active, { fromScroll: true });
  }

  // ---------- search ----------------------------------------------------
  q.addEventListener('input', () => {
    query = q.value.trim();
    if (query) dismissIntro();              // typing a query is engagement
    applyFilter();
  });
  clearBtn.addEventListener('click', () => { q.value = ''; query = ''; applyFilter(); q.focus(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q) { q.focus(); e.preventDefault(); }
    if (e.key === 'Escape') {
      if (document.activeElement === q) { q.value = ''; query = ''; applyFilter(); }
      clearSelection();
    }
  });

  function tokenise(s) {
    return s.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 2);
  }
  function matches(a, tokens) {
    if (!tokens.length) return true;
    const blob = (a.problem + ' ' + a.description + ' ' + a.action).toLowerCase();
    return tokens.every(t => blob.includes(t));
  }

  function applyFilter() {
    const tokens = tokenise(query);
    const perTheme = Object.fromEntries(themes.map(t => [t.id, 0]));
    let total = 0;

    // filter cards
    for (const a of DATA.actions) {
      const card = sectionsEl.querySelector(`.card[data-id="${a.id}"]`);
      if (!card) continue;
      const ok = matches(a, tokens);
      card.dataset.hidden = ok ? 'false' : 'true';
      if (ok) {
        // highlight matched terms
        const probEl = card.querySelector('.problem');
        const descEl = card.querySelector('.description');
        const actEl  = card.querySelector('.action');
        if (probEl) probEl.innerHTML = (tokens.length ? highlight(a.problem, tokens) : escapeHtml(a.problem));
        if (descEl) descEl.innerHTML = (tokens.length ? highlight(a.description, tokens) : escapeHtml(a.description));
        if (actEl) {
          // rebuild action with the label preserved
          actEl.innerHTML = `<span class="action-label">Try this</span>` +
            (tokens.length ? highlight(a.action, tokens) : escapeHtml(a.action));
        }
        perTheme[a.themeId]++;
        total++;
      }
    }

    // section visibility + match badges
    for (const t of themes) {
      const sec = document.getElementById('section-' + t.id);
      if (!sec) continue;
      const matchCount = perTheme[t.id];
      const empty = (query !== '' && matchCount === 0);
      sec.dataset.empty = empty ? 'true' : 'false';
      const badge = sec.querySelector('[data-theme-match]');
      if (badge) {
        if (query && matchCount > 0) { badge.textContent = matchCount + ' match' + (matchCount === 1 ? '' : 'es'); badge.hidden = false; }
        else { badge.hidden = true; }
      }
      // auto-open sections that contain matches
      if (query && matchCount > 0) {
        openSections.add(t.id);
        sec.dataset.open = 'true';
      }
    }

    // Mandala petals + spokes: when a search is active, mark petals/spokes
    // with results as 'pulse' (they stay full opacity, including when something
    // else is selected) and those without results as 'dim' (faded).
    const spokes = svg.selectAll('.hub-spoke');
    if (query) {
      petals.attr('data-dim',   d => perTheme[d.id] === 0 ? 'true' : 'false')
            .attr('data-pulse', d => perTheme[d.id]  >  0 ? 'true' : 'false');
      spokes.attr('data-dim',   function () { return perTheme[this.getAttribute('data-theme')] === 0 ? 'true' : 'false'; })
            .attr('data-pulse', function () { return perTheme[this.getAttribute('data-theme')]  >  0 ? 'true' : 'false'; });
    } else {
      petals.attr('data-dim', 'false').attr('data-pulse', 'false');
      spokes.attr('data-dim', 'false').attr('data-pulse', 'false');
    }

    // hits counter
    if (query) {
      hitsEl.textContent = `${total} of ${DATA.actions.length} problems`;
      hitsEl.style.color = total === 0 ? 'var(--t9)' : '';
    } else {
      hitsEl.textContent = '';
    }

    emptyEl.hidden = !(query && total === 0);
    refreshOpenState();
  }

  // ---------- helpers ----------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function highlight(text, tokens) {
    const esc = escapeHtml(text);
    if (!tokens.length) return esc;
    const re = new RegExp('(' + tokens.map(escapeRe).join('|') + ')', 'gi');
    return esc.replace(re, '<span class="match">$1</span>');
  }

  // ---------- init -------------------------------------------------------
  renderSections();
  refreshOpenState();
  applyFilter();
  q.focus();
})();
