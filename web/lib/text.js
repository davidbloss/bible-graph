// Text helpers for the book pages: escaping, reference formatting, and the lazily fetched KJV.
// Refs arrive packed as [bookIndex, chapter, firstVerse, lastVerse]; `books` resolves the index.

export const esc = (s) => {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
};

// Assessment prompts carry a {{name}} placeholder for the learner. On a public page it reads "you".
export const sayable = (s) => (s ?? '').replace(/\{\{\s*name\s*\}\}/g, 'you');

export const nf = (n) => n.toLocaleString('en-GB');

export function refFormatter(books) {
  const fmtRef = (r) => `${books[r[0]].name} ${r[2] === r[3] ? `${r[1]}:${r[2]}` : `${r[1]}:${r[2]}-${r[3]}`}`;
  const fmtRefs = (refs) => refs.map(fmtRef).join(' · ');
  const verseCount = (refs) => refs.reduce((s, r) => s + (r[3] - r[2] + 1), 0);

  // A book overview cites chapter by chapter, so 50 adjacent refs collapse to one range per book.
  const collapseRefs = (refs) => {
    if (refs.length <= 4) return fmtRefs(refs);
    const byBook = new Map();
    for (const r of refs) {
      if (!byBook.has(r[0])) byBook.set(r[0], new Set());
      byBook.get(r[0]).add(r[1]);
    }
    return [...byBook].map(([book, chapters]) => {
      const cs = [...chapters].sort((a, b) => a - b);
      return `${books[book].name} ${cs[0]}-${cs[cs.length - 1]}`;
    }).join(' · ');
  };
  return { fmtRef, fmtRefs, verseCount, collapseRefs };
}

// One fetch, shared by every caller. Resolves to the verse map, or null if the file can't be read,
// in which case the page still works and shows references without text.
// Accepts one URL or a list tried in order, so a book page works both in the
// site-root layout (GitHub Pages: ../data/kjv.json) and the repo-root layout
// (local dev at /web/<slug>/: ../../data/kjv.json).
let pending = null;
export function fetchVerses(url) {
  const urls = Array.isArray(url) ? url : [url];
  pending ??= (async () => {
    for (const u of urls) {
      try {
        const r = await fetch(u);
        if (!r.ok) continue;
        const j = await r.json();
        return j.verses;
      } catch {}
    }
    return null;
  })();
  return pending;
}
