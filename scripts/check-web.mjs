// Invariants for the generated web payloads. Run after `npm run build:web`:
//
//   node scripts/check-web.mjs
//
// Checks that every book has a unique slug, that each live book's payload accounts for every topic
// and edge it should, that no two nodes share a cell, and that the committed files match a fresh
// build. Exits non-zero on the first failing group.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOOKS, bookOf } from './lib/graph-layout.mjs';
import { LIVE_BOOKS, slugOf } from './lib/books.mjs';
import { SECTIONS } from './lib/book-sections.mjs';
import { buildBookPayload } from './lib/book-payload.mjs';
import { buildPayload } from './lib/graph-payload.mjs';
import { bookPage } from './lib/book-page.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));
const data = {
  topics: load('topics.json').topics,
  dependencies: load('dependencies.json').dependencies,
  relations: load('relations.json').relations,
  covenants: load('covenants.json').covenants,
};

let failed = 0;
const check = (name, fn) => {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message.split('\n')[0]}`); }
};

check('every book has a unique slug', () => {
  const slugs = BOOKS.map(slugOf);
  assert.equal(new Set(slugs).size, BOOKS.length);
  assert.ok(slugs.every((s) => /^[a-z0-9-]+$/.test(s)), 'slug has characters that are not URL-safe');
});

check('every live book has sections defined', () => {
  for (const code of LIVE_BOOKS) assert.ok(SECTIONS[code], `${code} is live but has no entry in book-sections.mjs`);
});

for (const code of LIVE_BOOKS) {
  const slug = slugOf(code);
  const book = buildBookPayload(code, data);
  const N = book.nodes;
  const core = N.filter((n) => !n.p);
  const portals = N.filter((n) => n.p);
  const ids = new Set(N.map((n) => n.id));

  check(`${slug}: every topic of the book is a core node, once`, () => {
    const expected = data.topics.filter((t) => bookOf(t.id) === code).map((t) => t.id).sort();
    assert.deepEqual(core.map((n) => n.id).sort(), expected);
    assert.equal(ids.size, N.length, 'a topic appears twice');
  });

  check(`${slug}: portals are all outside the book and linked to it`, () => {
    for (const n of portals) assert.notEqual(n.bk, code, `${n.id} is in the book`);
    const linked = new Set();
    for (const [a, b] of book.edges) { linked.add(a); linked.add(b); }
    for (const [a, b] of book.rel) { linked.add(a); linked.add(b); }
    N.forEach((n, i) => { if (n.p) assert.ok(linked.has(i), `portal ${n.id} has no edge`); });
  });

  check(`${slug}: no edge or relation touching the book was dropped`, () => {
    const inBook = (id) => bookOf(id) === code;
    const wantEdges = data.dependencies.filter((e) => (inBook(e.topicId) || inBook(e.prerequisiteId)));
    const wantRels = data.relations.filter((r) => (inBook(r.from) || inBook(r.to)));
    assert.equal(book.edges.length, wantEdges.length, 'prerequisite edges');
    assert.equal(book.rel.length, wantRels.length, 'relations');
  });

  check(`${slug}: edges index real nodes`, () => {
    for (const [a, b] of [...book.edges, ...book.rel]) {
      assert.ok(N[a] && N[b], `edge ${a}-${b} points outside the node list`);
      assert.ok(!N[a].p || !N[b].p, 'an edge joins two portals');
    }
  });

  check(`${slug}: no two nodes share a cell, and all sit inside their lane`, () => {
    const seen = new Set();
    for (const n of N) {
      const key = `${n.x},${n.y}`;
      assert.ok(!seen.has(key), `${n.id} overlaps another node at ${key}`);
      seen.add(key);
      const lane = book.lanes.find((l) => (n.p ? l.s === -2 : l.s === n.s));
      assert.ok(lane, `${n.id} has no lane (section ${n.s})`);
      assert.ok(n.y > lane.y && n.y < lane.y + lane.h, `${n.id} sits outside its lane`);
      assert.ok(n.x > 0 && n.x < book.width, `${n.id} sits outside the canvas`);
    }
  });

  check(`${slug}: every portal link resolves to a known book`, () => {
    const known = new Set(book.books.map((b) => b.code));
    for (const n of portals) assert.ok(known.has(n.bk), `${n.id}: unknown book ${n.bk}`);
  });

  check(`${slug}: committed files match a fresh build`, () => {
    const onDisk = readFileSync(join(root, 'web', slug, 'graph.json'), 'utf8');
    assert.equal(onDisk, JSON.stringify(book) + '\n', 'web/graph.json is stale: run npm run build:web');
    assert.equal(readFileSync(join(root, 'web', slug, 'index.html'), 'utf8'), bookPage(book), 'index.html is stale');
  });
}

check('whole-canon payload carries a slug and live flag for every book', () => {
  const p = buildPayload(data);
  assert.equal(p.books.length, BOOKS.length);
  for (const b of p.books) assert.ok(b.slug && typeof b.live === 'boolean', b.code);
  assert.equal(readFileSync(join(root, 'web', 'graph.json'), 'utf8'), JSON.stringify(p) + '\n', 'web/graph.json is stale');
});

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log('\nall web checks pass');
