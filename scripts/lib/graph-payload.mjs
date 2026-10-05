// Shapes data/*.json into the payload the explorer page consumes.
//
// The field names follow Marble's curriculum explorer where a field means the same thing (`x`, `y`,
// `z` world position, `g` group index, `c` normalised centrality, `t` title, `q` assessment prompt)
// and diverge where the corpus does. Nothing here reads the DOM and nothing here fetches; it is a
// pure function of the data directory so it can be checked against the corpus directly.

import { BOOKS, H, bookOf, descendantCounts, place, testamentOf } from './graph-layout.mjs';
import { BOOK_NAMES, slugOf, isLive } from './books.mjs';

// Covenant stages in redemptive order, then a bucket for everything the corpus has not assigned.
// Colour and legend chips both key off this list, so the swatches always match the dots.
export const GROUPS = [
  { key: 'cv_creation', label: 'Creation', color: '#7FB77E' },
  { key: 'cv_noahic', label: 'Noah', color: '#4EA8DE' },
  { key: 'cv_abrahamic', label: 'Abraham', color: '#D9A441' },
  { key: 'cv_mosaic', label: 'Moses', color: '#C05746' },
  { key: 'cv_davidic', label: 'David', color: '#B07CD4' },
  { key: 'cv_new', label: 'New covenant', color: '#E4DFCE' },
  { key: null, label: 'Unassigned', color: '#5A6178' },
];

// Relations are typed and the types are not interchangeable: `quoted-in` asserts shared wording,
// `parallels` only asserts shared subject matter. They get distinct colours so the eye can pick the
// strong claims out of the long OT-to-NT threads.
export const RELATION_KINDS = [
  { key: 'quoted-in', label: 'Quoted in', color: '#E8C15A', strong: true },
  { key: 'fulfilled-in', label: 'Fulfilled in', color: '#D9715C', strong: true },
  { key: 'parallels', label: 'Parallels', color: '#6E9BD1', strong: false },
  { key: 'illustrates-doctrine', label: 'Illustrates doctrine', color: '#9B8AD1', strong: false },
  { key: 'part-of-covenant', label: 'Part of covenant', color: '#5FBFA0', strong: false },
];

const unassigned = (n) => (n.covenant ? GROUPS.findIndex((g) => g.key === n.covenant) : GROUPS.length - 1);

// A reference packed as [bookIndex, chapter, verseStart, verseEnd]. Objects cost roughly five times
// as many bytes and there are 2687 of them.
const packRef = (r) => [BOOKS.indexOf(r.book), r.chapter, r.verseStart, r.verseEnd];

export function buildPayload({ topics, dependencies, relations, covenants }) {
  const ids = topics.map((t) => t.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const groupOf = topics.map(unassigned);
  const groupColor = topics.map((_, i) => GROUPS[groupOf[i]].color);

  const centrality = descendantCounts(ids, dependencies);
  const points = place(topics, centrality);

  const nodes = topics.map((t, i) => ({
    id: t.id,
    x: +points[i].x.toFixed(1),
    y: +points[i].y.toFixed(1),
    z: +points[i].z.toFixed(1),
    g: groupOf[i],
    k: t.bookIndex,
    c: +points[i].c.toFixed(3),
    col: groupColor[i],
    cv: t.covenant ?? null,
    bk: bookOf(t.id),
    ty: t.type,
    t: t.name,
    d: t.description,
    q: t.assessmentPrompt,
    ev: t.evidence ?? [],
    pp: (t.primaryPassages ?? []).map(packRef),
  }));

  // `hard` becomes the third element, which is what Marble's flag did: it doubles the alpha of an
  // unselected edge. `soft` edges fade back, which is the right reading of a 1098-strong majority.
  const edges = dependencies
    .filter((e) => index.has(e.topicId) && index.has(e.prerequisiteId))
    .map((e) => [index.get(e.topicId), index.get(e.prerequisiteId), e.strength === 'hard' ? 1 : 0]);

  const kindIndex = new Map(RELATION_KINDS.map((k, i) => [k.key, i]));
  const rel = relations
    .filter((r) => index.has(r.from) && index.has(r.to) && kindIndex.has(r.kind))
    .map((r) => [index.get(r.from), index.get(r.to), kindIndex.get(r.kind), (r.refs ?? []).map(packRef)]);

  const perBook = new Map();
  for (const n of nodes) perBook.set(n.k, (perBook.get(n.k) ?? 0) + 1);

  const books = BOOKS.map((code, k) => ({
    code,
    name: BOOK_NAMES[code] ?? code,
    slug: slugOf(code),
    live: isLive(code),
    k,
    t: testamentOf(code),
    n: perBook.get(k) ?? 0,
  }));

  const perGroup = new Array(GROUPS.length).fill(0);
  for (const g of groupOf) perGroup[g]++;

  return {
    version: 'v0',
    source: 'bible-taxonomy',
    H,
    books,
    groups: GROUPS.map((g) => g.label),
    gcol: GROUPS.map((g) => g.color),
    gcount: perGroup,
    covenants: covenants.map((c) => ({ id: c.id, name: c.name })),
    relkinds: RELATION_KINDS.map((k) => ({ key: k.key, label: k.label, color: k.color, strong: k.strong })),
    counts: { topics: nodes.length, edges: edges.length, relations: rel.length, books: BOOKS.length },
    nodes,
    edges,
    rel,
  };
}