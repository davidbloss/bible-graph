// How a book is divided into lanes on its own page. A topic belongs to the section its first
// passage in this book starts in; a topic whose passages in this book start in different sections
// goes in the `whole` lane, which is also where the book overview lives.
//
// `from` is [chapter, verse]. Sections must be listed in reading order. Boundaries follow the
// text's own toledot breaks, not chapter numbers alone: Genesis 25:19 opens "the generations of
// Isaac", so Isaac and Jacob begins mid-chapter.

// One colour per section, in reading order, shared by every book so the same position in a book
// reads the same way across pages.
const PALETTE = ['#7FB77E', '#D9A441', '#C05746', '#4EA8DE', '#B07CD4', '#5FBFA0', '#E8A0BF'];

// [key, label, range, [chapter, verse]] per section.
const define = (code, rows) => rows.map(([key, label, range, from], i) => ({ key, label, range: `${code} ${range}`, from, color: PALETTE[i % PALETTE.length] }));

export const SECTIONS = {
  GEN: define('Genesis', [
    ['primeval', 'Creation to Babel', '1\u201311', [1, 1]],
    ['abraham', 'Abraham', '12:1\u201325:18', [12, 1]],
    ['jacob', 'Isaac and Jacob', '25:19\u201336', [25, 19]],
    ['joseph', 'Joseph', '37\u201350', [37, 1]],
  ]),
  EXO: define('Exodus', [
    ['bondage', 'Bondage and the call', '1\u20134', [1, 1]],
    ['plagues', 'Plagues and Passover', '5:1\u201313:16', [5, 1]],
    ['wilderness', 'Sea and wilderness', '13:17\u201318', [13, 17]],
    ['sinai', 'The covenant at Sinai', '19\u201324', [19, 1]],
    ['plans', 'The tabernacle plans', '25\u201331', [25, 1]],
    ['calf', 'The golden calf', '32\u201334', [32, 1]],
    ['built', 'The tabernacle built', '35\u201340', [35, 1]],
  ]),
  LEV: define('Leviticus', [
    ['offerings', 'The offerings', '1\u20137', [1, 1]],
    ['priests', 'The priesthood', '8\u201310', [8, 1]],
    ['clean', 'Clean and unclean', '11\u201315', [11, 1]],
    ['atonement', 'Atonement and blood', '16\u201317', [16, 1]],
    ['holiness', 'The holiness code', '18\u201322', [18, 1]],
    ['feasts', 'Feasts and jubilee', '23\u201325', [23, 1]],
    ['covenant', 'Blessings, curses and vows', '26\u201327', [26, 1]],
  ]),
  NUM: define('Numbers', [
    ['camp', 'The camp at Sinai', '1:1\u20139:23', [1, 1]],
    ['kadesh', 'From Sinai to Kadesh', '10\u201314', [10, 1]],
    ['years', 'The wilderness years', '15\u201319', [15, 1]],
    ['moab', 'Meribah to Moab', '20\u201325', [20, 1]],
    ['land', 'A new generation', '26\u201336', [26, 1]],
  ]),
  DEU: define('Deuteronomy', [
    ['recall', 'Moses recalls the journey', '1\u20133', [1, 1]],
    ['call', 'The call to obey', '4\u201311', [4, 1]],
    ['statutes', 'The statutes', '12\u201326', [12, 1]],
    ['moab', 'The covenant at Moab', '27\u201330', [27, 1]],
    ['last', 'Moses\u2019 last words', '31\u201334', [31, 1]],
  ]),
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
