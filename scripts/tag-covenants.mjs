#!/usr/bin/env node
// Assigns a covenant to every topic the framework can place, and records a considered decision for
// every book.
//
// FRAMEWORK SOURCE
//   Paul R. Williamson, "The Biblical Covenants," The Gospel Coalition, Concise Theology series.
//   https://www.thegospelcoalition.org/essay/the-biblical-covenants/
//
// The essay is CC BY-SA 4.0 and free to adapt with attribution, which this file, data/covenants.json
// and README.md provide. Its chronology is the authority for both tables below.
//
// WHAT THE ESSAY CLAIMS, AND HOW IT MAPS ONTO THE SIX IDS ALREADY IN data/covenants.json
//
//   1. Noah is the first *explicit* covenant: the word first appears at Gen 6:18. `cv_noahic` is the
//      entry point of the explicit sequence.
//   2. The Abrahamic covenant is argued to be *two* covenants rather than one:
//        stage 1, Gen 15:18     - the national promise, that Abraham will become "a great nation";
//        stage 2, Gen 17:1-14   - the international promise, "all peoples"/nations/kings, the
//                                 "everlasting covenant" of Gen 17:7, the covenant of circumcision
//                                 (Acts 7:8), ratified by solemn oath at Gen 22:16-18.
//      Both stages stay under the existing `cv_abrahamic` id so no topic loses its tag. The split is
//      recorded in data/covenants.json under `stages`, so the legend can be split later without
//      re-tagging.
//   3. Creation is not an explicit covenant. The essay calls it a "probationary covenant of
//      works/creation" belonging to *Reformed/Covenant Theology*, and is explicit that other
//      scholars "are unpersuaded". `cv_creation` is kept as a theological prior with that caveat
//      recorded next to it.
//   4. The Davidic covenant is never called one in its own establishing text. 2 Sam 7 and 1 Chr 17
//      promise a dynasty without using the word; the covenant framing comes from 2 Sam 23:5,
//      2 Chr 7:18, 2 Chr 13:5, Ps 89:3 and Jer 33:21. `cv_davidic` rests on those texts, and the
//      essay's six Abraham-David parallels are why Genesis's royal-line chapters sit here rather
//      than under Abraham.
//
// ASSIGNMENT RULE
// A topic is tagged with the covenant stage its primary text belongs to under the essay's
// chronology. Most specific wins: a cited verse beats a cited chapter range, which beats the book's
// default. A text the framework does not place stays null, which is a recorded decision rather than
// an omission, so BOOK_DEFAULT covers all 66 books and each entry carries a reason.
//
// Every rule's reference is a passage the essay itself cites, unless it is prefixed `repo:` — those
// are this project's own inferences and are flagged so a reviewer knows which is which.
//
//   node scripts/tag-covenants.mjs --dry    report without writing
//   node scripts/tag-covenants.mjs          write data/topics.json
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry');

const ESSAY = 'https://www.thegospelcoalition.org/essay/the-biblical-covenants/';

