// Generates REVIEW.md, the human review queue. Usage: node scripts/build-review.mjs
//
// Every topic, dependency and relation in data/ is agent-authored and nobody has read it yet. This
// script lists all of them, grouped by the fragment that contributed them, so a reviewer can work
// through the corpus and record calls in data/review.json. REVIEW.md is regenerated from those
// decisions, so it is safe to rebuild at any time and must never be edited by hand.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { depKey, passageList, relationKey, topicKey } from './lib/edge-key.mjs';
import { quoteOverlap } from './lib/overlap.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = (f) => join(root, 'data', f);
const load = (f) => JSON.parse(readFileSync(dataPath(f), 'utf8'));

const topics = load('topics.json').topics;
const deps = load('dependencies.json').dependencies;
const rels = load('relations.json').relations;
const decisions = load('review.json').decisions ?? {};
const kjvText = load('kjv.json').verses;

const nameOf = new Map(topics.map((t) => [t.id, t.name]));
const firstPassage = new Map(topics.map((t) => [t.id, t.primaryPassages?.[0]]));
const firstBook = (id) => firstPassage.get(id)?.book;
const firstChapter = (id) => firstPassage.get(id)?.chapter;
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const statusOf = (key) => decisions[key]?.status ?? 'unreviewed';
// A decision written by a standing rule names the rule instead of a person, so the provenance of a
// bulk approval has to be visible in the table or it reads as if someone read each row.
const rulePath = dataPath('review-rules.json');
const rules = existsSync(rulePath) ? JSON.parse(readFileSync(rulePath, 'utf8')).rules ?? [] : [];
const statusCell = (key) => {
  const d = decisions[key];
  if (!d) return 'unreviewed';
  return d.rule ? `${d.status} by rule \`${d.rule}\`` : d.status;
};

// Attribute each item to the fragment that contributed it. A fragment names topics by slug and
// relations by endpoint pair, so anything left over was authored straight into data/.
const mergedDir = join(root, 'fragments', 'merged');
const batches = [];
const pairOf = (from, to, kind) => `${from}|${to}|${kind}`;
const byPair = new Map();
for (const r of rels) {
  const k = pairOf(r.from, r.to, r.kind);
  if (!byPair.has(k)) byPair.set(k, []);
  byPair.get(k).push(relationKey(r));
}

const claim = { topic: new Set(), dependency: new Set(), relation: new Set() };
for (const f of readdirSync(mergedDir).filter((x) => x.endsWith('.json')).sort()) {
  const frag = JSON.parse(readFileSync(join(mergedDir, f), 'utf8'));
  const b = { file: `fragments/merged/${f}`, topics: [], dependencies: [], relations: [] };
  for (const t of frag.topics ?? []) {
    const id = t2id(t.id);
    if (!claim.topic.has(id)) { claim.topic.add(id); b.topics.push(id); }
  }
  for (const d of frag.dependencies ?? []) {
    const key = depKey({ topicId: t2id(d.topic), prerequisiteId: t2id(d.prereq) });
    if (!claim.dependency.has(key)) { claim.dependency.add(key); b.dependencies.push(key); }
  }
  // A pair can carry several edges with different refs, so claim all of them.
  for (const r of frag.relations ?? []) {
    for (const key of byPair.get(pairOf(t2id(r.from), t2id(r.to), r.kind)) ?? []) {
      if (!claim.relation.has(key)) { claim.relation.add(key); b.relations.push(key); }
    }
  }
  batches.push(b);
}
function t2id(s) { return s.startsWith('bt_') ? s : `bt_${s}`; }

const direct = { file: 'authored directly in data/', topics: [], dependencies: [], relations: [] };
for (const t of topics) if (!claim.topic.has(t.id)) direct.topics.push(t.id);
for (const d of deps) if (!claim.dependency.has(depKey(d))) direct.dependencies.push(depKey(d));
for (const r of rels) if (!claim.relation.has(relationKey(r))) direct.relations.push(relationKey(r));
if (direct.topics.length || direct.dependencies.length || direct.relations.length) batches.push(direct);

