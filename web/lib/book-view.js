// Book page: an SVG map of one book's topics, banded by section, with the topics elsewhere in
// scripture that it is wired to ("portals") in a band at the bottom. Reads ./graph.json, which
// scripts/lib/book-payload.mjs writes next to the page.
//
// Node indices are shared across the payload: core topics first, then portals, and every edge
// refers to those indices. Prerequisite edges are [topic, prerequisite, hard]; relations are
// [from, to, kind, refs].
//
// Every string interpolated into markup below goes through esc(), or is a number or a hex colour
// from the build. The payload is generated from data/ in this repository, never from user input.

import { esc, sayable, nf, refFormatter, fetchVerses } from './text.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const MAX_ROWS = 8;
const MAX_TEXT_VERSES = 40;
const LABEL_CHARS = 25;
const KJV_URL = '../../data/kjv.json';

const app = document.getElementById('app');

if (location.protocol === 'file:') {
  app.innerHTML = '<div id="boot"><div class="msg">This page reads <code>graph.json</code>, which a <code>file://</code> URL blocks.<br><br>Serve the repository root:<br><br><code>python3 -m http.server 8000</code><br><br>then open <code>http://localhost:8000/web/genesis/</code></div></div>';
} else {
  fetch('graph.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`graph.json ${r.status}`))))
    .then(start)
    .catch((err) => {
      app.innerHTML = `<div id="boot"><div class="msg">Could not load <code>graph.json</code>.<br><br>Build it first:<br><br><code>npm run build:web</code><br><br><span style="opacity:.6">${esc(String(err.message || err))}</span></div></div>`;
    });
}

function start(D) {
  const N = D.nodes;
  const { fmtRefs, verseCount, collapseRefs } = refFormatter(D.books);
  const bookByCode = new Map(D.books.map((b) => [b.code, b]));
  const bookName = (code) => bookByCode.get(code)?.name ?? code;
  const kinds = D.relkinds;
  const coreIdx = N.map((_, i) => i).filter((i) => !N[i].p);
  const portalIdx = N.map((_, i) => i).filter((i) => N[i].p);

  // ---------------------------------------------------------------- derived structure

  const directPre = N.map(() => []);   // [edgeIndex, prerequisite]
  const directNext = N.map(() => []);  // [edgeIndex, dependant]
  D.edges.forEach(([a, b], k) => { directPre[a].push([k, b]); directNext[b].push([k, a]); });
  const relOut = N.map(() => []);      // [kind, other, refs]
  const relIn = N.map(() => []);
  const touching = N.map(() => []);    // relation indices meeting at a node
  D.rel.forEach(([a, b, kind, refs], k) => {
    relOut[a].push([kind, b, refs]);
    relIn[b].push([kind, a, refs]);
    touching[a].push(k);
    touching[b].push(k);
  });

  // Where a node's page lives. A live book links to its own page; anything else falls back to the
  // whole-canon explorer, which opens the same topic.
  const hrefOf = (n) => {
    const b = bookByCode.get(n.bk);
    return `${b.live ? `../${b.slug}/` : '../'}?topic=${encodeURIComponent(n.id)}`;
  };

  // ---------------------------------------------------------------- state

  const laneOf = new Map(D.lanes.map((l) => [l.s, l]));
  const types = [...new Set(coreIdx.map((i) => N[i].ty))];
  const state = {
    colorBy: new URLSearchParams(location.search).get('color') === 'covenant' ? 'covenant' : 'section',
    sections: new Set(D.lanes.filter((l) => l.s >= -1).map((l) => l.s)),
    types: new Set(types),
    testaments: new Set(['OT', 'NT']),
    kinds: new Set(kinds.map((_, i) => i)),
    showPre: true,
    showRel: true,
    showOut: true,
    selected: -1,
    hist: [],
  };
  let lit = { nodes: new Set(), edges: new Set(), rels: new Set() };

  const testamentOfNode = (n) => bookByCode.get(n.bk).t;
  const nodeVisible = (i) => {
    const n = N[i];
    if (n.p) return state.testaments.has(testamentOfNode(n));
    return state.sections.has(n.s) && state.types.has(n.ty);
  };
  const nodeColor = (i) => {
    const n = N[i];
    if (n.p) return D.portalColor[testamentOfNode(n)];
    return state.colorBy === 'covenant' ? D.groups[n.g].color : (laneOf.get(n.s)?.color ?? '#E4DFCE');
  };

  // ---------------------------------------------------------------- chrome

  const coreLanes = D.lanes.filter((l) => l.s >= -1);
  const hasPortals = portalIdx.length > 0;
  app.innerHTML = `
    <aside id="side">
      <div class="crumb"><a href="../">All of scripture</a> &rsaquo; ${esc(D.book.name)}</div>
      <h1>${esc(D.book.name)}<span class="rp">.</span></h1>
      <p class="counts"><b>${nf(D.counts.topics)}</b> topics, <b>${nf(D.edges.filter(([a, b]) => !N[a].p && !N[b].p).length)}</b> prerequisite links and ${D.counts.outbound ? `<b>${nf(D.counts.outbound)}</b> cross-references to <b>${nf(D.counts.portals)}</b> topics in other books` : hasPortals ? `prerequisite links to <b>${nf(D.counts.portals)}</b> topics in other books` : 'no cross-references to other books yet'}. <b style="color:var(--ink)">Tap a topic</b> to trace what it rests on and where it leads.</p>
      <p class="ctx"><b style="color:var(--mut)">Drag</b> to pan, <b style="color:var(--mut)">scroll</b> to move, <b style="color:var(--mut)">pinch</b> or <b style="color:var(--mut)">+/&minus;</b> to zoom. Passage text is the King James. <b>A v0 draft: no part of it has been human-reviewed.</b></p>

      <div class="group"><div class="lg-title">Colour by</div>
        <div class="seg" id="colorBy">
          <button data-c="section" aria-pressed="${state.colorBy === 'section'}">Section</button>
          <button data-c="covenant" aria-pressed="${state.colorBy === 'covenant'}">Covenant</button>
        </div>
        <div class="key" id="covKey"></div>
      </div>

      <div class="group"><div class="lg-title">Section &middot; click to filter</div>
        <div class="chips" id="secChips"></div></div>
      <div class="group"><div class="lg-title">Kind of topic</div>
        <div class="chips" id="typeChips"></div></div>
      <div class="group"><div class="lg-title">Links</div>
        <div class="chips" id="edgeChips"></div></div>
      <div class="group"><div class="lg-title">Kind of cross-reference</div>
        <div class="chips" id="kindChips"></div></div>
      ${hasPortals ? `<div class="group"><div class="lg-title">Other books</div>
        <div class="chips" id="testChips"></div></div>` : ''}
    </aside>
    <main id="stage">
      <svg id="map" role="group" aria-label="${esc(D.book.name)} topic map"></svg>
      <div id="zoom"><button id="zin" aria-label="Zoom in">+</button><button id="zout" aria-label="Zoom out">&minus;</button><button id="zfit" aria-label="Fit to width">&#x2922;</button></div>
      <div id="tip" role="tooltip"><div class="tmeta"><span class="sw"></span><span class="ts"></span></div><div class="ttl"></div><div class="tq"></div></div>
      <aside id="card" role="dialog" aria-label="Topic detail">
        <div class="cbar"><button class="back" disabled>Back</button><span class="sp"></span><button class="close">Close</button></div>
        <div class="cbody"></div>
      </aside>
    </main>`;

  const stage = document.getElementById('stage');
  const svg = document.getElementById('map');
  const tip = document.getElementById('tip');
  const card = document.getElementById('card');
  const cbody = card.querySelector('.cbody');
  const backBtn = card.querySelector('.back');

  const chip = (label, { color, n, attrs = '' } = {}) => `
    <div class="chip" role="button" tabindex="0" aria-pressed="true" ${attrs}>
      ${color ? `<span class="sw" style="background:${color}"></span>` : ''}${esc(label)}${n != null ? `<span class="n">${nf(n)}</span>` : ''}
    </div>`;

  document.getElementById('secChips').innerHTML = coreLanes.map((l) => chip(l.label, { color: l.color, n: l.n, attrs: `data-s="${l.s}"` })).join('');
  document.getElementById('typeChips').innerHTML = types.map((t) => chip(t.replace(/_/g, ' ').toLowerCase(), { n: coreIdx.filter((i) => N[i].ty === t).length, attrs: `data-t="${t}"` })).join('');
  document.getElementById('edgeChips').innerHTML =
    chip('Prerequisites', { color: 'rgba(150,165,205,.85)', attrs: 'data-e="showPre"' }) +
    chip('Within this book', { color: '#E8C15A', attrs: 'data-e="showRel"' }) +
    (hasPortals ? chip('To other books', { color: '#D9715C', attrs: 'data-e="showOut"' }) : '');
  document.getElementById('kindChips').innerHTML = kinds.map((k, i) =>
    chip(k.label, { color: k.color, n: D.rel.filter((r) => r[2] === i).length, attrs: `data-k="${i}"` })).join('');
  if (hasPortals) document.getElementById('testChips').innerHTML = ['OT', 'NT'].map((t) =>
    chip(t === 'OT' ? 'Old Testament' : 'New Testament', {
      color: D.portalColor[t],
      n: portalIdx.filter((i) => testamentOfNode(N[i]) === t).length,
      attrs: `data-ts="${t}"`,
    })).join('');

  // ---------------------------------------------------------------- svg

  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(SVGNS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

  const world = el('g', {}, svg);
  const laneLayer = el('g', {}, world);
  const edgeLayer = el('g', {}, world);
  const nodeLayer = el('g', {}, world);

  for (const l of D.lanes) {
    const g = el('g', { class: 'lane' }, laneLayer);
    el('rect', { class: 'bg', x: 16, y: l.y, width: D.width - 32, height: l.h, rx: 18 }, g);
    el('line', { class: 'accent', x1: 30, x2: 30, y1: l.y + 14, y2: l.y + 34, stroke: l.color }, g);
    const t = el('text', { class: 'lt', x: 44, y: l.y + 30 }, g);
    t.textContent = l.label;
    const r = el('text', { class: 'lr', x: 44 + l.label.length * 8.6 + 14, y: l.y + 30 }, g);
    r.textContent = l.range;
    const c = el('text', { class: 'ln', x: D.width - 44, y: l.y + 30 }, g);
    c.textContent = `${nf(l.n)} ${l.n === 1 ? 'topic' : 'topics'}`;
  }

  const perBookCount = new Map();
  for (const i of portalIdx) perBookCount.set(N[i].bk, (perBookCount.get(N[i].bk) ?? 0) + 1);
  for (const h of D.portalHeaders) {
    const g = el('g', { class: 'bkhead' }, nodeLayer);
    const holder = el('a', { href: h.live ? `../${h.slug}/` : '../' }, g);
    const t = el('text', { x: h.x, y: h.y + 4 }, holder);
    t.textContent = `${h.name} · ${perBookCount.get(h.code)}`;
  }

  // Curves leave the prerequisite downward and arrive from above, so a link between bands reads as
  // a flow rather than a tangle. Two topics on one row get an arc instead.
  const curve = (a, b) => {
    const x1 = N[a].x, y1 = N[a].y, x2 = N[b].x, y2 = N[b].y;
    const dy = y2 - y1;
    if (Math.abs(dy) < 8) {
      const mid = (x1 + x2) / 2;
      return `M${x1},${y1} Q${mid},${y1 - 26 - Math.min(Math.abs(x2 - x1) * 0.08, 30)} ${x2},${y2}`;
    }
    const k = dy * 0.5;
    return `M${x1},${y1} C${x1},${y1 + k} ${x2},${y2 - k} ${x2},${y2}`;
  };

  // Created once and restyled by refresh().
  const edgeEls = D.edges.map(([topic, pre, hard]) => {
    const path = el('path', { class: 'edge', d: curve(pre, topic) }, edgeLayer);
    path.dataset.cross = N[topic].p || N[pre].p ? '1' : '';
    path.dataset.hard = hard ? '1' : '';
    return path;
  });
  const relEls = D.rel.map(([a, b]) => {
    const path = el('path', { class: 'edge', d: curve(a, b) }, edgeLayer);
    path.dataset.cross = N[a].p !== N[b].p ? '1' : '';
    return path;
  });

  let panMoved = false;

  const nodeEls = N.map((n, i) => {
    const g = el('g', { class: 'node', tabindex: 0, role: 'button', transform: `translate(${n.x},${n.y})`, 'aria-label': `${n.t}${n.p ? `, ${bookName(n.bk)}` : ''}` }, nodeLayer);
    el('rect', { class: 'hit', x: -12, y: -17, width: D.cell.w - 6, height: 34 }, g);
    el('circle', { class: 'rim', r: n.p ? 6.5 : 8 }, g);
    el('circle', { class: 'ring', r: n.p ? 8 : 10 }, g);
    el('circle', { class: 'dot', r: n.p ? 4.5 : 6 }, g);
    const t = el('text', { x: 15, y: 4 }, g);
    t.textContent = clip(n.t, LABEL_CHARS);
    g.addEventListener('click', () => { if (!panMoved) select(i); });
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); } });
    g.addEventListener('pointerenter', (e) => showTip(i, e));
    g.addEventListener('pointermove', (e) => placeTip(e.clientX, e.clientY));
    g.addEventListener('pointerleave', hideTip);
    return g;
  });

  // ---------------------------------------------------------------- styling

  // One pass over everything. About 140 nodes and 200 edges, so there is no need to be clever.
  function refresh() {
    const focus = state.selected >= 0 && nodeVisible(state.selected) ? state.selected : -1;
    const vis = N.map((_, i) => nodeVisible(i));

    N.forEach((_, i) => {
      const g = nodeEls[i];
      g.querySelector('.dot').setAttribute('fill', nodeColor(i));
      g.classList.toggle('off', !vis[i]);
      g.classList.toggle('sel', i === focus);
      const lightN = focus >= 0 && (i === focus || lit.nodes.has(i));
      g.classList.toggle('dim', vis[i] && focus >= 0 && !lightN);
    });

    D.edges.forEach(([topic, pre], k) => {
      const path = edgeEls[k];
      const cross = !!path.dataset.cross;
      const show = vis[topic] && vis[pre] && (cross ? state.showOut : state.showPre);
      path.classList.toggle('off', !show);
      if (!show) return;
      const on = focus >= 0 && lit.edges.has(k);
      path.setAttribute('stroke', cross ? '#D9715C' : 'rgb(150,165,205)');
      path.setAttribute('stroke-width', on ? 2 : 1.2);
      path.setAttribute('opacity', on ? 0.95 : focus >= 0 ? 0.04 : cross ? 0.12 : path.dataset.hard ? 0.42 : 0.2);
    });

    D.rel.forEach(([a, b, kind], k) => {
      const path = relEls[k];
      const cross = !!path.dataset.cross;
      const show = vis[a] && vis[b] && state.kinds.has(kind) && (cross ? state.showOut : state.showRel);
      path.classList.toggle('off', !show);
      if (!show) return;
      const on = focus >= 0 && lit.rels.has(k);
      path.setAttribute('stroke', kinds[kind].color);
      path.setAttribute('stroke-width', on ? 2.2 : kinds[kind].strong ? 1.5 : 1.1);
      path.setAttribute('opacity', on ? 0.95 : focus >= 0 ? 0.04 : cross ? 0.14 : 0.3);
    });

    // Lit edges move to the top of the layer so the faint ones around them do not bury them.
    if (focus >= 0) {
      for (const k of lit.edges) edgeLayer.appendChild(edgeEls[k]);
      for (const k of lit.rels) edgeLayer.appendChild(relEls[k]);
    }

    document.getElementById('covKey').innerHTML = state.colorBy === 'covenant'
      ? D.groups.filter((_, gi) => coreIdx.some((i) => N[i].g === gi))
        .map((g) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:10px"><span style="width:8px;height:8px;border-radius:50%;background:${g.color}"></span>${esc(g.label)}</span>`).join('')
      : '';
  }

  // The prerequisite closure of the selection, plus every relation and unlock meeting at it.
  // Relations are not prerequisites, so the two are collected separately.
  function buildLit(i) {
    const nodes = new Set(), edges = new Set(), rels = new Set();
    if (i < 0) return { nodes, edges, rels };
    const seen = new Set([i]);
    const stack = [i];
    while (stack.length) {
      const v = stack.pop();
      for (const [k, p] of directPre[v]) {
        edges.add(k);
        if (seen.has(p)) continue;
        seen.add(p); nodes.add(p); stack.push(p);
      }
    }
    for (const [k, dep] of directNext[i]) { edges.add(k); nodes.add(dep); }
    for (const k of touching[i]) {
      rels.add(k);
      const [a, b] = D.rel[k];
      nodes.add(a === i ? b : a);
    }
    return { nodes, edges, rels };
  }

  function prereqClosure(i) {
    const seen = new Set([i]);
    const stack = [i];
    while (stack.length) for (const [, p] of directPre[stack.pop()]) if (!seen.has(p)) { seen.add(p); stack.push(p); }
    return seen.size - 1;
  }

  // ---------------------------------------------------------------- tooltip

  function showTip(i, e) {
    const n = N[i];
    tip.querySelector('.sw').style.background = nodeColor(i);
    tip.querySelector('.ts').textContent = `${n.ty.replace(/_/g, ' ').toLowerCase()} · ${bookName(n.bk)}`;
    tip.querySelector('.ttl').textContent = n.t;
    tip.querySelector('.tq').textContent = n.d;
    tip.classList.add('on');
    placeTip(e.clientX, e.clientY);
  }
  function placeTip(cx, cy) {
    const r = stage.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = cx - r.left + 16, y = cy - r.top + 16;
    if (x + w > r.width - 8) x = cx - r.left - w - 16;
    if (y + h > r.height - 8) y = cy - r.top - h - 16;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  }
  function hideTip() { tip.classList.remove('on'); }

  // ---------------------------------------------------------------- card

  function renderCard(i) {
    const n = N[i];
    const pre = directPre[i], next = directNext[i];
    const rels = [...relOut[i], ...relIn[i]];
    const totalPre = prereqClosure(i);

    const row = (dot, label, meta, target) => `<button class="row" data-go="${target}">
        ${dot ? `<span class="dot" style="background:${dot}"></span>` : ''}
        <span class="rt">${esc(label)}</span>${meta ? `<span class="rr">${esc(meta)}</span>` : ''}
      </button>`;
    const more = (list, max) => (list.length > max ? `<div class="more">and ${list.length - max} more</div>` : '');

    const prereqRows = (list) => (list.length
      ? list.slice(0, MAX_ROWS).map(([k, o]) => row(nodeColor(o), N[o].t, N[o].p ? bookName(N[o].bk) : D.edges[k][2] ? 'hard' : 'soft', o)).join('') + more(list, MAX_ROWS)
      : '<div class="row empty">nothing yet</div>');

    const relRows = rels.slice(0, MAX_ROWS * 2).map(([kind, other, refs]) =>
      row(kinds[kind].color, N[other].t, kinds[kind].label, other)
      + `<div class="kv" style="padding-left:26px">${N[other].p ? `${esc(bookName(N[other].bk))} · ` : ''}${esc(fmtRefs(refs))}</div>`).join('')
      + more(rels, MAX_ROWS * 2);

    const pp = n.pp;
    const passage = pp.length
      ? `<div class="sec"><div class="seclabel">Primary passage${pp.length > 1 ? 's' : ''}</div>
          ${verseCount(pp) <= MAX_TEXT_VERSES
            ? `<div class="passage" data-verses="${esc(JSON.stringify(pp))}"><div class="pr">${esc(fmtRefs(pp))}</div><div class="pt">Loading the King James text&hellip;</div></div>`
            : `<div class="passage"><div class="pr">${esc(collapseRefs(pp))}</div><div class="no">${nf(verseCount(pp))} verses across ${pp.length} passages. Too long to quote here; the references are exact.</div></div>`}
        </div>`
      : '';

    const kind = n.ty.replace(/_/g, ' ').toLowerCase();
    const dest = bookByCode.get(n.bk);
    cbody.innerHTML = `
      <div class="cmeta"><span class="sw" style="background:${nodeColor(i)}"></span><span>${esc(kind)} &middot; ${esc(bookName(n.bk))}</span></div>
      <div class="ctl">${esc(n.t)}</div>
      <div class="cd">${esc(n.d)}</div>
      ${n.p ? `<a class="openmap" href="${esc(hrefOf(n))}">Open in ${esc(dest.live ? dest.name : 'the full map')} &rarr;</a>` : ''}
      ${n.p ? '' : `<div class="big"><span class="n mono">${nf(totalPre)}</span><span class="u">${totalPre === 1 ? 'prerequisite in total' : 'prerequisites in total'}</span></div>
      <div class="csub">${totalPre ? 'Everything a learner must master before this one, traced back to the beginning.' : 'A starting point. Nothing has to come before it.'}</div>`}
      ${passage}
      ${n.ev.length ? `<div class="sec"><div class="seclabel">What a learner can do</div><ul class="evidence">${n.ev.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
      ${n.q ? `<div class="sec"><div class="seclabel">Ask them</div><div class="prompt">${esc(sayable(n.q))}</div></div>` : ''}
      ${rels.length ? `<div class="sec"><div class="seclabel">Cross-references &middot; ${rels.length}</div><div class="rows">${relRows}</div>
        <div class="kv">Quotations and fulfilments point forward, from the earlier text to the later one that takes it up.</div></div>` : ''}
      <div class="sec"><div class="seclabel">Builds directly on &middot; ${pre.length}</div><div class="rows">${prereqRows(pre)}</div></div>
      <div class="sec"><div class="seclabel">Unlocks next &middot; ${next.length}</div><div class="rows">${prereqRows(next)}</div></div>`;
    cbody.scrollTop = 0;
    backBtn.disabled = state.hist.length === 0;
    hydrate();
  }

  function hydrate() {
    for (const box of cbody.querySelectorAll('.passage[data-verses]')) {
      const refs = JSON.parse(box.dataset.verses);
      fetchVerses(KJV_URL).then((verses) => {
        const pt = box.querySelector('.pt');
        if (!verses) { pt.textContent = 'Passage text needs the KJV file, which this browser could not read.'; return; }
        const text = [];
        for (const r of refs) {
          const code = D.books[r[0]].code;
          for (let v = r[2]; v <= r[3]; v++) if (verses[`${code}.${r[1]}.${v}`]) text.push(verses[`${code}.${r[1]}.${v}`]);
        }
        pt.textContent = text.join(' ') || 'Those verses are not in the KJV file.';
      });
    }
  }

  // ---------------------------------------------------------------- selection

  function select(i, { push = true } = {}) {
    if (i === state.selected) return;
    if (push && state.selected >= 0 && i >= 0) state.hist.push(state.selected);
    state.selected = i;
    lit = buildLit(i);
    if (i >= 0) {
      // A topic the filters hide is brought back, otherwise the card would describe something invisible.
      if (!nodeVisible(i)) revealFilters(i);
      renderCard(i);
      card.classList.add('on');
      reveal(i);
    } else {
      card.classList.remove('on');
    }
    refresh();
    setParam('topic', i >= 0 ? N[i].id : null);
  }
  function setParam(key, value) {
    try {
      const u = new URL(location.href);
      if (value) u.searchParams.set(key, value); else u.searchParams.delete(key);
      history.replaceState(null, '', u);
    } catch { /* a sandboxed frame can refuse; the URL is a convenience */ }
  }
  function revealFilters(i) {
    const n = N[i];
    if (n.p) state.testaments.add(testamentOfNode(n));
    else { state.sections.add(n.s); state.types.add(n.ty); }
    syncChips();
  }
  const clearSelection = () => { state.hist = []; select(-1); };
  backBtn.addEventListener('click', () => {
    const prev = state.hist.pop();
    if (prev !== undefined) select(prev, { push: false });
  });
  card.querySelector('.close').addEventListener('click', clearSelection);
  cbody.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) select(+go.dataset.go);
  });
  for (const t of ['pointerdown', 'wheel']) card.addEventListener(t, (e) => e.stopPropagation());

  // ---------------------------------------------------------------- filters

  const wire = (root, apply) => {
    for (const c of root.querySelectorAll('.chip')) {
      const toggle = () => {
        const on = c.getAttribute('aria-pressed') === 'true';
        apply(c, !on);
        c.setAttribute('aria-pressed', String(!on));
        refresh();
      };
      c.addEventListener('click', toggle);
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    }
  };
  const setIn = (set, v, on) => (on ? set.add(v) : set.delete(v));
  wire(document.getElementById('secChips'), (c, on) => setIn(state.sections, +c.dataset.s, on));
  wire(document.getElementById('typeChips'), (c, on) => setIn(state.types, c.dataset.t, on));
  wire(document.getElementById('kindChips'), (c, on) => setIn(state.kinds, +c.dataset.k, on));
  if (hasPortals) wire(document.getElementById('testChips'), (c, on) => setIn(state.testaments, c.dataset.ts, on));
  wire(document.getElementById('edgeChips'), (c, on) => { state[c.dataset.e] = on; });

  function syncChips() {
    const set = (sel, test) => document.querySelectorAll(sel).forEach((c) => c.setAttribute('aria-pressed', String(test(c))));
    set('#secChips .chip', (c) => state.sections.has(+c.dataset.s));
    set('#typeChips .chip', (c) => state.types.has(c.dataset.t));
    set('#testChips .chip', (c) => state.testaments.has(c.dataset.ts));
  }

  for (const b of document.querySelectorAll('#colorBy button')) {
    b.addEventListener('click', () => {
      state.colorBy = b.dataset.c;
      document.querySelectorAll('#colorBy button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      setParam('color', state.colorBy === 'covenant' ? 'covenant' : null);
      if (state.selected >= 0) renderCard(state.selected);
      refresh();
    });
  }

  // ---------------------------------------------------------------- pan and zoom

  const view = { k: 1, tx: 0, ty: 0 };
  // Set once the reader has panned or zoomed, so a resize does not throw their position away.
  let touchedView = false;
  const applyView = () => world.setAttribute('transform', `translate(${view.tx},${view.ty}) scale(${view.k})`);
  const K_MIN = 0.3, K_MAX = 3;

  function fit() {
    const r = stage.getBoundingClientRect();
    view.k = Math.min(1.1, Math.max(K_MIN, r.width / D.width));
    view.tx = (r.width - D.width * view.k) / 2;
    view.ty = 0;
    touchedView = false;
    applyView();
  }
  function zoomAt(f, cx, cy) {
    const k = Math.min(K_MAX, Math.max(K_MIN, view.k * f));
    const s = k / view.k;
    view.tx = cx - (cx - view.tx) * s;
    view.ty = cy - (cy - view.ty) * s;
    view.k = k;
    touchedView = true;
    applyView();
  }
  // Brings a node into the part of the stage the card does not cover, only when it is outside it.
  function reveal(i) {
    const r = stage.getBoundingClientRect();
    const cardW = window.innerWidth > 720 ? Math.min(390, r.width * 0.38) + 20 : 0;
    const sx = N[i].x * view.k + view.tx, sy = N[i].y * view.k + view.ty;
    const pad = 70;
    let dx = 0, dy = 0;
    if (sx < pad) dx = pad - sx;
    else if (sx > r.width - cardW - pad) dx = r.width - cardW - pad - sx;
    if (sy < pad) dy = pad - sy;
    else if (sy > r.height - pad) dy = r.height - pad - sy;
    if (dx || dy) { view.tx += dx; view.ty += dy; touchedView = true; applyView(); }
  }

  let dragging = false, lx = 0, ly = 0, sx0 = 0, sy0 = 0, pinch = 0;
  const touches = new Map();
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#card, #zoom')) return;
    dragging = true; panMoved = false;
    lx = sx0 = e.clientX; ly = sy0 = e.clientY;
    if (e.pointerType === 'touch') touches.set(e.pointerId, [e.clientX, e.clientY]);
  });
  stage.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const r = stage.getBoundingClientRect();
        if (pinch) zoomAt(d / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
        pinch = d; panMoved = true;
        return;
      }
    }
    if (!dragging) return;
    if (!panMoved && Math.hypot(e.clientX - sx0, e.clientY - sy0) < 5) return;
    panMoved = true;
    stage.classList.add('drag');
    hideTip();
    view.tx += e.clientX - lx; view.ty += e.clientY - ly;
    touchedView = true;
    lx = e.clientX; ly = e.clientY;
    applyView();
  });
  const end = (e) => {
    dragging = false; touches.delete(e.pointerId); pinch = 0;
    stage.classList.remove('drag');
    // `panMoved` has to outlive pointerup so the click that follows a drag is ignored.
    setTimeout(() => { panMoved = false; }, 0);
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  // Clicking empty space clears the selection.
  stage.addEventListener('click', (e) => {
    if (panMoved || e.target.closest('.node, #card, #zoom, a')) return;
    if (state.selected >= 0) clearSelection();
  });
  // A bare wheel moves the map, since the page is a tall column; ctrl or a trackpad pinch zooms.
  stage.addEventListener('wheel', (e) => {
    if (e.target.closest('#card')) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top);
    else { view.tx -= e.deltaX; view.ty -= e.deltaY; touchedView = true; applyView(); }
  }, { passive: false });
  const mid = () => { const r = stage.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };
  document.getElementById('zin').addEventListener('click', () => zoomAt(1.25, ...mid()));
  document.getElementById('zout').addEventListener('click', () => zoomAt(0.8, ...mid()));
  document.getElementById('zfit').addEventListener('click', fit);
  addEventListener('resize', () => { if (!touchedView) fit(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.selected >= 0) clearSelection(); });

  // ---------------------------------------------------------------- start

  fit();
  refresh();
  const want = new URLSearchParams(location.search).get('topic');
  const wanted = want ? N.findIndex((n) => n.id === want) : -1;
  if (wanted >= 0) select(wanted);

  // Opt in with ?debug=1 to drive the page from a test without reaching into module scope.
  if (location.search.includes('debug')) {
    window.bibleBook = { D, state, select, view, fit, lit: () => lit, nodeVisible, refresh };
  }
}
