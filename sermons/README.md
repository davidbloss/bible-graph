# sermons/ — transcripts for later synthesis

## Why this exists (motivation)
The Bible (ESV, with KJV text in `data/kjv.json`) is the ultimate authority in this project. Sermons and lectures by teachers such as Calvin, Luther, Spurgeon, Sproul and Baucham help explain *why* a passage matters and how it fits covenant history. Transcripts are collected here as **raw source material**, then synthesized into the curriculum (topics, relations, citations) in a controlled, traceable way. Every claim that reaches the curriculum must be traceable back to a specific transcript, location and passage.

## For humans: how to add a transcript
1. Create `sermons/transcripts/<teacher-slug>/<year>-<short-title>.md` (e.g. `sermons/transcripts/spurgeon/1855-example.md` — the slug is yours to choose, lowercase, hyphenated).
2. Start the file with the front matter below, then paste the transcript text underneath, unedited.
3. Fill in only what you know. Write `unknown` rather than guessing. Do not invent dates, titles or references.
4. Check the `rights` field. Only paste full text you are allowed to store. For in-copyright material, paste nothing and give `url` plus notes only (`rights: in-copyright-link-only`).

```markdown
---
teacher: <name as on the source>
title: <exact title from the source>
date: <YYYY-MM-DD, YYYY, or unknown>
type: sermon            # sermon | lecture | commentary-section | other
scripture: [ROM.5.1-11] # exact refs, BOOK.chapter.verse[-verse] using the 66 USFM codes; [] if unknown
source_url: <where this text came from>
rights: public-domain   # public-domain | licensed | in-copyright-link-only
status: raw             # raw | reviewed | synthesized
---
(transcript text)
```

## For agents: how to use this directory
- **Read-only on transcripts.** Never edit transcript text. Only `status` may change (`raw` → `reviewed` → `synthesized`).
- **Never fabricate.** Do not invent quotations, page numbers, dates or scripture references. If a reference is not stated in the transcript or its source, leave it out or mark it `unknown`.
- **Scripture comes from the data.** Verify every ref against `data/kjv.json` (the validator does this). Cite ESV by reference/link only; do not reproduce ESV text.
- **Synthesis workflow:**
  1. Read a `status: reviewed` transcript.
  2. Propose draft topic/relation changes in `data/` that name the passages involved. Describe ideas in your own words; no long verbatim quotes.
  3. Add a `citations.json` entry (`workId`, exact `location`, passages addressed, `url`) with `verified: false`. A human flips it to `true` after checking.
  4. Run `npm run validate`, then set the transcript to `status: synthesized`.
- **Rights:** never copy text from `in-copyright-link-only` sources into data files.
