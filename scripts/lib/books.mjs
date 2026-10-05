// Book identity shared by the whole-canon payload and the per-book views: display names, URL
// slugs, and which books have a page of their own under web/<slug>/.

// USFM codes to display names. The corpus is keyed by code and has no title table, and the
// Gutenberg source we import from uses its own headings ("The First Book of Moses: Called
// Genesis"), so the display names are written out here rather than derived.
export const BOOK_NAMES = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers', DEU: 'Deuteronomy',
  JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
  EZR: 'Ezra', NEH: 'Nehemiah', EST: 'Esther', JOB: 'Job', PSA: 'Psalms',
  PRO: 'Proverbs', ECC: 'Ecclesiastes', SNG: 'Song of Solomon', ISA: 'Isaiah',
  JER: 'Jeremiah', LAM: 'Lamentations', EZK: 'Ezekiel', DAN: 'Daniel',
  HOS: 'Hosea', JOL: 'Joel', AMO: 'Amos', OBA: 'Obadiah', JON: 'Jonah',
  MIC: 'Micah', NAM: 'Nahum', HAB: 'Habakkuk', ZEP: 'Zephaniah', HAG: 'Haggai',
  ZEC: 'Zechariah', MAL: 'Malachi', MAT: 'Matthew', MRK: 'Mark', LUK: 'Luke',
  JHN: 'John', ACT: 'Acts', ROM: 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians',
  GAL: 'Galatians', EPH: 'Ephesians', PHP: 'Philippians', COL: 'Colossians',
  '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy',
  TIT: 'Titus', PHM: 'Philemon', HEB: 'Hebrews', JAS: 'James', '1PE': '1 Peter',
  '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John', '3JN': '3 John', JUD: 'Jude',
  REV: 'Revelation',
};

// `/web/genesis/`, `/web/1-samuel/`. Derived from the display name, so the table cannot drift from it.
export const slugOf = (code) => {
  const name = BOOK_NAMES[code];
  if (!name) throw new Error(`no book name for "${code}"`);
  return name.toLowerCase().replace(/\s+/g, '-');
};

// Books that have a generated page. A cross-book link to any other book falls back to the
// whole-canon explorer (`../?topic=`), so adding a book here is the only step that turns its
// portals from fallbacks into real links. Each live book also needs an entry in book-sections.mjs.
export const LIVE_BOOKS = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'];
export const isLive = (code) => LIVE_BOOKS.includes(code);
