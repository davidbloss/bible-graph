// Identity of a relation edge. Two edges are the same claim only when endpoints, kind and the exact
// set of cited passages all match, so refs are sorted to keep author order irrelevant. Shared by
// validate.mjs, fragment.mjs and build-review.mjs so a decision recorded against an edge in
// REVIEW.md keeps matching that edge as the data changes.
export const relKey = (r) =>
  `${r.from}|${r.to}|${r.kind}|${(r.refs ?? []).map((p) => `${p.book}.${p.chapter}.${p.verseStart}-${p.verseEnd}`).sort().join(',')}`;

export const passageList = (rs) =>
  (rs ?? []).map((p) => `${p.book}.${p.chapter}.${p.verseStart}${p.verseEnd > p.verseStart ? `-${p.verseEnd}` : ''}`).join(', ');

export const topicKey = (id) => `topic:${id}`;
export const depKey = (d) => `dep:${d.topicId}<-${d.prerequisiteId}`;
export const relationKey = (r) => `relation:${relKey(r)}`;