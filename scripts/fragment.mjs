// Fragment workflow so several writers can add content in parallel without editing the shared data files.
//   node scripts/fragment.mjs check fragments/<name>.json   validate against a throwaway copy of data/ (no writes to data/)
//   node scripts/fragment.mjs merge fragments/<name>.json   merge into data/, refresh manifest, validate (maintainer only)
//
// Fragment shape (slugs are ids WITHOUT the "bt_" prefix; passages are strings, expanded against data/kjv.json):
// { "topics": [{ "id": "exo_burning_bush", "type": "STORY", "name": "...", "description": "...", "covenant": "cv_mosaic"|null,
//                "ages": [8, 14], "passages": ["EXO 3:1-15"], "evidence": ["..."], "prompt": "Can {{name}} ...?" }],
//   "dependencies": [{ "topic": "slug", "prereq": "slug", "strength": "hard"|"soft", "reason": "..." }],
//   "relations": [{ "from": "slug", "to": "slug", "kind": "quoted-in", "refs": ["EXO 3:6", "MAT 22:32"] }] }
// Passage strings: "GEN 3:1-7" | "GEN 3:15" | "GEN 3" (whole chapter) | "GEN 1..50" (whole chapters).
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { relKey } from './lib/edge-key.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [mode, file] = process.argv.slice(2);
if (!['check', 'merge'].includes(mode) || !file) { console.error('usage: fragment.mjs check|merge <fragment.json>'); process.exit(2); }

const target = mode === 'check' ? mkdtempSync(join(tmpdir(), 'bt-')) : root;
if (mode === 'check') cpSync(join(root, 'data'), join(target, 'data'), { recursive: true });
const rd = (f) => JSON.parse(readFileSync(join(target, 'data', f), 'utf8'));
const wr = (f, o) => writeFileSync(join(target, 'data', f), JSON.stringify(o, null, 1) + '\n');

const kjv = rd('kjv.json').verses;
const last = (b, c) => { let n = 0; while (kjv[`${b}.${c}.${n + 1}`]) n++; if (!n) throw new Error(`no such chapter: ${b} ${c}`); return n; };
function ref(s) {
  const m = s.match(/^(\w{3}) (\d+)(?:\.\.(\d+)|(?::(\d+)(?:-(\d+))?))?$/);
  if (!m) throw new Error(`bad passage string "${s}"`);
  const [, b, c1, c2, v1, v2] = m;
  if (c2) return Array.from({ length: c2 - c1 + 1 }, (_, i) => ({ book: b, chapter: +c1 + i, verseStart: 1, verseEnd: last(b, +c1 + i) }));
  if (v1) return [{ book: b, chapter: +c1, verseStart: +v1, verseEnd: +(v2 ?? v1) }];
  return [{ book: b, chapter: +c1, verseStart: 1, verseEnd: last(b, +c1) }];
}
const refs = (a) => a.flatMap(ref);
const id = (s) => (s.startsWith('bt_') ? s : `bt_${s}`);

const frag = JSON.parse(readFileSync(resolve(file), 'utf8'));
const topics = rd('topics.json'), deps = rd('dependencies.json'), rels = rd('relations.json');
const known = new Set(topics.topics.map((t) => t.id));
const problems = [];
for (const t of frag.topics ?? []) {
  for (const k of ['id', 'type', 'name', 'description', 'ages', 'passages', 'evidence', 'prompt']) if (t[k] == null) problems.push(`topic ${t.id}: missing "${k}"`);
  if (known.has(id(t.id))) problems.push(`topic ${id(t.id)} already exists`);
  if (problems.length) continue;
  try {
    topics.topics.push({ id: id(t.id), type: t.type, name: t.name, description: t.description, covenant: t.covenant ?? null, ageRangeStart: t.ages[0], ageRangeEnd: t.ages[1], primaryPassages: refs(t.passages), evidence: t.evidence, assessmentPrompt: t.prompt });
    known.add(id(t.id));
  } catch (e) { problems.push(`topic ${t.id}: ${e.message}`); }
}
for (const d of frag.dependencies ?? []) deps.dependencies.push({ topicId: id(d.topic), prerequisiteId: id(d.prereq), strength: d.strength, reason: d.reason });
const knownRels = new Set(rels.relations.map(relKey));
let addedRels = 0;
let skippedRels = 0;
for (const r of frag.relations ?? []) {
  try {
    const edge = { from: id(r.from), to: id(r.to), kind: r.kind, refs: refs(r.refs ?? []) };
    if (knownRels.has(relKey(edge))) { skippedRels++; continue; }
    knownRels.add(relKey(edge));
    rels.relations.push(edge);
    addedRels++;
  } catch (e) { problems.push(`relation ${r.from}->${r.to}: ${e.message}`); }
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

topics.topicCount = topics.topics.length;
deps.edgeCount = deps.dependencies.length;
rels.relationCount = rels.relations.length;
wr('topics.json', topics); wr('dependencies.json', deps); wr('relations.json', rels);

const run = (args) => spawnSync('node', [join(root, 'scripts/validate.mjs'), ...args], { env: { ...process.env, BT_ROOT: target }, encoding: 'utf8' });
run(['--update-manifest']);
const v = run([]);
process.stdout.write(v.stdout); process.stderr.write(v.stderr);
if (v.status !== 0) { console.error(mode === 'check' ? 'FRAGMENT INVALID: fix and re-run check' : 'MERGE PRODUCED INVALID DATA'); process.exit(1); }
console.log(mode === 'check'
  ? `fragment OK: +${frag.topics?.length ?? 0} topics, +${frag.dependencies?.length ?? 0} deps, +${addedRels} relations${skippedRels ? `, ${skippedRels} already present and skipped` : ''}`
  : `merged: +${frag.topics?.length ?? 0} topics, +${frag.dependencies?.length ?? 0} deps, +${addedRels} relations${skippedRels ? `, ${skippedRels} already present and skipped` : ''}`);