// Every book appears exactly once, so coverage is checkable rather than implied.
// `null` means the essay gives the book no place in the covenant sequence.
const BOOK_DEFAULT = {
  GEN: [null, 'Genesis carries all five stages, so the overview has no single covenant; its chapters are tagged individually below.'],
  EXO: ['cv_mosaic', 'The emancipation of Abraham\'s offspring, then the law at Sinai. Essay: Exod. 19:4-6; 20-23; 24:7; 32-34.'],
  LEV: ['cv_mosaic', 'Holiness and Day of Atonement worship, which the essay names as maintaining the covenant relationship. Essay: Lev. 16; 19:1.'],
  NUM: ['cv_mosaic', 'The essay says the Mosaic covenant "guaranteed the preservation of Israel... in the land". Numbers is that wilderness preservation, including the tabernacle.'],
  DEU: ['cv_mosaic', 'Israel\'s calling to reflect God\'s holiness to the nations. Essay: Deut. 4:6-8; 18:15.'],
  JOS: ['cv_mosaic', 'Entry into the promised inheritance the Mosaic covenant guarded.'],
  JDG: ['cv_mosaic', 'The covenant cycle of violation, judgment and deliverance, before the monarchy the Davidic stage needs.'],
  RUT: ['cv_davidic', 'A genealogy reaching David; the essay cites Ruth 4:18-22 as tracing the royal line already visible in Genesis.'],
  '1SA': ['cv_mosaic', 'The constitution of Israel at Shiloh and the covenant renewal at Mizpah, before the monarchy arrives.'],
  '2SA': ['cv_davidic', 'Nathan\'s oracle. Essay: 2 Sam. 7; cf. 23:5 for the covenant framing.'],
  '1KI': ['cv_davidic', 'The temple Solomon builds is God building a house for David, which is the oracle\'s promise.'],
  '2KI': ['cv_mosaic', 'The essay\'s judgment: persistent covenant failure destroys both nation and monarchy.'],
  '1CH': ['cv_davidic', 'The Chroniclers\' parallel to 2 Sam 7. Essay: 1 Chr. 17.'],
  '2CH': ['cv_davidic', 'Essay: 2 Chr. 7:18; 13:5, among the texts that call the Davidic promise a covenant.'],
  EZR: ['cv_mosaic', 'Return and restoration of the law; the essay notes the obligations were re-issued unchanged after failure.'],
  NEH: ['cv_mosaic', 'Confession and covenant renewal, which re-runs the Exodus pattern the essay describes.'],
  EST: [null, 'No covenant text in the book: silent providence and a hidden king. Nothing the essay uses to build the sequence.'],
  JOB: [null, 'Wisdom and suffering disputation. No covenant stage in the essay.'],
  PSA: [null, 'Too varied for a book default; only the psalms the essay cites for the Davidic stage are tagged below.'],
  PRO: [null, 'Wisdom literature. No covenant stage in the essay.'],
  ECC: [null, 'Wisdom and vanity. No covenant stage in the essay.'],
  SNG: [null, 'Love poetry. No covenant stage in the essay.'],
  ISA: ['cv_new', 'The essay builds its new covenant section on Isaiah: the everlasting covenant of peace and the Servant. Essay: Isa. 42:6; 49:8; 54:10; 55:3; 56:1-6; 61:8.'],
  JER: [null, 'The essay cites specific chapters, not the whole book: Jer 31 for the new covenant and Jer 33:21 for David. Much of the rest is judgment for covenant breach.'],
  LAM: [null, 'The judgment fall-out. No covenant stage in the essay.'],
  EZK: [null, 'The essay cites one passage, Ezek. 36:26-27, so only that is tagged.'],
  DAN: [null, 'The essay does not use Daniel, so its "new covenant" passages stay untagged for a reviewer to consider.'],
  HOS: [null, 'Covenant-breach prophecy, but not cited by the essay.'],
  JOL: [null, 'Day of the Lord locusts. No covenant stage in the essay.'],
  AMO: [null, 'Covenant justice and judgment, but not cited by the essay.'],
  OBA: [null, 'Judgment on Edom. No covenant stage in the essay.'],
  JON: [null, 'Foreign missions and divine patience. No covenant stage in the essay.'],
  MIC: [null, 'Covenant and justice prophecy, but not cited by the essay.'],
  NAM: [null, 'Judgment on Nineveh. No covenant stage in the essay.'],
  HAB: [null, 'A disputation on divine justice. No covenant stage in the essay.'],
  ZEP: [null, 'Day of the Lord. No covenant stage in the essay.'],
  HAG: [null, 'Rebuilding the temple. No covenant stage in the essay.'],
  ZEC: [null, 'Contains "my covenant" at 11:13 and 13:7, but the essay does not use it, so it stays for review.'],
  MAL: [null, 'Covenant remembrance, but not cited by the essay.'],
  MAT: ['cv_new', 'Genealogy and the Davidic son who ratifies the covenant in his blood. Essay: Matt. 1:17-18; 2:4-6; 16:16; 21:9; 22:41-46; 26:28.'],
  MRK: ['cv_new', 'Essay: Mark 14:24, the blood of the new covenant.'],
  LUK: ['cv_new', 'Essay: Luke 1:54-55; 1:69-75; 2:4-6; 2:11; 2:38; 22:20; 24:46-47.'],
  JHN: ['cv_new', 'Essay: John 7:42, "the Christ of David"; the Gospel whose subject ratifies the covenant.'],
  ACT: ['cv_new', 'The new covenant proclaimed and opened to the nations. Essay: Acts 2:22-36; 13:39; 15:1-29.'],
  ROM: [null, 'The essay uses Rom. 1:2-6, 3:22-24, 4:16-18 and 15:8-12, so only those are tagged rather than the whole letter.'],
  '1CO': [null, 'Too varied for a book default; only the Lord\'s Supper passage the essay cites is tagged below.'],
  '2CO': [null, 'Too varied for a book default; only the old/new contrast the essay cites is tagged below.'],
  GAL: [null, 'The essay uses Gal. 3:7-14, 29 and the Hagar/Sarah contrast of 4:21-31, so only those chapters are tagged.'],
  EPH: [null, 'Too varied for a book default; only the chapter the essay cites is tagged below.'],
  PHP: [null, 'Joy and partnership letter. No covenant stage in the essay.'],
  COL: [null, 'Too varied for a book default; only chapter 1, which the essay cites, is tagged below.'],
  '1TH': [null, 'Eschatology and conduct. No covenant stage in the essay.'],
  '2TH': [null, 'Perseverance. No covenant stage in the essay.'],
  '1TI': [null, 'Church order. No covenant stage in the essay.'],
  '2TI': [null, 'Suffering and endurance. No covenant stage in the essay.'],
  TIT: [null, 'Church order. No covenant stage in the essay.'],
  PHM: [null, 'A private letter on faithfulness and reconciliation. No covenant stage in the essay.'],
  HEB: ['cv_new', 'The essay\'s longest section: Hebrews argues the superiority and eternity of the new covenant. Essay: Heb. 7:22-8:6; 9:11-10:18; 13:20.'],
  JAS: [null, 'Wisdom and conduct. No covenant stage in the essay.'],
  '1PE': [null, 'Covenant language, but not cited by the essay, so it stays for review.'],
  '2PE': [null, 'False teachers and the delay of the day. No covenant stage in the essay.'],
  '1JN': ['cv_new', 'Essay: 1 John 1:7, forgiveness secured by the blood of Jesus.'],
  '2JN': [null, 'A short letter about truth and hospitality. No covenant stage in the essay.'],
  '3JN': [null, 'A private letter about hospitality. No covenant stage in the essay.'],
  JUD: [null, 'A letter contending for the faith. No covenant stage in the essay.'],
  REV: ['cv_new', 'The essay\'s destination, the new covenant\'s eschatological fulfilment. Essay: Rev. 1:5; 7:14; 12:10-11; 21:3; 22:16.'],
};

