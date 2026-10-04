// Lexical-overlap heuristic for edges that assert a quotation (`quoted-in`, `fulfilled-in`).
//
// Thresholds were measured against the corpus in data/, not guessed. At a ratio of exactly 0 the only
// hit was a genuinely wrong ref (Luke 4:18 cited against Isaiah 58 instead of Isaiah 61). Below 0.1
// sits a band of legitimate NT paraphrase, where words like "testament" stand in for "covenant" and
// the shared vocabulary runs out. That band is reported as a count, not per edge.
//
// Every result here is advisory. Zero overlap means "read both passages and decide", never "wrong".

export const OVERLAP_ADVISORY_MAX = 0.1;

export const STOPWORDS = new Set(
  ('the and that this with for unto you his her them they from was were are but not all who him she it as be my your our their ' +
    'which there have has had also even into than when where what will would shall should may might can could do does did of in on ' +
    'at to by or if so such these those then thus because although while upon').split(' '),
);

export const OT = new Set(
  ('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN ' +
    'HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL').split(' '),
);

export const NT = new Set(
  ('MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV').split(' '),
);

export const refText = (kjvText, refs) => (refs ?? [])
  .flatMap((p) => Array.from({ length: p.verseEnd - p.verseStart + 1 },
    (_, i) => kjvText?.[`${p.book}.${p.chapter}.${p.verseStart + i}`] ?? ''))
  .join(' ');

const contentWords = (s) => s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));

// Returns { ratio, hit, of } for one edge, or null when it makes no quotation claim (no OT/NT split,
// no KJV text loaded, or a kind like `parallels` that does not assert shared wording).
export function quoteOverlap(kjvText, kind, refs) {
  if (!kjvText || !refs?.length) return null;
  if (kind !== 'quoted-in' && kind !== 'fulfilled-in') return null;
  const ot = refs.filter((p) => OT.has(p.book));
  const nt = refs.filter((p) => !OT.has(p.book));
  if (!ot.length || !nt.length) return null;
  const a = new Set(contentWords(refText(kjvText, ot)));
  const b = new Set(contentWords(refText(kjvText, nt)));
  if (!a.size) return null;
  let hit = 0;
  for (const w of a) if (b.has(w)) hit++;
  return { ratio: hit / a.size, hit, of: a.size };
}