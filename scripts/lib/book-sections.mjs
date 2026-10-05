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
  JOS: define("Joshua", [
    ["entering-the-land", "Entering the land", "1\u20135", [1, 1]],
    ["the-conquest", "The conquest", "6\u201312", [6, 1]],
    ["dividing-the-land", "Dividing the land", "13\u201321", [13, 1]],
    ["farewell-and-covenant", "Farewell and covenant", "22\u201324", [22, 1]],
  ]),
  JDG: define("Judges", [
    ["why-the-judges-came", "Why the judges came", "1:1\u20133:6", [1, 1]],
    ["othniel-to-gideon", "Othniel to Gideon", "3:7\u20138:35", [3, 7]],
    ["abimelech-to-jephthah", "Abimelech to Jephthah", "9\u201312", [9, 1]],
    ["samson", "Samson", "13\u201316", [13, 1]],
    ["idolatry-and-civil-war", "Idolatry and civil war", "17\u201321", [17, 1]],
  ]),
  RUT: define("Ruth", [
    ["loss-and-return", "Loss and return", "1", [1, 1]],
    ["redemption", "Redemption", "2\u20134", [2, 1]],
  ]),
  '1SA': define("1 Samuel", [
    ["samuel", "Samuel", "1\u20137", [1, 1]],
    ["israel-asks-for-a-king", "Israel asks for a king", "8\u201312", [8, 1]],
    ["saul-rejected", "Saul rejected", "13\u201315", [13, 1]],
    ["david-at-sauls-court", "David at Saul\u2019s court", "16\u201320", [16, 1]],
    ["david-on-the-run", "David on the run", "21\u201331", [21, 1]],
  ]),
  '2SA': define("2 Samuel", [
    ["david-becomes-king", "David becomes king", "1\u20135", [1, 1]],
    ["the-ark-and-the-covenant", "The ark and the covenant", "6\u201310", [6, 1]],
    ["bathsheba-and-nathan", "Bathsheba and Nathan", "11\u201312", [11, 1]],
    ["absaloms-rebellion", "Absalom\u2019s rebellion", "13\u201320", [13, 1]],
    ["appendices", "Appendices", "21\u201324", [21, 1]],
  ]),
  '1KI': define("1 Kings", [
    ["solomons-accession", "Solomon\u2019s accession", "1\u20132", [1, 1]],
    ["wisdom-and-the-temple", "Wisdom and the temple", "3\u20138", [3, 1]],
    ["solomons-decline", "Solomon\u2019s decline", "9\u201311", [9, 1]],
    ["the-kingdom-divides", "The kingdom divides", "12\u201316", [12, 1]],
    ["elijah-and-ahab", "Elijah and Ahab", "17\u201322", [17, 1]],
  ]),
  '2KI': define("2 Kings", [
    ["elijah-and-elisha", "Elijah and Elisha", "1:1\u20138:15", [1, 1]],
    ["jehu-and-the-kings", "Jehu and the kings", "8:16\u201316", [8, 16]],
    ["the-fall-of-samaria", "The fall of Samaria", "17", [17, 1]],
    ["hezekiah", "Hezekiah", "18\u201320", [18, 1]],
    ["judahs-last-kings", "Judah\u2019s last kings", "21\u201325", [21, 1]],
  ]),
  '1CH': define("1 Chronicles", [
    ["genealogies", "Genealogies", "1\u20139", [1, 1]],
    ["davids-rise", "David\u2019s rise", "10\u201316", [10, 1]],
    ["the-covenant-and-the-wars", "The covenant and the wars", "17\u201321", [17, 1]],
    ["preparing-the-temple", "Preparing the temple", "22\u201329", [22, 1]],
  ]),
  '2CH': define("2 Chronicles", [
    ["solomon", "Solomon", "1\u20139", [1, 1]],
    ["the-divided-kingdom", "The divided kingdom", "10\u201320", [10, 1]],
    ["judahs-decline", "Judah\u2019s decline", "21\u201328", [21, 1]],
    ["hezekiah-and-josiah", "Hezekiah and Josiah", "29\u201335", [29, 1]],
    ["exile-and-cyrus", "Exile and Cyrus", "36", [36, 1]],
  ]),
  EZR: define("Ezra", [
    ["return-and-rebuilding", "Return and rebuilding", "1\u20136", [1, 1]],
    ["ezras-reform", "Ezra\u2019s reform", "7\u201310", [7, 1]],
  ]),
  NEH: define("Nehemiah", [
    ["rebuilding-the-wall", "Rebuilding the wall", "1\u20137", [1, 1]],
    ["renewing-the-covenant", "Renewing the covenant", "8\u201310", [8, 1]],
    ["resettlement-and-reform", "Resettlement and reform", "11\u201313", [11, 1]],
  ]),
  EST: define("Esther", [
    ["vashti-and-esther", "Vashti and Esther", "1\u20132", [1, 1]],
    ["hamans-plot", "Haman\u2019s plot", "3\u20135", [3, 1]],
    ["the-reversal", "The reversal", "6\u20138", [6, 1]],
    ["purim", "Purim", "9\u201310", [9, 1]],
  ]),
  JOB: define("Job", [
    ["the-prologue", "The prologue", "1\u20132", [1, 1]],
    ["the-first-round", "The first round", "3\u201314", [3, 1]],
    ["the-second-round", "The second round", "15\u201321", [15, 1]],
    ["the-third-round", "The third round", "22\u201327", [22, 1]],
    ["wisdom-and-jobs-defence", "Wisdom and Job\u2019s defence", "28\u201331", [28, 1]],
    ["elihu", "Elihu", "32\u201337", [32, 1]],
    ["the-lord-answers", "The LORD answers", "38\u201342", [38, 1]],
  ]),
  PSA: define("Psalms", [
    ["book-i", "Book I", "1\u201341", [1, 1]],
    ["book-ii", "Book II", "42\u201372", [42, 1]],
    ["book-iii", "Book III", "73\u201389", [73, 1]],
    ["book-iv", "Book IV", "90\u2013106", [90, 1]],
    ["book-v", "Book V", "107\u2013150", [107, 1]],
  ]),
  PRO: define("Proverbs", [
    ["wisdoms-call", "Wisdom\u2019s call", "1\u20139", [1, 1]],
    ["proverbs-of-solomon", "Proverbs of Solomon", "10:1\u201322:16", [10, 1]],
    ["sayings-of-the-wise", "Sayings of the wise", "22:17\u201324", [22, 17]],
    ["hezekiahs-collection", "Hezekiah\u2019s collection", "25\u201329", [25, 1]],
    ["agur-lemuel-and-the-virtuous-woman", "Agur, Lemuel and the virtuous woman", "30\u201331", [30, 1]],
  ]),
  ECC: define("Ecclesiastes", [
    ["all-is-vanity", "All is vanity", "1\u20136", [1, 1]],
    ["wisdom-folly-and-death", "Wisdom, folly and death", "7\u201310", [7, 1]],
    ["the-conclusion", "The conclusion", "11\u201312", [11, 1]],
  ]),
  SNG: define("Song of Solomon", [
    ["courtship", "Courtship", "1:1\u20133:5", [1, 1]],
    ["the-wedding", "The wedding", "3:6\u20135:1", [3, 6]],
    ["seeking-and-praise", "Seeking and praise", "5:2\u20137:9", [5, 2]],
    ["love-like-a-seal", "Love like a seal", "7:10\u20138:14", [7, 10]],
  ]),
  ISA: define("Isaiah", [
    ["judgment-and-promise", "Judgment and promise", "1\u201312", [1, 1]],
    ["the-nations", "The nations", "13\u201323", [13, 1]],
    ["the-lord-judges-and-saves", "The LORD judges and saves", "24\u201335", [24, 1]],
    ["hezekiah-and-assyria", "Hezekiah and Assyria", "36\u201339", [36, 1]],
    ["comfort", "Comfort", "40\u201348", [40, 1]],
    ["the-servant", "The servant", "49\u201355", [49, 1]],
    ["new-heavens-and-a-new-earth", "New heavens and a new earth", "56\u201366", [56, 1]],
  ]),
  JER: define("Jeremiah", [
    ["the-call-and-the-foe-from-the-north", "The call and the foe from the north", "1\u20136", [1, 1]],
    ["sermons-and-laments", "Sermons and laments", "7\u201320", [7, 1]],
    ["kings-prophets-and-exile", "Kings, prophets and exile", "21\u201329", [21, 1]],
    ["the-book-of-consolation", "The book of consolation", "30\u201333", [30, 1]],
    ["the-siege-and-its-aftermath", "The siege and its aftermath", "34\u201345", [34, 1]],
    ["the-nations-and-the-fall", "The nations and the fall", "46\u201352", [46, 1]],
  ]),
  LAM: define("Lamentations", [
    ["zions-affliction", "Zion\u2019s affliction", "1\u20132", [1, 1]],
    ["hope-in-affliction", "Hope in affliction", "3", [3, 1]],
    ["the-siege-remembered", "The siege remembered", "4\u20135", [4, 1]],
  ]),
  EZK: define("Ezekiel", [
    ["the-call", "The call", "1\u20133", [1, 1]],
    ["signs-against-jerusalem", "Signs against Jerusalem", "4\u20137", [4, 1]],
    ["the-glory-departs", "The glory departs", "8\u201311", [8, 1]],
    ["why-jerusalem-falls", "Why Jerusalem falls", "12\u201324", [12, 1]],
    ["against-the-nations", "Against the nations", "25\u201332", [25, 1]],
    ["restoration", "Restoration", "33\u201339", [33, 1]],
    ["the-new-temple", "The new temple", "40\u201348", [40, 1]],
  ]),
  DAN: define("Daniel", [
    ["faithful-in-exile", "Faithful in exile", "1\u20136", [1, 1]],
    ["the-visions-of-the-beasts", "The visions of the beasts", "7\u20138", [7, 1]],
    ["the-seventy-weeks-and-the-last-vision", "The seventy weeks and the last vision", "9\u201312", [9, 1]],
  ]),
  HOS: define("Hosea", [
    ["hoseas-marriage", "Hosea\u2019s marriage", "1\u20133", [1, 1]],
    ["the-lords-case-against-israel", "The LORD\u2019s case against Israel", "4\u201310", [4, 1]],
    ["love-and-return", "Love and return", "11\u201314", [11, 1]],
  ]),
  JOL: define("Joel", [
    ["the-locusts", "The locusts", "1:1\u20132:17", [1, 1]],
    ["restoration-and-the-day-of-the-lord", "Restoration and the day of the LORD", "2:18\u20133:21", [2, 18]],
  ]),
  AMO: define("Amos", [
    ["judgment-on-the-nations", "Judgment on the nations", "1:1\u20132:16", [1, 1]],
    ["words-against-israel", "Words against Israel", "3\u20136", [3, 1]],
    ["the-visions", "The visions", "7:1\u20139:10", [7, 1]],
    ["restoration", "Restoration", "9:11\u201315", [9, 11]],
  ]),
  OBA: define("Obadiah", [
    ["edoms-fall", "Edom\u2019s fall", "1\u201314", [1, 1]],
    ["the-day-of-the-lord", "The day of the LORD", "15\u201321", [1, 15]],
  ]),
  JON: define("Jonah", [
    ["flight", "Flight", "1:1\u201316", [1, 1]],
    ["in-the-fish", "In the fish", "1:17\u20132:10", [1, 17]],
    ["nineveh", "Nineveh", "3\u20134", [3, 1]],
  ]),
  MIC: define("Micah", [
    ["judgment-on-samaria-and-judah", "Judgment on Samaria and Judah", "1\u20133", [1, 1]],
    ["hope-and-the-ruler-from-bethlehem", "Hope and the ruler from Bethlehem", "4\u20135", [4, 1]],
    ["the-lords-case", "The LORD\u2019s case", "6\u20137", [6, 1]],
  ]),
  NAM: define("Nahum", [
    ["the-lords-jealousy", "The LORD\u2019s jealousy", "1", [1, 1]],
    ["nineveh-falls", "Nineveh falls", "2\u20133", [2, 1]],
  ]),
  HAB: define("Habakkuk", [
    ["the-prophets-questions", "The prophet\u2019s questions", "1:1\u20132:5", [1, 1]],
    ["the-five-woes", "The five woes", "2:6\u201320", [2, 6]],
    ["prayer-and-trust", "Prayer and trust", "3", [3, 1]],
  ]),
  ZEP: define("Zephaniah", [
    ["the-day-of-the-lord", "The day of the LORD", "1:1\u20132:15", [1, 1]],
    ["restoration", "Restoration", "3", [3, 1]],
  ]),
  HAG: define("Haggai", [
    ["build-the-house", "Build the house", "1:1\u20132:9", [1, 1]],
    ["blessing-from-this-day", "Blessing from this day", "2:10\u201323", [2, 10]],
  ]),
  ZEC: define("Zechariah", [
    ["the-night-visions", "The night visions", "1\u20136", [1, 1]],
    ["fasting-and-the-returning-lord", "Fasting and the returning LORD", "7\u20138", [7, 1]],
    ["the-king-and-the-shepherd", "The king and the shepherd", "9\u201314", [9, 1]],
  ]),
  MAL: define("Malachi", [
    ["priests-and-offerings", "Priests and offerings", "1:1\u20132:9", [1, 1]],
    ["treachery-and-the-messenger", "Treachery and the messenger", "2:10\u20133:6", [2, 10]],
    ["return-and-the-coming-day", "Return and the coming day", "3:7\u20134:6", [3, 7]],
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