// [covenant, book, chapterStart, chapterEnd, verseStart, verseEnd, reference, reason]
// `reference` is a citation from the essay unless prefixed "repo:".
const PASSAGE_RULES = [
  // Noahic: "the first divine-human covenant is thus the one established in the days of Noah".
  ['cv_noahic', 'GEN', 6, 6, 18, 18, 'Gen. 6:18', 'The first appearance of the word "covenant" in Scripture.'],
  ['cv_noahic', 'GEN', 8, 9, null, null, 'Gen. 8:20-9:17', 'The covenant established after the flood, with the rainbow as its sign.'],
  ['cv_noahic', 'GEN', 7, 7, null, null, 'Gen. 6:18; 8:21-22', 'The judgment that interrupted the creational order, which this covenant promises never again will.'],
  ['cv_noahic', 'GEN', 10, 11, null, null, 'repo: Noahic period per the Gen. 6-9 chronology', 'Post-flood humanity and the scattering that sets up "all peoples" in Gen. 12:3.'],
  ['cv_noahic', 'ISA', 54, 54, 9, 9, 'Isa. 54:9', 'The one non-biblical covenant text the essay cites: waters that will no longer flood the earth.'],

  // Creation: "a probationary covenant of works/creation... established between God and Adam".
  ['cv_creation', 'GEN', 1, 3, null, null, 'Gen. 1:26-30; 2:15-17', 'Adam\'s probation in the garden: the covenant of works.'],
  ['cv_creation', 'ROM', 5, 5, 12, 21, 'repo: existing cv_creation tag, retained', 'Adam and Christ as the two covenant heads, where the works covenant does its work in the canon.'],

  // Abrahamic, stage 1 the national promise of Gen 15:18, then stage 2 of Gen 17:1-14.
  ['cv_abrahamic', 'ROM', 4, 4, 1, 25, 'Rom. 4:1-25', 'Paul\'s exposition of Gen. 15 and 17: righteousness by faith, circumcision as the sign.'],
  ['cv_abrahamic', 'GEN', 17, 17, 1, 14, 'Gen. 17:1-14', 'Stage 2: the "everlasting covenant", nations and kings, with circumcision as its sign (Acts 7:8).'],
  ['cv_abrahamic', 'GEN', 22, 22, 16, 18, 'Gen. 22:16-18', 'The oath by which Abraham\'s faith ratifies the Gen. 17 promises: blessing to all nations through the seed.'],
  ['cv_abrahamic', 'GEN', 12, 15, null, null, 'Gen. 12:1-3; 15:18', 'The promises God ratifies by covenant: nation and name, then offspring as a great nation.'],
  ['cv_abrahamic', 'GEN', 18, 18, null, null, 'Gen. 18:19', '"Walk before God and be blameless", the demand Abraham received in Gen. 17:1.'],
  ['cv_abrahamic', 'GEN', 26, 26, null, null, 'Gen. 26:3-5', 'The covenant promises reaffirmed to Isaac, and Israel\'s own obligation to keep them.'],
  ['cv_abrahamic', 'GEN', 21, 21, null, null, 'Gen. 17:21; 21:12', 'Isaac named as the one through whom the covenant is perpetuated.'],
  ['cv_abrahamic', 'GEN', 24, 25, null, null, 'repo: Isaac named at Gen. 17:21 as the covenant line', 'Choosing Isaac\'s wife secures the line the covenant depends on.'],
  ['cv_abrahamic', 'ACT', 7, 7, 8, 8, 'Acts 7:8', 'Stephen calls the Gen. 17 covenant the covenant of circumcision.'],
  ['cv_abrahamic', 'GAL', 3, 3, null, null, 'Gal. 3:16', 'The seed of Abraham. The chapter\'s subject is Abraham, so it sits here rather than under the new covenant that also quotes it.'],
  ['cv_abrahamic', 'ROM', 9, 9, null, null, 'repo: the seed promise of Gen. 15 and 17, which the essay cites', 'God\'s election from Isaac and Jacob onward: the choice of the line the Abrahamic covenant secures.'],
  ['cv_abrahamic', 'PSA', 105, 105, null, null, 'repo: the Abrahamic covenant the essay treats in Gen. 12-50', 'The psalm recites God\'s covenant with Abraham, Isaac and Jacob, giving them Canaan, and then the exodus.'],

  // Davidic: 2 Sam 7 / 1 Chr 17, plus the texts that give the promise covenant language.
  ['cv_davidic', '2SA', 7, 7, 8, 26, '2 Sam. 7:8-11, 23-26', 'Nathan\'s oracle: God will build a dynasty, and it interacts with Israel\'s own calling.'],
  ['cv_davidic', '2SA', 23, 23, 5, 5, '2 Sam. 23:5', 'One of the texts that explicitly calls the Davidic promise a covenant.'],
  ['cv_davidic', '2CH', 7, 7, 18, 18, '2 Chr. 7:18', 'Solomon invoking the covenant at temple dedication.'],
  ['cv_davidic', '2CH', 13, 13, 5, 5, '2 Chr. 13:5', 'The covenant "with David".'],
  ['cv_davidic', 'GEN', 49, 49, 10, 10, 'Gen. 49:10', 'The ruling line of Judah, cited in the essay\'s Davidic section.'],
  ['cv_davidic', 'GEN', 35, 35, 11, 11, 'Gen. 35:11', 'The royal line already traced in Genesis.'],
  ['cv_davidic', 'GEN', 38, 38, null, null, 'Gen. 38', 'Judah, from whose line the promised king comes.'],
  ['cv_abrahamic', 'GEN', 12, 50, null, null, 'Gen. 12:1-3; 15:13-14', 'The patriarchs as a whole. The essay\'s Abrahamic section is built on Genesis 12-50: the promises, Isaac as the inheriting line (17:21), the oath at 22:16-18, and Abraham\'s descendants preserved in Egypt (15:13-14). Placed after the Davidic rules so Gen. 35:11, 38 and 49:10 keep the royal line where it belongs.'],
  ['cv_davidic', 'RUT', 4, 4, 18, 22, 'Ruth 4:18-22', 'The genealogy that ends in David.'],
  ['cv_davidic', 'JER', 33, 33, 21, 21, 'Jer. 33:21', 'The dynasty\'s permanence after the exile.'],
  ['cv_davidic', 'JER', 23, 23, 5, 5, 'repo: the Davidic covenant at Jer. 33:21, which the essay cites', 'The Branch raised up to David, the promised royal seed this covenant identifies.'],
  ['cv_davidic', 'PSA', 89, 89, 3, 3, 'Ps. 89:3, 23, 26, 30-32', 'God\'s covenant with David: seed, victory, sonship and law-keeping, which mirror the Abrahamic covenants.'],
  ['cv_davidic', 'PSA', 72, 72, 17, 17, 'Ps. 72:17', 'The king whose offspring are blessed, fulfilling Gen. 22:18.'],
  ['cv_davidic', 'PSA', 132, 132, 12, 12, 'Ps. 132:12', 'God\'s oath to David concerning his sons and his law.'],

  // Mosaic: Sinai, and the texts that keep the covenant in view.
  ['cv_mosaic', 'EXO', 19, 19, 4, 6, 'Exod. 19:4-6', '"You will be a treasured possession, a kingdom of priests, a holy nation."'],
  ['cv_mosaic', 'EXO', 24, 24, 7, 8, 'Exod. 24:7', 'The blood of the covenant at Sinai, which Luke 22:20 contrasts with the blood of the new.'],
  ['cv_mosaic', 'EXO', 20, 23, null, null, 'Exod. 20-23', 'The stipulations Israel must keep to be manifestly different from the nations.'],
  ['cv_mosaic', 'EXO', 32, 34, null, null, 'Exod. 32-34', 'The golden calf and the re-establishment of the same obligations, an act of grace rather than justice.'],
  ['cv_mosaic', 'LEV', 16, 16, null, null, 'Lev. 16', 'Day of Atonement worship, which ritually atones and maintains the relationship.'],
  ['cv_mosaic', 'LEV', 19, 19, 1, 2, 'Lev. 19:1', 'Reflecting God\'s holiness is Israel\'s vocation as a witness nation.'],
  ['cv_mosaic', 'DEU', 4, 4, 6, 8, 'Deut. 4:6-8', 'The nations see Israel\'s wisdom and make God\'s name known.'],
  ['cv_mosaic', 'DEU', 18, 18, 15, 15, 'Deut. 18:15', 'The prophet like Moses, whom Jesus is said to fulfil (Matt. 17:5).'],
  ['cv_mosaic', 'EXO', 1, 18, null, null, 'repo: Exodus as the deliverance Gen. 15:13-14 anticipates', 'The emancipation the essay says Sinai follows. Also the blood of the passover lamb.'],
  ['cv_mosaic', 'JER', 11, 11, null, null, 'repo: the Book of the Covenant at Exod. 34', 'The words of this covenant and the plot against Jeremiah, an indictment under the Mosaic covenant.'],
  ['cv_mosaic', 'JER', 34, 34, null, null, 'repo: Exod. 21:2-6, which Jer. 34:8-16 echoes', 'Jeremiah explicitly calls it "the covenant of the LORD": release of Hebrew slaves, a Mosaic statute.'],
  ['cv_mosaic', 'JER', 36, 36, null, null, 'repo: Moses at Horeb, cf. Exod. 33-34', 'The prophet like Moses and the new covenant written on the heart: both in view at this chapter. Mosaic.'],
  ['cv_abrahamic', 'HEB', 6, 6, 13, 20, 'repo: God\'s oath after Gen. 22, which the essay cites at 22:16-18', 'The oath of Gen. 22 pressed as an anchor of the soul, and Abraham\'s promise of a city.'],

  // New covenant: Jeremiah, Ezekiel, Isaiah, and the fulfilment texts the essay cites.
  ['cv_new', 'JER', 31, 31, 31, 34, 'Jer. 31:31-34', 'The one explicit "new covenant" in the OT: internalised Torah and forgiven sins.'],
  ['cv_new', 'EZK', 36, 36, 26, 27, 'Ezek. 36:26-27', 'The heart change that makes the new covenant possible.'],
  ['cv_new', 'EZK', 37, 37, 26, 28, 'repo: the new covenant at Ezek. 36:26-27, which the essay cites', 'Two sticks made one nation under one king, and "I will put my covenant with them": the covenant of peace the essay calls everlasting.'],
  ['cv_new', 'ISA', 42, 42, 6, 6, 'Isa. 42:6', 'The Servant as covenant to the nations.'],
  ['cv_new', 'ISA', 49, 49, 8, 8, 'Isa. 49:8', 'The Servant restoring the land and the nations.'],
  ['cv_new', 'ISA', 55, 55, 3, 3, 'Isa. 55:3', 'The everlasting covenant of peace without price.'],
  ['cv_new', 'ISA', 56, 56, 1, 6, 'Isa. 56:1-6', 'The new covenant\'s mixed inclusiveness and exclusiveness.'],
  ['cv_new', 'ISA', 61, 61, 8, 8, 'Isa. 61:8', 'The everlasting covenant of the people in righteousness.'],
  ['cv_new', 'MRK', 14, 14, 24, 24, 'Mark 14:24', 'The blood of the new covenant, ratified at the cross.'],
  ['cv_new', 'LUK', 22, 22, 20, 20, 'Luke 22:20', 'The new covenant in the Lord\'s Supper, alluding to both Jeremiah and Exodus 24.'],
  ['cv_new', 'ACT', 2, 2, 22, 36, 'Acts 2:22-36', 'Davidic Messiah exalted, and the new covenant announced on Pentecost.'],
  ['cv_new', 'ACT', 13, 13, 39, 39, 'Acts 13:39', 'Forgiveness of sins, obtainable only under the new covenant.'],
  ['cv_new', 'ACT', 15, 15, 1, 29, 'Acts 15:1-29', 'The nations included in the covenant community.'],
  ['cv_new', '2CO', 3, 3, null, null, '2 Cor. 3:1-18', 'The explicit old/new covenant contrast, on glory and durability.'],
  ['cv_new', '2CO', 1, 1, 20, 20, '2 Cor. 1:20', 'Every promise in God\'s covenants is yes in Christ.'],
  ['cv_new', 'GAL', 4, 4, 21, 31, 'Gal. 4:21-31', 'Hagar and Sarah, the essay\'s "figurative" old/new contrast.'],
  ['cv_new', 'EPH', 1, 1, 7, 7, 'Eph. 1:7', 'Forgiveness through the blood of Christ, a new covenant benefit.'],
  ['cv_new', 'COL', 1, 1, 14, 14, 'Col. 1:14', 'The new covenant image and the reconciliation of all things.'],
  ['cv_new', 'JER', 30, 30, null, null, 'repo: the covenant formula the essay names, cf. Jer. 31:33', 'Jeremiah\'s restoration of the nations using the covenant formula, "I will be their God and they will be my people".'],
  ['cv_new', 'ROM', 11, 11, null, null, 'repo: the nations-included theme the essay cites at Rom. 15:8-12', 'Gentiles grafted into Israel, and the remnant kept by grace.'],
  ['cv_new', '1CO', 11, 11, 25, 25, '1 Cor. 11:25', 'Proclaiming the Lord\'s death "until he comes", with the Jeremiah contrast.'],
  ['cv_new', '1JN', 1, 1, 7, 7, '1 John 1:7', 'The blood of Jesus cleanses: forgiveness only under the new covenant.'],
  ['cv_new', 'REV', 1, 1, 5, 5, 'Rev. 1:5', 'The blood of Jesus, the faithful witness.'],
  ['cv_new', 'REV', 7, 7, 14, 14, 'Rev. 7:14', 'Theredeemed by the blood of the Lamb.'],
  ['cv_new', 'REV', 12, 12, 10, 11, 'Rev. 12:10-11', 'Salvation and power in the blood of the Lamb.'],
  ['cv_new', 'REV', 21, 21, 3, 3, 'Rev. 21:3', 'God dwelling with his people, the covenant formula fully experienced.'],
  ['cv_new', 'REV', 22, 22, 16, 16, 'Rev. 22:16', 'He who bears the name of both seed of David and star of morning.'],
  // The essay also cites Rev. 21:3 for the new creation and Luke 22:20 for the Lord's Supper, which
  // is why Isaiah 54:9 above stays Noahic while 54:10 stays new.
  ['cv_new', 'ISA', 54, 54, 10, 10, 'Isa. 54:10', 'The everlasting covenant of peace.'],
];

