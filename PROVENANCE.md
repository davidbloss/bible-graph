# Provenance and licensing

## Rule zero
Nothing is made up. Every scripture reference, work, date and citation must be exact and traceable to a source URL. Unverified items stay flagged `verified: false` (citations) or are not added.

## Scripture
| Source | Status | Policy |
|---|---|---|
| ESV (Crossway) | **Authority; in copyright** | References and derived links only. No ESV text is shipped. Check Crossway's current permissions before adding any quotation. |
| KJV | Text shipped in `data/kjv.json` | Imported by `scripts/import-kjv.mjs` from Project Gutenberg eBook #10 (https://www.gutenberg.org/ebooks/10; file https://www.gutenberg.org/cache/epub/10/pg10.txt, kept in `sources/kjv/pg10.txt`). The SHA-256 of the source file is recorded in `kjv.json`. Result: 66 books, 31,102 verses; Genesis has 1,533 verses and Romans 433, matching the standard KJV totals. Book/testament heading lines in the source are removed by an explicit allowlist and listed in `source.strippedHeadings` for audit. |

**Open item (UK):** in the UK the KJV text is subject to a Crown letters patent administered by Cambridge University Press. Confirm this is acceptable for the intended use before any public release. The Project Gutenberg licence and trademark terms (included in the source file) also apply to redistribution of the Gutenberg file itself.

## Covenant framework
The covenant spine — which covenants exist, in what order, on what passages — is not invented here. It follows:

> Paul R. Williamson, "The Biblical Covenants," The Gospel Coalition, Concise Theology series.
> https://www.thegospelcoalition.org/essay/the-biblical-covenants/ (accessed 2026-10-04)

| Source | Status | Policy |
|---|---|---|
| [TGC, "The Biblical Covenants"](https://www.thegospelcoalition.org/essay/the-biblical-covenants/) (Williamson) | **Definitional basis for `data/covenants.json`** | Licensed **CC BY-SA 4.0**, which permits adaptation provided attribution, an indication of changes, and the same licence. The framework's summary, the Abraham/David parallels, and the covenant descriptions in `data/covenants.json` are adapted from it. `scripts/tag-covenants.mjs` cites a specific essay reference for each assignment it makes. |

`scripts/tag-covenants.mjs` applies this framework. Rules are checked most specific first — a cited verse, then a cited chapter range, then a book-wide default. Rules whose reference is prefixed `repo:` are this project's own inferences rather than the essay's citations, and are flagged in the script's report so a reviewer can tell them apart.

Two places where the framework does not line up cleanly with the six existing `cv_` ids, both recorded in `data/covenants.json` under `framework.caveats`:

- **Creation is not an explicit covenant.** The essay counts only covenants Scripture describes, so its first explicit covenant is Noah's. It calls creation a probationary "covenant of works/creation" belonging to Reformed/Covenant Theology and notes that other scholars are "unpersuaded". `cv_creation` is retained as a theological prior with that caveat attached.
- **The Abrahamic covenant is argued to be two.** Genesis 15:18 ratifies the national promise; Genesis 17:1-14 the international one, ratified by oath at Genesis 22:16-18. Both stay under `cv_abrahamic` so no topic loses its tag, and the split is recorded in `stages` so the legend can be split later without re-tagging.
- **The Davidic covenant is never called one where it is established.** 2 Samuel 7 and 1 Chronicles 17 promise a dynasty without the word; the framing comes from 2 Samuel 23:5, 2 Chronicles 7:18 and 13:5, Psalm 89:3 and Jeremiah 33:21.

Assigning a covenant to a topic is an editorial proposal, not a reviewed judgement. Of the 1,140 assigned topics, 50 rest on a single cited verse, 126 on a cited chapter range, and 964 on a book-wide default; that last group is the review priority, since a chapter-spanning topic can match a cited verse without being about it. Three topics previously tagged in this project are deliberately now untagged, because the essay gives them no place: `EZK.20`, `EZK.34` and `DAN.9`.

## Teachers
Bibliographic only: author, work, year, edition, exact location, URL, passage addressed. No quoted or paraphrased text. Copyright is recorded per work (`public-domain` or `in-copyright`). No entries have been added yet.

## Sermons, confessions, catechisms
Placed by the maintainer in `sermons/`, `confessions/`, `catechisms/`, each with `source_url` and `rights` front matter. Nothing has been added yet. In-copyright material is link-only.

## Editorial content
Topic names, descriptions, evidence, assessment prompts, dependency reasons and covenant descriptions are original working text for this project. They have been checked against the KJV text for the passages cited, but they are drafts for human review. Age ranges are proposals. Licences for structure and authored text (os-taxonomy uses ODbL 1.0 and CC BY-SA 4.0) are not yet chosen; no LICENSE files are included.
