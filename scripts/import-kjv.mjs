// Parses the Project Gutenberg KJV (ebook #10) into data/kjv.json. Text is copied from the source, never typed.
// Usage: node scripts/import-kjv.mjs   (expects sources/kjv/pg10.txt)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(join(root, 'sources/kjv/pg10.txt'), 'utf8');

const BOOKS = ('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN ' +
  'HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH ' +
  '1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV').split(' ');

const lines = raw.split(/\r?\n/);
const start = lines.findIndex((l) => l.startsWith('*** START OF'));
const end = lines.findIndex((l) => l.startsWith('*** END OF'));
const firstOT = lines.findIndex((l, i) => i > start && l.trim() === 'The Old Testament of the King James Version of the Bible');
const firstBook = lines.findIndex((l, i) => i > firstOT && l.trim() === 'The First Book of Moses: Called Genesis');
// Headings are removed only when they are standalone lines (blank before and after) AND appear in an explicit
// allowlist: the titles from the Gutenberg contents block plus the extra heading lines seen in the body.
// (A blank-line heuristic alone wrongly removes real one-line verse endings.) Removed lines are recorded.
const firstVerseLine = lines.findIndex((l, i) => i > start && /^1:1\s/.test(l));
const headingAllow = new Set([
  ...lines.slice(start + 1, firstVerseLine).map((l) => l.trim()).filter(Boolean),
  'Otherwise Called:', 'Commonly Called:', 'The Third Book of the Kings', 'The Fourth Book of the Kings', 'The Proverbs', 'Ecclesiastes', 'or', 'The Preacher', '***',
  'The New Testament of the King James Bible',
]);
const seg = lines.slice(firstBook, end);
const isHeading = (l, i) =>
  headingAllow.has(l.trim()) && (seg[i - 1] ?? '').trim() === '' && (seg[i + 1] ?? '').trim() === '';
const bodyHeadings = seg.filter(isHeading).map((l) => l.trim());
const body = seg.filter((l, i) => !isHeading(l, i)).join('\n');

const re = /(?<![\d:])(\d{1,3}):(\d{1,3})\s/g;
const hits = [...body.matchAll(re)];
const verses = {};
let book = -1, chap = 0, verse = 0;
hits.forEach((m, i) => {
  const c = +m[1], v = +m[2];
  if (c === 1 && v === 1) { book++; }
  else if (!((c === chap && v === verse + 1) || (c === chap + 1 && v === 1))) {
    throw new Error(`Sequence break at "${m[0]}" after ${BOOKS[book]} ${chap}:${verse}`);
  }
  chap = c; verse = v;
  const text = body.slice(m.index + m[0].length - 1, i + 1 < hits.length ? hits[i + 1].index : undefined).replace(/\s+/g, ' ').trim();
  verses[`${BOOKS[book]}.${c}.${v}`] = text;
});
if (book !== 65) throw new Error(`Expected 66 books, found ${book + 1}`);

const out = {
  version: 'v0',
  translation: 'KJV',
  source: {
    name: 'Project Gutenberg eBook #10, The King James Version of the Bible',
    url: 'https://www.gutenberg.org/ebooks/10',
    file: 'https://www.gutenberg.org/cache/epub/10/pg10.txt',
    sha256: createHash('sha256').update(raw).digest('hex'),
    strippedHeadings: bodyHeadings,
  },
  verseCount: Object.keys(verses).length,
  verses,
};
writeFileSync(join(root, 'data/kjv.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`kjv.json: ${out.verseCount} verses, 66 books`);
