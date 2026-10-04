# Provenance and licensing

## Rule zero
Nothing is made up. Every scripture reference, work, date and citation must be exact and traceable to a source URL. Unverified items stay flagged `verified: false` (citations) or are not added.

## Scripture
| Source | Status | Policy |
|---|---|---|
| ESV (Crossway) | **Authority; in copyright** | References and derived links only. No ESV text is shipped. Check Crossway's current permissions before adding any quotation. |
| KJV | Text shipped in `data/kjv.json` | Imported by `scripts/import-kjv.mjs` from Project Gutenberg eBook #10 (https://www.gutenberg.org/ebooks/10; file https://www.gutenberg.org/cache/epub/10/pg10.txt, kept in `sources/kjv/pg10.txt`). The SHA-256 of the source file is recorded in `kjv.json`. Result: 66 books, 31,102 verses; Genesis has 1,533 verses and Romans 433, matching the standard KJV totals. Book/testament heading lines in the source are removed by an explicit allowlist and listed in `source.strippedHeadings` for audit. |

**Open item (UK):** in the UK the KJV text is subject to a Crown letters patent administered by Cambridge University Press. Confirm this is acceptable for the intended use before any public release. The Project Gutenberg licence and trademark terms (included in the source file) also apply to redistribution of the Gutenberg file itself.

## Teachers
Bibliographic only: author, work, year, edition, exact location, URL, passage addressed. No quoted or paraphrased text. Copyright is recorded per work (`public-domain` or `in-copyright`). No entries have been added yet.

## Sermons, confessions, catechisms
Placed by the maintainer in `sermons/`, `confessions/`, `catechisms/`, each with `source_url` and `rights` front matter. Nothing has been added yet. In-copyright material is link-only.

## Editorial content
Topic names, descriptions, evidence, assessment prompts, dependency reasons and covenant descriptions are original working text for this project. They have been checked against the KJV text for the passages cited, but they are drafts for human review. Age ranges are proposals. Licences for structure and authored text (os-taxonomy uses ODbL 1.0 and CC BY-SA 4.0) are not yet chosen; no LICENSE files are included.
