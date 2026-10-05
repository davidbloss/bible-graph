// Payload for one book's page: the book's own topics, plus a "portal" for every topic elsewhere
// that this book is wired to. Where the whole-canon payload drops any edge with an end outside its
// topic list, this one keeps those edges and adds the far end as a portal, because the links out of
// a book are the reason to have a page for it.
//
// Nodes are one array, core topics first then portals, so every edge index means the same thing as
// in the whole-canon payload: [topicIdx, prerequisiteIdx, hard] and [fromIdx, toIdx, kind, refs].

import { BOOKS, bookOf, testamentOf } from './graph-layout.mjs';
import { BOOK_NAMES, slugOf, isLive } from './books.mjs';
import { GROUPS, RELATION_KINDS } from './graph-payload.mjs';
import { SECTIONS, WHOLE, sectionAt } from './book-sections.mjs';
import { CELL, canvasWidth, layoutBands } from './band-layout.mjs';

const packRef = (r) => [BOOKS.indexOf(r.book), r.chapter, r.verseStart, r.verseEnd];

const PORTAL_COLOR = { OT: '#8C93AD', NT: '#D8DCEB' };

// Where a topic starts inside this book, or null when it has no passage here.
const startIn = (t, code) => {
  const p = (t.primaryPassages ?? []).filter((r) => r.book === code).sort((a, b) => a.chapter - b.chapter || a.verseStart - b.verseStart);
  return p.length ? [p[0].chapter, p[0].verseStart] : null;
};

function sectionOf(t, code) {
  if (t.type === 'BOOK_OVERVIEW') return -1;
  const here = (t.primaryPassages ?? []).filter((r) => r.book === code);
  if (!here.length) return -1;
  const hits = new Set(here.map((r) => sectionAt(code, r.chapter, r.verseStart)));
  return hits.size === 1 ? [...hits][0] : -1;
}

