// Emits web/graph.json, the payload the explorer page fetches at load.
//
//   node scripts/build-graph.mjs
//
// Deterministic: unchanged data produces a byte-identical file, so the diff on a rebuild is empty
// and the committed payload does not churn. Run this after editing anything in data/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPayload, GROUPS, RELATION_KINDS } from './lib/graph-payload.mjs';
import { buildBookPayload } from './lib/book-payload.mjs';
import { bookPage } from './lib/book-page.mjs';
import { LIVE_BOOKS, slugOf } from './lib/books.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'data', f), 'utf8'));

const data = {
  topics: load('topics.json').topics,
  dependencies: load('dependencies.json').dependencies,
  relations: load('relations.json').relations,
  covenants: load('covenants.json').covenants,
};
const payload = buildPayload(data);

writeFileSync(join(root, 'web', 'graph.json'), JSON.stringify(payload) + '\n');

const { topics, edges, relations, books } = payload.counts;
const bytes = Buffer.byteLength(JSON.stringify(payload));
const unfilled = payload.nodes.filter((n) => !n.pp.length).length;
const noGroup = payload.nodes.filter((n) => n.cv === null).length;

console.log(`graph.json  ${(bytes / 1024).toFixed(0)} KB`);
console.log(`  ${topics} topics, ${edges} prerequisite edges, ${relations} relations, ${books} books`);
console.log(`  groups    ${GROUPS.map((g, i) => `${g.label} ${payload.gcount[i]}`).join('  ')}`);
console.log(`  relations ${RELATION_KINDS.map((k, i) => `${k.key} ${payload.rel.filter((r) => r[2] === i).length}`).join('  ')}`);
console.log(`  books     ${payload.books.filter((b) => !b.n).length} empty, ${Math.max(...payload.books.map((b) => b.n))} largest`);
console.log(`  ${unfilled} topics with no primaryPassages, ${noGroup} with no covenant`);
// One page per live book: web/<slug>/index.html plus its own graph.json.
for (const code of LIVE_BOOKS) {
  const book = buildBookPayload(code, data);
  const dir = join(root, 'web', slugOf(code));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'graph.json'), JSON.stringify(book) + '\n');
  writeFileSync(join(dir, 'index.html'), bookPage(book));
  const c = book.counts;
  console.log(`${slugOf(code)}/  ${(Buffer.byteLength(JSON.stringify(book)) / 1024).toFixed(0)} KB  ${c.topics} topics, ${c.portals} portals, ${c.edges} prerequisite edges, ${c.relations} relations (${c.outbound} cross-book)`);
}
