// Funnel placement for the web explorer: turn the prerequisite DAG into a 3D point cloud.
//
// Height is canon position, not age. Genesis sits at the base and the cloud widens toward
// Revelation, so the shape of the graph carries the shape of the book. Age was rejected because
// the corpus clusters hard around ages 10 and 12 and thins to 3 topics above 13, which bands the
// cloud into stripes and leaves a bare spire on top.
//
// Angle carries no meaning. Within one book the topics are laid out on a golden-angle fill, which
// spreads a dense book like Psalms across the full radius instead of clumping it, and leaves a
// sparse book like 3 John as a thin ring. Marble's original used a uniform random scatter, which
// reads as an organic cloud but piles 118 topics into an unreadable blob.
//
// Everything here is deterministic: a rebuild of unchanged data produces a byte-identical file.
// Jitter comes from an FNV-1a hash of the topic id, never Math.random().

import { OT, NT } from './overlap.mjs';

export const H = 1400;

export const BOOKS = [...OT, ...NT];

const BOOK_INDEX = new Map(BOOKS.map((code, i) => [code, i]));

// Matches scripts/lib/derive-book-edges.mjs. Book overviews carry their own code in a `_book_`
// segment, everything else is prefixed by it, optionally preceded by an initial for the numbered
// books (1SA, 2CO, 1JN). Verified to resolve all 1772 topics against BOOKS with no misses.
export const bookOf = (id) => {
  const overview = /^bt_book_([a-z0-9]+)$/.exec(id);
  if (overview) return overview[1].toUpperCase();
  const m = /^bt_(?:(\d)?)?([a-z]+)_/.exec(id);
  return m ? (m[1] || '') + m[2].toUpperCase() : null;
};

export const testamentOf = (code) => (OT.has(code) ? 'OT' : 'NT');

// FNV-1a, 32-bit. Used for every random-looking value so the output is stable across runs and
// across machines.
export const hash01 = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0x100000000;
};

// Box-Muller from a seeded uniform. `salt` separates one stream from another within a topic.
export const gauss = (u1, u2) => Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12))) * Math.cos(2 * Math.PI * u2);

// Unique-descendant count per node, computed by walking forward over the "unlocks" edges. The
// corpus has no `centrality` field the way Marble's topics.json does, so this stands in for it:
// a node matters in proportion to how much of the curriculum sits downstream of it.
//
// Max is 473 ("God creates the world"), median 14. 159 topics are leaves and score 0, which makes
// them the smallest dots on the canvas. That is the honest reading of a sparse DAG.
export function descendantCounts(ids, edges) {
  const index = new Map(ids.map((id, i) => [id, i]));
  const unlocks = Array.from({ length: ids.length }, () => []);
  for (const e of edges) {
    const from = index.get(e.prerequisiteId);
    const to = index.get(e.topicId);
    if (from === undefined || to === undefined) continue;
    unlocks[from].push(to);
  }

  const counts = new Array(ids.length).fill(0);
  const seen = new Uint8Array(ids.length);
  const stack = [];
  for (let start = 0; start < ids.length; start++) {
    seen.fill(0);
    seen[start] = 1;
    stack.length = 0;
    stack.push(start);
    let n = 0;
    while (stack.length) {
      const v = stack.pop();
      for (const w of unlocks[v]) {
        if (seen[w]) continue;
        seen[w] = 1;
        n++;
        stack.push(w);
      }
    }
    counts[start] = n;
  }
  return counts;
}

// One point per node, in the order given.
//
// Within a book the topics are sorted by centrality and numbered 0..n-1. Radius grows with that
// number, so a book's most depended-upon topics sit on its outer rim, and angle comes from a
// golden-ratio sequence over the same number. Centrality never scales the radius directly: it is
// already the dot size on the canvas, and letting it move positions as well left dense books
// unable to pack (see the note on PHI below).
export function place(nodes, centrality, { height = H, bookOf: pick = bookOf } = {}) {
  const maxC = Math.max(1, ...centrality);
  const byBook = new Map();
  nodes.forEach((n, i) => {
    const code = pick(n.id);
    const k = BOOK_INDEX.get(code);
    if (k === undefined) throw new Error(`no canon index for ${n.id} (book "${code}")`);
    n.bookIndex = k;
    if (!byBook.has(k)) byBook.set(k, []);
    byBook.get(k).push({ n, c: centrality[i] / maxC });
  });

  for (const members of byBook.values()) {
    // Ties broken on id so the ordering, and therefore the file, is stable.
    members.sort((a, b) => b.c - a.c || (a.n.id < b.n.id ? -1 : 1));
    members.forEach((m, slot) => {
      m.n.bookSlot = slot;
      m.n.bookSize = members.length;
      m.n.c = m.c;
    });
  }

  const band = height / BOOKS.length;
  // 0.618 of a turn per step. Consecutive slots land 222 degrees apart and the sequence never
  // clusters, which a golden *angle* (137.5 deg) does not manage: at 360/137.5 = 2.618, slots 21
  // apart wrap to within 8 degrees, so a dense book ends up with pairs on top of each other.
  const PHI = (Math.sqrt(5) - 1) / 2;

  return nodes.map((n) => {
    const t = n.bookIndex / (BOOKS.length - 1);

    // Clamped, not just Gaussian: the tails of Box-Muller reach past 3 sigma, and at band * 0.42
    // that spills a book's topics into its neighbour.
    const raw = gauss(hash01(n.id + ':y'), hash01(n.id + ':y2')) * band * 0.3;
    const jitter = Math.max(-band * 0.45, Math.min(band * 0.45, raw));
    const y = Math.min(height, Math.max(0, t * height + jitter));

    const spread = 0.55 + 0.6 * Math.sqrt((n.bookSlot + 0.5) / n.bookSize);
    const radius = (120 + 350 * t) * spread;
    const angle = (n.bookSlot * PHI) % 1 * 2 * Math.PI;

    return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, c: n.c };
  });
}