export function buildBookPayload(code, { topics, dependencies, relations, covenants }) {
  const sections = SECTIONS[code];
  if (!sections) throw new Error(`no sections defined for ${code}`);

  const byId = new Map(topics.map((t) => [t.id, t]));
  const core = topics.filter((t) => bookOf(t.id) === code).map((t) => ({ t, s: sectionOf(t, code), at: startIn(t, code) ?? [0, 0] }));
  core.sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1] || (a.t.id < b.t.id ? -1 : 1));
  const coreIds = new Set(core.map((c) => c.t.id));

  // Portals: any outside topic joined to a core topic by a prerequisite or a relation.
  const portalSet = new Set();
  const outside = (from, to) => {
    if (coreIds.has(from) && !coreIds.has(to) && byId.has(to)) portalSet.add(to);
    else if (coreIds.has(to) && !coreIds.has(from) && byId.has(from)) portalSet.add(from);
  };
  for (const e of dependencies) outside(e.topicId, e.prerequisiteId);
  for (const r of relations) outside(r.from, r.to);
  const topicOrder = new Map(topics.map((t, i) => [t.id, i]));
  const portals = [...portalSet]
    .map((id) => byId.get(id))
    .sort((a, b) => BOOKS.indexOf(bookOf(a.id)) - BOOKS.indexOf(bookOf(b.id)) || topicOrder.get(a.id) - topicOrder.get(b.id));

  // Bands: whole-book first, then each section, then the portal band.
  const laneKeys = [WHOLE, ...sections];
  const bandItems = laneKeys.map((lane, li) => ({
    key: lane.key,
    items: core.filter((c) => c.s === li - 1).map((c) => c.t.id),
  }));
  const portalItems = [];
  let lastBook = null;
  for (const p of portals) {
    const b = bookOf(p.id);
    if (b !== lastBook) { portalItems.push({ header: b }); lastBook = b; }
    portalItems.push(p.id);
  }
  const { bands: geo, height } = layoutBands([...bandItems.filter((b) => b.items.length), { key: 'elsewhere', items: portalItems }]);

  const pos = new Map();
  const headers = [];
  for (const b of geo) {
    for (const c of b.cells) {
      if (typeof c.item === 'object') headers.push({ code: c.item.header, name: BOOK_NAMES[c.item.header], slug: slugOf(c.item.header), live: isLive(c.item.header), x: c.x - CELL.dotX, y: c.y });
      else pos.set(c.item, { x: c.x, y: c.y });
    }
  }

  const ordered = [...core.map((c) => c.t), ...portals];
  const index = new Map(ordered.map((t, i) => [t.id, i]));
  const sectionIdx = new Map(core.map((c) => [c.t.id, c.s]));
  const covIndex = new Map(GROUPS.map((g, i) => [g.key, i]));

  const nodes = ordered.map((t, i) => {
    const isPortal = !coreIds.has(t.id);
    const bk = bookOf(t.id);
    return {
      id: t.id,
      p: isPortal ? 1 : 0,
      x: pos.get(t.id).x,
      y: pos.get(t.id).y,
      s: isPortal ? -2 : sectionIdx.get(t.id),
      g: t.covenant ? covIndex.get(t.covenant) : GROUPS.length - 1,
      bk,
      ty: t.type,
      t: t.name,
      d: t.description,
      q: t.assessmentPrompt,
      ev: t.evidence ?? [],
      pp: (t.primaryPassages ?? []).map(packRef),
      tier: t.covenantTier ?? null,
    };
  });

  const edges = dependencies
    .filter((e) => index.has(e.topicId) && index.has(e.prerequisiteId) && (coreIds.has(e.topicId) || coreIds.has(e.prerequisiteId)))
    .map((e) => [index.get(e.topicId), index.get(e.prerequisiteId), e.strength === 'hard' ? 1 : 0]);

  const kindIndex = new Map(RELATION_KINDS.map((k, i) => [k.key, i]));
  const rel = relations
    .filter((r) => index.has(r.from) && index.has(r.to) && kindIndex.has(r.kind) && (coreIds.has(r.from) || coreIds.has(r.to)))
    .map((r) => [index.get(r.from), index.get(r.to), kindIndex.get(r.kind), (r.refs ?? []).map(packRef)]);

  const laneGeo = new Map(geo.map((b) => [b.key, b]));
  const lanes = [
    ...laneKeys.map((lane, li) => ({ lane, li })).filter(({ lane }) => laneGeo.has(lane.key)).map(({ lane, li }) => ({
      key: lane.key,
      label: lane.label,
      range: lane.range ?? 'Spans several sections',
      color: lane.color,
      s: li - 1,
      n: bandItems[li].items.length,
      y: laneGeo.get(lane.key).top,
      h: laneGeo.get(lane.key).h,
    })),
    { key: 'elsewhere', label: `Elsewhere in scripture`, range: 'Topics in other books wired to this one', color: '#8C93AD', s: -2, n: portals.length, y: laneGeo.get('elsewhere').top, h: laneGeo.get('elsewhere').h },
  ];

  return {
    version: 'v0',
    source: 'bible-taxonomy',
    book: { code, name: BOOK_NAMES[code], slug: slugOf(code), testament: testamentOf(code) },
    width: canvasWidth(),
    height,
    cell: CELL,
    books: BOOKS.map((c, k) => ({ code: c, name: BOOK_NAMES[c], k, slug: slugOf(c), live: isLive(c), t: testamentOf(c) })),
    lanes,
    portalHeaders: headers,
    portalColor: PORTAL_COLOR,
    groups: GROUPS.map((g) => ({ label: g.label, color: g.color })),
    relkinds: RELATION_KINDS.map((k) => ({ key: k.key, label: k.label, color: k.color, strong: k.strong })),
    counts: { topics: core.length, portals: portals.length, edges: edges.length, relations: rel.length, outbound: rel.filter(([a, b]) => nodes[a].p !== nodes[b].p).length },
    nodes,
    edges,
    rel,
  };
}