/** True when a passage falls inside a rule. A verse rule needs verse overlap, not chapter overlap. */
function ruleMatches(rule, p) {
  const [, book, c0, c1, v0, v1] = rule;
  if (p.book !== book) return false;
  if (p.chapter < c0 || p.chapter > c1) return false;
  if (v0 == null) return true;
  const ps = p.verseStart ?? 1;
  const pe = p.verseEnd ?? ps;
  return pe >= v0 && ps <= v1;
}

// Verse rules before chapter rules. Array.prototype.sort is stable, so rules of equal specificity
// keep the table order above, which is how a deliberate override such as Isa. 54:9 wins over 54:10.
const RULES = [...PASSAGE_RULES].sort((a, b) => (b[4] == null ? 0 : 1) - (a[4] == null ? 0 : 1));

const path = join(root, 'data/topics.json');
const doc = JSON.parse(readFileSync(path, 'utf8'));
const known = new Set(JSON.parse(readFileSync(join(root, 'data/covenants.json'), 'utf8')).covenants.map((c) => c.id));

const unplaced = [];
const changed = [];
const repoInferred = new Set();
// How each tag was reached, as a rough confidence signal for review. A "verse" tag rests on one
// cited verse, so a topic spanning a whole chapter can match it without being about it; a "book"
// tag is the weakest, being an editorial judgement about the whole book.
const matchKind = { verse: 0, chapter: 0, book: 0, none: 0 };