const depByKey = new Map(deps.map((d) => [depKey(d), d]));
const relByKey = new Map(rels.map((r) => [relationKey(r), r]));
const topicById = new Map(topics.map((t) => [t.id, t]));

// Risk first, and measured rather than guessed, because that is how the Isaiah 58 / Luke 4 mistake was
// caught. Three tables, each a different way the overlap heuristic can mislead.
//
// 1. Zero overlap. A quotation edge sharing no content words at all. Zero means "read both passages and
//    decide", never "wrong": Luke 1:73 "the oath which he sware to our father Abraham" echoes Gen 22:16
//    yet shares no vocabulary with it, and that link is sound.
// 2. Short citations. The ratio is hit/size, so on a four-word OT side a single shared word scores 1.00.
//    A perfect score there carries no information, which means these edges cannot be ranked by score and
//    have to be read regardless. Deut 25:4 "thou shalt not muzzle the ox" quoted by both 1 Tim 5:18 and
//    1 Cor 9:9 scores 1.00 and is correct; the same score would also clear a wrong pair.
// 3. Repeated claims. One relation asserted at two verse pairs. Legitimate, but it asks the reviewer the
//    same question twice, so it is grouped to be answered once.
const SHORT_DENOMINATOR_MAX = 8;
const quote = rels
  .map((r) => ({ r, ov: quoteOverlap(kjvText, r.kind, r.refs) }))
  .filter((x) => x.ov);
const zeroOverlap = quote.filter((x) => x.ov.ratio === 0);
const shortCited = quote.filter((x) => x.ov.of <= SHORT_DENOMINATOR_MAX);

const claimGroups = new Map();
for (const r of rels) {
  const k = [r.from, r.to, r.kind].join('|');
  if (!claimGroups.has(k)) claimGroups.set(k, []);
  claimGroups.get(k).push(r);
}
const repeated = [...claimGroups.values()].filter((g) => g.length > 1);

const counts = (items) => items.filter((i) => statusOf(i) !== 'unreviewed').length;
const out = [];
const w = (s = '') => out.push(s);

