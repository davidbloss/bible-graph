// Dependency-free validator. Usage: node scripts/validate.mjs [--update-manifest]
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.BT_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = (f) => join(root, 'data', f);
const load = (f) => JSON.parse(readFileSync(dataPath(f), 'utf8'));
const errors = [];
const err = (m) => errors.push(m);

// USFM-style ids for the 66 canonical books (fixed enum).
const BOOKS = new Set(
  ('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN ' +
    'HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH ' +
    '1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV').split(' '),
);
if (BOOKS.size !== 66) err(`internal: expected 66 books, got ${BOOKS.size}`);

const FILES = ['topics.json', 'dependencies.json', 'relations.json', 'covenants.json', 'teachers.json', 'works.json', 'citations.json'];
if (existsSync(dataPath('kjv.json'))) FILES.push('kjv.json');
const topics = load('topics.json');
const deps = load('dependencies.json');
const rels = load('relations.json');
const covenants = load('covenants.json').covenants;
const teachers = load('teachers.json').teachers;
const works = load('works.json').works;
const citations = load('citations.json').citations;

// Verse bounds come from kjv.json only (never hand-typed). Shape: { verses: { "GEN.1.1": "text", ... } }
let bounds = null;
if (existsSync(dataPath('kjv.json'))) {
  bounds = new Map();
  for (const key of Object.keys(load('kjv.json').verses)) {
    const [b, c, v] = key.split('.');
    const k = `${b}.${c}`;
    bounds.set(k, Math.max(bounds.get(k) ?? 0, Number(v)));
  }
}

function checkRef(r, where) {
  if (!BOOKS.has(r.book)) return err(`${where}: unknown book "${r.book}"`);
  if (r.verseEnd < r.verseStart) err(`${where}: verseEnd < verseStart`);
  if (bounds) {
    const max = bounds.get(`${r.book}.${r.chapter}`);
    if (max === undefined) err(`${where}: ${r.book} ${r.chapter} not in KJV data`);
    else if (r.verseEnd > max) err(`${where}: ${r.book} ${r.chapter}:${r.verseEnd} beyond last verse ${max}`);
  }
}
const unique = (items, label) => {
  const seen = new Set();
  for (const i of items) (seen.has(i.id) ? err(`${label}: duplicate id ${i.id}`) : seen.add(i.id));
  return seen;
};
const count = (actual, declared, label) => actual !== declared && err(`${label}: declared ${declared}, actual ${actual}`);

// Covenants
const covenantIds = unique(covenants, 'covenants');
covenants.forEach((c) => c.keyPassages.forEach((r, i) => checkRef(r, `covenant ${c.id} passage[${i}]`)));

// Topics
count(topics.topics.length, topics.topicCount, 'topicCount');
const topicIds = unique(topics.topics, 'topics');
for (const t of topics.topics) {
  if (!t.id.startsWith('bt_')) err(`topic ${t.id}: id must start with bt_`);
  if (!t.description) err(`topic ${t.id}: empty description`);
  if (!['STORY', 'DOCTRINE', 'BOOK_OVERVIEW', 'THEME', 'COVENANT', 'SKILL'].includes(t.type)) err(`topic ${t.id}: invalid type ${t.type}`);
  if (!t.name) err(`topic ${t.id}: empty name`);
  if (!t.evidence?.length) err(`topic ${t.id}: needs at least one evidence item`);
  if (!t.primaryPassages?.length) err(`topic ${t.id}: needs primaryPassages`);
  if (t.assessmentPrompt && !t.assessmentPrompt.includes('{{name}}')) err(`topic ${t.id}: assessmentPrompt must contain {{name}}`);
  if (t.ageRangeStart != null && t.ageRangeEnd != null && t.ageRangeEnd < t.ageRangeStart) err(`topic ${t.id}: age range reversed`);
  if (t.covenant != null && !covenantIds.has(t.covenant)) err(`topic ${t.id}: unknown covenant ${t.covenant}`);
  t.primaryPassages.forEach((r, i) => checkRef(r, `topic ${t.id} passage[${i}]`));
}

// Dependencies + cycle detection (DAG)
count(deps.dependencies.length, deps.edgeCount, 'edgeCount');
const adj = new Map();
for (const d of deps.dependencies) {
  if (!topicIds.has(d.topicId)) err(`dependency: unknown topicId ${d.topicId}`);
  if (!topicIds.has(d.prerequisiteId)) err(`dependency: unknown prerequisiteId ${d.prerequisiteId}`);
  if (d.topicId === d.prerequisiteId) err(`dependency: self-loop ${d.topicId}`);
  if (!['hard', 'soft'].includes(d.strength)) err(`dependency ${d.topicId}->${d.prerequisiteId}: invalid strength`);
  if (!d.reason) err(`dependency ${d.topicId}->${d.prerequisiteId}: missing reason`);
  (adj.get(d.topicId) ?? adj.set(d.topicId, []).get(d.topicId)).push(d.prerequisiteId);
}
const state = new Map(); // 1 = visiting, 2 = done
const visit = (n, path) => {
  if (state.get(n) === 2) return;
  if (state.get(n) === 1) return err(`dependency cycle: ${[...path, n].join(' -> ')}`);
  state.set(n, 1);
  for (const m of adj.get(n) ?? []) visit(m, [...path, n]);
  state.set(n, 2);
};
for (const n of adj.keys()) visit(n, []);

