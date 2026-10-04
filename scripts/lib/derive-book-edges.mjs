import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const rels = JSON.parse(readFileSync(join(root, 'data/relations.json'), 'utf8')).relations;
const topics = JSON.parse(readFileSync(join(root, 'data/topics.json'), 'utf8')).topics;
const OT = new Set('GEN EXO LEV NUM DEU JOS JDG RTU 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZE DAN HOS JOL AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL'.split(' '));

const bookOf = (id) => {
  const ov = id.match(/^bt_book_([a-z0-9]+)$/);
  if (ov) return ov[1].toUpperCase();
  const m = id.match(/^bt_(?:(\d)?)?([a-z]+)_/);
  return m ? (m[1] || '') + m[2].toUpperCase() : null;
};
const bookId = (b) => 'bt_book_' + b.toLowerCase();

const members = new Map();
for (const t of topics) {
  const b = bookOf(t.id);
  if (!b) continue;
  (members.get(b) || members.set(b, new Set()).get(b)).add(t.id);
}

const refStr = (r) => `${r.book} ${r.chapter}:${r.verseStart}${r.verseEnd !== r.verseStart ? '-' + r.verseEnd : ''}`;

const out = [];
const report = [];
for (const [book, ids] of [...members].sort()) {
  if (!ids.has(bookId(book))) continue;
  const tally = new Map();
  for (const r of rels) {
    if (r.kind === 'part-of-covenant') continue;
    const fIn = ids.has(r.from);
    const tIn = ids.has(r.to);
    if (fIn === tIn) continue;
    let otherSide, direction;
    if (fIn) { otherSide = r.to; direction = 'out'; } else { otherSide = r.from; direction = 'in'; }
    const ob = bookOf(otherSide);
    if (!ob || ob === book) continue;
    if (OT.has(book) === OT.has(ob)) continue;
    const key = ob + '|' + direction;
    let rec = tally.get(key);
    if (!rec) tally.set(key, (rec = { n: 0, kinds: new Map(), best: null }));
    rec.n++;
    rec.kinds.set(r.kind, (rec.kinds.get(r.kind) || 0) + 1);
    if (!rec.best || r.refs.length !== 2) rec.best = r;
  }
  const top = [...tally.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 4);
  const picked = [];
  const usedOther = new Set();
  for (const [key, rec] of top) {
    const ob = key.split('|')[0];
    if (usedOther.has(ob)) continue;
    usedOther.add(ob);
    const kind = [...rec.kinds.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const r = rec.best;
    // Roll the per-topic edge up to the two book overviews, keeping its direction
    // so `quoted-in` still reads OT -> NT the way the rest of the corpus does.
    const from = bookId(bookOf(r.from));
    const to = bookId(bookOf(r.to));
    // A relation may cite several verses on one side; the rollup wants exactly
    // one ref per book, so keep the first ref belonging to each side.
    const fb = bookOf(r.from);
    const tb = bookOf(r.to);
    const refs = [r.refs.find((x) => bookOf(x.book) === fb || x.book.toUpperCase() === fb),
      r.refs.find((x) => x.book.toUpperCase() === tb)];
    if (refs.some((x) => !x)) continue;
    picked.push({ from, to, kind, refs: refs.map(refStr) });
  }
  report.push(`${book}: ${picked.length} edges` + picked.map((p) => `\n   ${p.from} -> ${p.to}  ${p.kind}  [${p.refs.join(' / ')}]`).join(''));
  out.push(...picked);
}

// Both books in a pair can choose the same underlying edge as their example, so
// the same rollup arrives twice. Collapse on the full edge identity.
const seen = new Set();
const uniq = out.filter((r) => {
  const k = `${r.from}|${r.to}|${r.kind}|${r.refs.join('|')}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
writeFileSync(join(root, 'fragments/crosslinks-book-overviews.json'),
  JSON.stringify({ topics: [], dependencies: [], relations: uniq }, null, 1) + '\n');
console.log('collapsed', out.length - uniq.length, 'duplicate rollups');
console.log(report.join('\n'));
console.log('\ntotal book-level edges:', uniq.length);