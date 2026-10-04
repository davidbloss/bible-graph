# fragments/ — parallel content authoring

Writers (people or agents) add topics by creating `fragments/<name>.json` rather than editing `data/*.json`. A maintainer merges them. Merged fragments move to `fragments/merged/`.

## Commands
- `node scripts/show.mjs "EXO 3:1-15"` — print the KJV text of a passage. Ground every description in it.
- `node scripts/fragment.mjs check fragments/<name>.json` — validate against a throwaway copy of `data/`; writes nothing to `data/`. Run after every few topics; it must pass.
- `node scripts/fragment.mjs merge fragments/<name>.json` — maintainer only.

## Fragment format
See the header of `scripts/fragment.mjs`. Slugs are ids without `bt_`, prefixed with the lowercase USFM book code (`exo_burning_bush`, `1sa_david_goliath`). Passages are strings such as `"EXO 3:1-15"` or `"GEN 5"`; verse bounds are checked against the KJV.

## Content rules (shared with PROVENANCE.md)
1. Never fabricate. Describe only what the cited KJV text says (read it with `show.mjs`). No invented quotes, dates, names, numbers or cross-references. If unsure a New Testament passage quotes or alludes to an Old Testament one, omit the relation.
2. Descriptions, evidence and prompts are in your own words, concise (1-2 sentences for descriptions). Don't paste verses. ESV is referenced only, never reproduced. Don't quote teachers.
3. Cover the whole book: every chapter appears in at least one topic's passages. Narrative books: one topic per story/episode. Epistles and prophets: one per argument/oracle section. Wisdom books: one per psalm group/theme/section as sensible.
4. Types: `STORY`, `DOCTRINE`, `THEME`, `COVENANT` (only where the text itself speaks of a covenant), `BOOK_OVERVIEW` (one per book, id `<book>_overview`... use the book code, e.g. `book_exo`), `SKILL`.
5. `covenant`: `cv_creation`, `cv_noahic`, `cv_abrahamic`, `cv_mosaic`, `cv_davidic`, `cv_new`, or null. Use only where it clearly fits the passage's place in the covenant story; null is fine.
6. `ages`: editorial proposal `[start, end]` in whole years, 4 to 18.
7. Every topic needs at least one `evidence` item (what a learner can do) and a `prompt` containing `{{name}}`.
8. Dependencies: each topic after the first in a book has at least one prerequisite, with a `reason` that states a fact from the text (e.g. "Exodus 3 follows Moses' flight in chapter 2"). Only reference topics that exist in `data/topics.json` or in your own fragment. Strength `hard` only when the passage cannot be understood without the prerequisite.
9. Relations (`quoted-in`, `fulfilled-in`, `parallels`, `part-of-covenant`, `illustrates-doctrine`) must cite refs on both ends that you have read via `show.mjs`. Both topics must exist in `data/` or your fragment; skip relations to books not yet written.