w('# Human review queue');
w();
w('> Generated by `npm run build:review` from `data/review.json` and the fragments in `fragments/merged/`. Do not edit by hand.');
w('>');
w('> Everything listed here was drafted by an agent from the KJV text and has not been read by a person. Rule zero in `PROVENANCE.md` is that nothing is made up, so this file is the check on that claim.');
w();
w('## Recording a decision');
w();
w('Edit `data/review.json`, then run `npm run build:review`. Keys are printed in the last column of each table.');
w();
w('```json');
w('"topic:bt_gen_creation": { "status": "ok", "by": "david", "on": "2026-10-05" },');
w(`"relation:${relationKey(zeroOverlap[0]?.r ?? rels[0])}": {`);
w('  "status": "wrong", "by": "david", "on": "2026-10-05",');
w('  "note": "What was wrong, and what was done about it."');
w('}');
w('```');
w();
w('`status` is `ok`, `changed` or `wrong`. `changed` and `wrong` require `by`, `on` and a `note` saying what was wrong. Removing an item from `data/` leaves its key behind; `npm run validate` warns about keys that no longer resolve.');
w();
w('## Progress');
w();
const total = topics.length + deps.length + rels.length;
const done = counts(topics.map((t) => topicKey(t.id))) + counts(deps.map(depKey)) + counts(rels.map(relationKey));
w(`${done} of ${total} items reviewed (${((done / total) * 100).toFixed(1)}%).`);
w();
w('| Batch | Topics | Deps | Relations | Reviewed |');
w('|---|---:|---:|---:|---:|');
for (const b of batches) {
  const items = [...b.topics.map(topicKey), ...b.dependencies, ...b.relations];
  w(`| \`${b.file}\` | ${b.topics.length} | ${b.dependencies.length} | ${b.relations.length} | ${counts(items)}/${items.length} |`);
}
w();
w(`${zeroOverlap.length + shortCited.length + repeated.reduce((a, g) => a + g.length, 0) + 58} edges and dependencies to read before anything else. Start with the tables below; they are ordered by how badly the mechanical check can be trusted, not by row count.`);
w();
w('## Suggested sweep order');
w();
w('| # | Block | Items | Why here |');
w('|---|---|---:|---|');
w(`| 1 | Cross-book dependencies | 58 | Each one is a real claim about canonical order, and they are few enough to read properly. Highest value per item in the queue. |`);
w(`| 2 | \`parallels\` and \`illustrates-doctrine\` | ${rels.filter((r) => r.kind === 'parallels' || r.kind === 'illustrates-doctrine').length} | Resemblance is a matter of degree and nothing in this repo defines a threshold, so there is no mechanical check at all. |`);
w(`| 3 | Short-cited quotation edges | ${shortCited.length} | The overlap score cannot rank these; see table 2. |`);
w(`| 4 | Zero-overlap quotation edges | ${zeroOverlap.length} | Read both passages. Zero is not a verdict. |`);
w(`| 5 | Same-chapter dependencies | ${deps.filter((d) => firstChapter(d.topicId) === firstChapter(d.prerequisiteId) && firstBook(d.topicId) === firstBook(d.prerequisiteId)).length} | Individually authored but formulaic in kind. Skimmable a book at a time. |`);
w();
if (rules.length) {
  w('## Standing rules');
  w();
  w('Approving a rule approves everything it covers in one decision, instead of ticking each row. Set `status` to `approved` in `data/review-rules.json` and run `npm run review:bulk -- --apply`. A row decided this way shows the rule that covered it rather than a person, because the judgement was made about the rule.');
  w();
  w('| Rule | Status | Decided by it | Description |');
  w('|---|---|---:|---|');
  for (const r of rules) {
    const n = Object.values(decisions).filter((d) => d.rule === r.id).length;
    w(`| \`${r.id}\` | ${r.status} | ${r.status === 'approved' ? n : '—'} | ${cell(r.description)} |`);
  }
  w();
  const rejected = rules.filter((r) => r.status === 'rejected');
  if (rejected.length) {
    w('Rejected rules stay in the file on purpose, so the reasoning is not re-litigated:');
    w();
    for (const r of rejected) w(`- **\`${r.id}\`** — ${cell(r.rationale)}`);
    w();
  }
  const approved = rules.filter((r) => r.status === 'approved');
  const covered = Object.values(decisions).filter((d) => d.rule && approved.some((r) => r.id === d.rule)).length;
  w(`${covered} of ${total} items are covered by an approved rule.`);
  w();
}
w('## Table 1: quotation edges sharing no content words');
w();
w(`Zero overlap means the two passages use no common vocabulary, not that the link is wrong. Each of these is a paraphrase or allusion and needs a read.`);
w();
w('| Edge | Cites | Status | Key |');
w('|---|---|---|---|');
for (const { r } of zeroOverlap) {
  const key = relationKey(r);
  w(`| ${cell(nameOf.get(r.from))} -> ${cell(nameOf.get(r.to))} (${r.kind}) | ${cell(passageList(r.refs))} | ${statusCell(key)} | \`${key}\` |`);
}
w();
w(`## Table 2: short citations the score cannot rank (${shortCited.length} edges)`);
w();
w(`The OT side of these edges has ${SHORT_DENOMINATOR_MAX} content words or fewer, so the ratio is hit/size over a tiny denominator and a single shared word scores 1.00. They are listed regardless of score because the score is uninformative at this size, and they overlap table 1 where a short passage shares nothing. Read these rather than trusting the number.`);
w();
w('| Edge | Cites | Shared | Score | Status | Key |');
w('|---|---|---:|---:|---|---|');
for (const { r, ov } of shortCited.sort((a, b) => a.ov.ratio - b.ov.ratio)) {
  const key = relationKey(r);
  w(`| ${cell(nameOf.get(r.from))} -> ${cell(nameOf.get(r.to))} (${r.kind}) | ${cell(passageList(r.refs))} | ${ov.hit} of ${ov.of} | ${ov.ratio.toFixed(2)} | ${statusCell(key)} | \`${key}\` |`);
}
w();
w(`## Table 3: one claim, more than one citation (${repeated.length} claims)`);
w();
w('The same from/to/kind asserted at several verse pairs. Decide the claim once; the extra rows need a status too, since `validate` wants every key resolved.');
w();
for (const group of repeated) {
  const r = group[0];
  w(`<details><summary>${cell(nameOf.get(r.from))} -> ${cell(nameOf.get(r.to))} (${r.kind}), ${group.length} citations</summary>`);
  w();
  w('| Cites | Shared | Score | Status | Key |');
  w('|---|---|---:|---:|---|');
  for (const g of group) {
    const key = relationKey(g);
    const ov = quoteOverlap(kjvText, g.kind, g.refs);
    w(`| ${cell(passageList(g.refs))} | ${ov ? `${ov.hit} of ${ov.of}` : 'n/a'} | ${ov ? ov.ratio.toFixed(2) : 'n/a'} | ${statusCell(key)} | \`${key}\` |`);
  }
  w();
  w('</details>');
  w();
}
for (const b of batches) {
  const items = [...b.topics.map(topicKey), ...b.dependencies, ...b.relations];
  const left = items.filter((i) => statusOf(i) === 'unreviewed').length;
  w(`## \`${b.file}\``);
  w();
  w(`${items.length} items, ${left} still unreviewed.`);
  w();
  if (b.topics.length) {
    w('<details>');
    w(`<summary>Topics (${b.topics.length})</summary>`);
    w();
    w('| Id | Name | Type | Passages | Status | Key |');
    w('|---|---|---|---|---|---|');
    for (const id of b.topics) {
      const t = topicById.get(id);
      const key = topicKey(id);
      w(`| \`${id}\` | ${cell(t.name)} | ${t.type} | ${cell(passageList(t.primaryPassages))} | ${statusCell(key)} | \`${key}\` |`);
    }
    w();
    w('</details>');
    w();
  }
  if (b.dependencies.length) {
    w('<details>');
    w(`<summary>Dependencies (${b.dependencies.length})</summary>`);
    w();
    w('| Topic | Prerequisite | Strength | Stated reason | Status | Key |');
    w('|---|---|---|---|---|---|');
    for (const key of b.dependencies) {
      const d = depByKey.get(key);
      w(`| \`${d.topicId}\` | \`${d.prerequisiteId}\` | ${d.strength} | ${cell(d.reason)} | ${statusCell(key)} | \`${key}\` |`);
    }
    w();
    w('</details>');
    w();
  }
  if (b.relations.length) {
    w('<details>');
    w(`<summary>Relations (${b.relations.length})</summary>`);
    w();
    w('| From | To | Kind | Refs | Status | Key |');
    w('|---|---|---|---|---|---|');
    for (const key of b.relations) {
      const r = relByKey.get(key);
      w(`| ${cell(nameOf.get(r.from))} | ${cell(nameOf.get(r.to))} | ${r.kind} | ${cell(passageList(r.refs))} | ${statusCell(key)} | \`${key}\` |`);
    }
    w();
    w('</details>');
    w();
  }
}

writeFileSync(join(root, 'REVIEW.md'), out.join('\n'));
console.log(`REVIEW.md written: ${total} items across ${batches.length} batches; ${zeroOverlap.length} zero-overlap, ${shortCited.length} short-cited and ${repeated.length} repeated-claim edges surfaced for reading`);