// Relations: every edge must cite scripture
count(rels.relations.length, rels.relationCount, 'relationCount');
rels.relations.forEach((r, i) => {
  if (!topicIds.has(r.from)) err(`relation[${i}]: unknown from ${r.from}`);
  if (!topicIds.has(r.to)) err(`relation[${i}]: unknown to ${r.to}`);
  if (!['fulfilled-in', 'quoted-in', 'parallels', 'part-of-covenant', 'illustrates-doctrine'].includes(r.kind)) err(`relation[${i}]: invalid kind ${r.kind}`);
  if (!r.refs?.length) err(`relation[${i}]: needs at least one scripture ref`);
  r.refs?.forEach((x, j) => checkRef(x, `relation[${i}] ref[${j}]`));
});

// Teachers / works / citations (bibliographic only)
const teacherIds = unique(teachers, 'teachers');
const workIds = unique(works, 'works');
unique(citations, 'citations');
for (const t of teachers) if (!t.sourceUrl) err(`teacher ${t.id}: missing sourceUrl`);
for (const w of works) {
  if (!teacherIds.has(w.teacherId)) err(`work ${w.id}: unknown teacherId ${w.teacherId}`);
  if (!w.sourceUrl) err(`work ${w.id}: missing sourceUrl`);
}
for (const c of citations) {
  if (!workIds.has(c.workId)) err(`citation ${c.id}: unknown workId ${c.workId}`);
  if (!c.url) err(`citation ${c.id}: missing url`);
  if (c.verified && !c.verifiedOn) err(`citation ${c.id}: verified=true requires verifiedOn`);
  c.addresses.forEach((r, i) => checkRef(r, `citation ${c.id} addresses[${i}]`));
  for (const banned of ['quote', 'text', 'summary']) if (banned in c) err(`citation ${c.id}: "${banned}" not allowed (bibliographic only)`);
}

// Corpus files (sermons, confessions, catechisms): front matter must be present and complete
const corpusRequired = {
  'sermons/transcripts': ['teacher', 'title', 'date', 'type', 'scripture', 'source_url', 'rights', 'status'],
  confessions: ['title', 'year', 'edition_or_source', 'source_url', 'rights', 'status'],
  catechisms: ['title', 'year', 'edition_or_source', 'source_url', 'rights', 'status', 'age_range'],
};
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
for (const [dir, keys] of Object.entries(corpusRequired)) {
  const abs = join(root, dir);
  if (!existsSync(abs)) continue;
  for (const f of walk(abs).filter((x) => x.endsWith('.md') && !/README\.md$/.test(x) && !/(^|\/)text\.md$/.test(x))) {
    const m = readFileSync(f, 'utf8').match(/^---\n([\s\S]*?)\n---/);
    const rel = f.slice(root.length + 1);
    if (!m) { err(`${rel}: missing front matter`); continue; }
    for (const k of keys) if (!new RegExp(`^${k}:`, 'm').test(m[1])) err(`${rel}: front matter missing "${k}"`);
    const rights = m[1].match(/^rights:\s*(\S+)/m)?.[1];
    if (rights && !['public-domain', 'licensed', 'in-copyright-link-only'].includes(rights)) err(`${rel}: invalid rights "${rights}"`);
    const refs = m[1].match(/^scripture:\s*\[(.*)\]/m)?.[1];
    for (const x of (refs ?? '').split(',').map((y) => y.trim()).filter(Boolean)) {
      const mm = x.match(/^(\w{3})\.(\d+)\.(\d+)(?:-(\d+))?$/);
      if (!mm) { err(`${rel}: bad scripture ref "${x}"`); continue; }
      checkRef({ book: mm[1], chapter: +mm[2], verseStart: +mm[3], verseEnd: +(mm[4] ?? mm[3]) }, `${rel} scripture`);
    }
  }
}

// Manifest
const sha = (f) => createHash('sha256').update(readFileSync(dataPath(f))).digest('hex');
if (process.argv.includes('--update-manifest')) {
  const manifest = {
    dataset: 'bible-taxonomy',
    counts: { covenants: covenants.length, topics: topics.topics.length, dependencies: deps.dependencies.length, relations: rels.relations.length, teachers: teachers.length, works: works.length, citations: citations.length },
    files: Object.fromEntries(FILES.map((f) => [f, { sha256: sha(f) }])),
  };
  writeFileSync(dataPath('manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('manifest.json updated');
} else if (existsSync(dataPath('manifest.json'))) {
  const m = load('manifest.json');
  for (const [f, info] of Object.entries(m.files)) if (sha(f) !== info.sha256) err(`manifest: checksum mismatch for ${f}`);
} else err('manifest.json missing (run with --update-manifest)');

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`OK: ${topics.topics.length} topics, ${deps.dependencies.length} dependencies, ${rels.relations.length} relations, ${citations.length} citations`);
