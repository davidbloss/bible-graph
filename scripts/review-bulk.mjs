// Applies approved standing rules from data/review-rules.json to data/review.json.
// Usage: node scripts/review-bulk.mjs [--apply]
//
// The point is that a reviewer approves a rule once rather than ticking 1,100 rows. Without --apply
// this only reports, so the effect of a rule can be read before it is written.
//
// Predicates live here rather than in the JSON, so a rule file cannot smuggle in executable logic and
// so the meaning of every rule is in one place. The JSON carries intent, provenance and the audit
// trail. A decision stamped this way names its rule and deliberately carries no "by" field: the
// judgement was made about the rule, once, not about each row.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { depKey, relationKey, topicKey } from './lib/edge-key.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = (f) => join(root, 'data', f);
const load = (f) => JSON.parse(readFileSync(dataPath(f), 'utf8'));

const apply = process.argv.includes('--apply');
const topics = load('topics.json').topics;
const deps = load('dependencies.json').dependencies;
const rels = load('relations.json').relations;
const ruleDoc = load('review-rules.json');

const firstPassage = new Map(topics.map((t) => [t.id, t.primaryPassages?.[0]]));
const firstBook = (id) => firstPassage.get(id)?.book;
const firstChapter = (id) => firstPassage.get(id)?.chapter;
const OT = new Set(
  ('GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN ' +
    'HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL').split(' '),
);
const STOP = new Set(
  ('the and that this with for unto you his her them they from was were are but not all who him she it as be my your our their ' +
    'which there have has had also even into than when where what will would shall should may might can could do does did of in on ' +
    'at to by or if so such these those then thus because although while upon').split(' '),
);
const contentWords = (s) => s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

// Each predicate returns the review keys it covers. Keeping them total and side-effect free means the
// dry run and the applied run cannot disagree.
const PREDICATES = {
  depNarrativeOrder() {
    return deps
      .filter((d) => {
        const a = firstBook(d.topicId);
        const b = firstBook(d.prerequisiteId);
        if (a !== b || a == null) return false;
        const ca = firstChapter(d.topicId);
        const cb = firstChapter(d.prerequisiteId);
        return ca != null && cb != null && cb < ca;
      })
      .map(depKey);
  },
  relQuotedOverlapAtLeast40(kjv) {
    // Retained so the rejected rule stays runnable and auditable, not because it should be used.
    return rels
      .filter((r) => {
        if (r.kind !== 'quoted-in' || !r.refs?.length) return false;
        const ot = r.refs.filter((p) => OT.has(p.book));
        const nt = r.refs.filter((p) => !OT.has(p.book));
        if (!ot.length || !nt.length) return false;
        const text = (ps) => ps.flatMap((p) => Array.from({ length: p.verseEnd - p.verseStart + 1 },
          (_, i) => kjv[`${p.book}.${p.chapter}.${p.verseStart + i}`] ?? '')).join(' ');
        const a = new Set(contentWords(text(ot)));
        if (!a.size) return false;
        const b = new Set(contentWords(text(nt)));
        let hit = 0;
        for (const w of a) if (b.has(w)) hit++;
        return hit / a.size >= 0.4;
      })
      .map(relationKey);
  },
};

const kjv = load('kjv.json').verses;
const ruleDocPath = dataPath('review-rules.json');
const known = new Set([...topics.map((t) => topicKey(t.id)), ...deps.map(depKey), ...rels.map(relationKey)]);
const reviewPath = dataPath('review.json');
const review = existsSync(reviewPath) ? load('review.json') : {};
const decisions = review.decisions ?? {};
const today = new Date().toISOString().slice(0, 10);

const byStatus = { proposed: [], approved: [], rejected: [] };
for (const r of ruleDoc.rules ?? []) (byStatus[r.status] ?? byStatus.proposed).push(r);

console.log(`rules: ${ruleDoc.rules.length} (${byStatus.approved.length} approved, ${byStatus.proposed.length} proposed, ${byStatus.rejected.length} rejected)\n`);
for (const r of ruleDoc.rules ?? []) {
  console.log(`  ${r.status.padEnd(9)} ${r.id}`);
  if (!PREDICATES[r.predicate]) {
    console.log(`    no such predicate "${r.predicate}" in scripts/review-bulk.mjs`);
    continue;
  }
  if (r.status === 'rejected') console.log('    not run: rejected');
}

let stamped = 0;
const writes = {};
for (const rule of byStatus.approved) {
  const pred = PREDICATES[rule.predicate];
  if (!pred) {
    console.error(`\napproved rule ${rule.id} names unknown predicate ${rule.predicate}; refusing to stamp`);
    process.exitCode = 1;
    continue;
  }
  const keys = pred(kjv);
  const unknown = keys.filter((k) => !known.has(k));
  if (unknown.length) {
    console.error(`\napproved rule ${rule.id} matched ${unknown.length} key(s) that resolve to no item; refusing to stamp`);
    unknown.slice(0, 5).forEach((k) => console.error(`    ${k}`));
    process.exitCode = 1;
    continue;
  }
  let newOnes = 0;
  let conflicts = 0;
  for (const key of keys) {
    const existing = decisions[key];
    if (existing && existing.rule !== rule.id) {
      // Never overwrite a human call or a different rule's call. A conflict means the rule set and the
      // recorded decisions disagree, which is a question for the reviewer rather than something to
      // resolve by picking a winner.
      conflicts++;
      continue;
    }
    if (existing) continue;
    writes[key] = { status: 'ok', rule: rule.id, on: today, note: rule.description };
    newOnes++;
  }
  stamped += newOnes;
  console.log(`\n${rule.id}`);
  console.log(`  covers            ${keys.length}`);
  console.log(`  already decided   ${keys.length - newOnes - conflicts}`);
  console.log(`  would stamp       ${newOnes}`);
  if (conflicts) console.log(`  CONFLICTS         ${conflicts} already decided by something else, left alone`);
}

const ruleIds = new Set(ruleDoc.rules.map((r) => r.id));
const orphanRules = Object.entries(decisions).filter(([, d]) => d.rule && !ruleIds.has(d.rule));

console.log(`\ntotal items stamped   ${stamped}`);
console.log(`review.json total      ${Object.keys(decisions).length + stamped} of ${known.size}`);
if (orphanRules.length) {
  console.log(`\nwarning: ${orphanRules.length} decision(s) name a rule that is no longer defined:`);
  orphanRules.slice(0, 5).forEach(([k]) => console.log(`    ${k}`));
}

if (!apply) {
  console.log('\n--dry, nothing written. Re-run with --apply to stamp.');
} else if (stamped) {
  const out = { ...review, decisions: { ...decisions, ...writes } };
  writeFileSync(reviewPath, `${JSON.stringify(out, null, 1)}\n`);
  console.log(`\nwrote data/review.json (${stamped} decisions)`);
} else {
  console.log('\nnothing to write');
}