for (const topic of doc.topics) {
  let id = null;
  let why = null;
  // Two tiers, because "about a covenant" and "in a book that discusses covenants" are different
  // claims. A passage the essay actually cites settles the first; a book-wide default only settles
  // the second, and a reader filtering to `central` gets the topics that are centrally about one.
  // Derived from how the tag was reached rather than hand-set, so a re-run cannot desync it.
  let tier = null;

  if (topic.type === 'BOOK_OVERVIEW') {
    // An overview cites a passage for every chapter, so a rule would tag it by whichever chapter
    // happens to be listed first. The book default is the honest answer for the book as a whole.
    const dflt = BOOK_DEFAULT[topic.primaryPassages[0]?.book];
    if (dflt?.[0]) { id = dflt[0]; why = dflt[1]; tier = 'contextual'; }
    if (id) matchKind.book++; else matchKind.none++;
  } else {
    // Passages are tried in order and the first one a rule matches settles the topic, so a topic
    // citing Gen 1:26-28 alongside Gen 9:6 is tagged from its opening passage rather than from
    // whichever rule happens to sit higher in the table.
    outer: for (const p of topic.primaryPassages) {
      for (const rule of RULES) {
        if (!ruleMatches(rule, p)) continue;
        id = rule[0];
        why = `${rule[6]}: ${rule[7]}`;
        tier = 'central';
        if (rule[4] == null) matchKind.chapter++; else matchKind.verse++;
        if (rule[6].startsWith('repo:')) repoInferred.add(id);
        break outer;
      }
    }
    if (id == null) {
      const dflt = BOOK_DEFAULT[topic.primaryPassages[0]?.book];
      if (dflt?.[0]) { id = dflt[0]; why = dflt[1]; tier = 'contextual'; matchKind.book++; }
    }
    if (id == null) matchKind.none++;
  }
  if (id && !known.has(id)) throw new Error(`rule produced unknown covenant id ${id}`);
  if (id == null && topic.primaryPassages[0] && !(topic.primaryPassages[0].book in BOOK_DEFAULT)) {
    unplaced.push(`${topic.primaryPassages[0].book} ${topic.id}`);
  }
  if (topic.covenant !== id) changed.push({ from: topic.covenant, to: id, name: topic.name });
  topic.covenant = id;
  topic.covenantTier = tier;
}

