# confessions/ — confessions of faith

A place for confessions such as the Second London Baptist Confession (1689). They are secondary standards that summarise doctrine; Scripture remains the final authority, and every confession claim is tied to its own cited proof texts.

## Adding one
- Create `confessions/<slug>/` (e.g. `confessions/second-london-baptist-1689/`) containing:
  - `README.md` with front matter: `title`, `year`, `edition_or_source`, `source_url`, `rights`, `status`.
  - `text.md` — the text exactly as in the source, with chapter/paragraph numbers preserved. Copy it from a public source; never reconstruct it from memory.
- Cite by exact chapter and paragraph (e.g. "chapter 1, paragraph 1") as numbered in the source you used. Record that source.

## For agents
Do not write confession text yourself. Only use text a human has placed here, quote paragraph numbers exactly, and verify every proof-text reference against `data/kjv.json`. Link doctrine topics to confession paragraphs only where the source text supports it.
