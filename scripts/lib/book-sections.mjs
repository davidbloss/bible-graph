// How a book is divided into lanes on its own page. A topic belongs to the section its first
// passage in this book starts in; a topic whose passages in this book start in different sections
// goes in the `whole` lane, which is also where the book overview lives.
//
// `from` is [chapter, verse]. Sections must be listed in reading order. Boundaries follow the
// text's own toledot breaks, not chapter numbers alone: Genesis 25:19 opens "the generations of
// Isaac", so Isaac and Jacob begins mid-chapter.

export const SECTIONS = {
  GEN: [
    { key: 'primeval', label: 'Creation to Babel', range: 'Genesis 1–11', from: [1, 1], color: '#7FB77E' },
    { key: 'abraham', label: 'Abraham', range: 'Genesis 12:1–25:18', from: [12, 1], color: '#D9A441' },
    { key: 'jacob', label: 'Isaac and Jacob', range: 'Genesis 25:19–36', from: [25, 19], color: '#C05746' },
    { key: 'joseph', label: 'Joseph', range: 'Genesis 37–50', from: [37, 1], color: '#4EA8DE' },
  ],
};

export const WHOLE = { key: 'whole', label: 'Across the book', color: '#E4DFCE' };

// Index into SECTIONS[code], for a single [chapter, verse] start.
export function sectionAt(code, chapter, verse) {
  const list = SECTIONS[code];
  let hit = 0;
  list.forEach((s, i) => {
    if (chapter > s.from[0] || (chapter === s.from[0] && verse >= s.from[1])) hit = i;
  });
  return hit;
}