const tagged = doc.topics.filter((t) => t.covenant);
const untagged = doc.topics.filter((t) => !t.covenant);

console.log(`framework: ${ESSAY}\n`);
console.log(`topics                 ${doc.topics.length}`);
console.log(`tagged                 ${tagged.length} (${((tagged.length / doc.topics.length) * 100).toFixed(1)}%)`);
console.log(`untagged               ${untagged.length}`);
console.log('');
for (const id of known) {
  const n = doc.topics.filter((t) => t.covenant === id).length;
  console.log(`  ${id.padEnd(14)} ${String(n).padStart(5)}`);
}

const booksTouched = new Set(tagged.map((t) => t.primaryPassages[0]?.book).filter(Boolean));
const booksAll = Object.keys(BOOK_DEFAULT);
const untouched = booksAll.filter((b) => !booksTouched.has(b));
console.log(`\nbooks with a tagged topic   ${booksAll.length - untouched.length}/${booksAll.length}`);
if (untouched.length) console.log(`untouched books              ${untouched.join(' ')}`);
console.log(`covenants leaning on a repo inference  ${[...repoInferred].join(' ') || '(none)'}`);
console.log(`\nhow each tag was reached (review in this order)`);
console.log(`  cited verse range   ${matchKind.verse}`);
console.log(`  cited chapter range ${matchKind.chapter}`);
console.log(`  book-wide default   ${matchKind.book}`);
console.log(`  untagged            ${matchKind.none}`);
const tierCount = { central: 0, contextual: 0 };
for (const t of doc.topics) if (t.covenantTier) tierCount[t.covenantTier]++;
console.log(`\ncovenant tier`);
console.log(`  central (essay cites the passage)   ${tierCount.central}`);
console.log(`  contextual (in a covenant book)     ${tierCount.contextual}`);

if (unplaced.length) console.log(`\ntopics in books with no default (should be empty):\n${unplaced.slice(0, 10).join('\n')}`);

console.log(`\nreassigned             ${changed.length}`);
console.log(`  newly tagged         ${changed.filter((c) => !c.from).length}`);
console.log(`  now untagged         ${changed.filter((c) => !c.to).length}`);
const moved = changed.filter((c) => c.from && c.to);
console.log(`  moved between ids    ${moved.length}`);
for (const c of moved) console.log(`    ${c.from} -> ${c.to}  ${c.name}`);

if (dry) {
  console.log('\n--dry, nothing written');
} else {
  const out = JSON.stringify(doc, null, 1) + '\n';
  writeFileSync(path, out);
  console.log(`\nwrote data/topics.json (${out.length} bytes)`);
}