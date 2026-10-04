# catechisms/ — catechisms, including children's catechism

A place for catechisms (question-and-answer teaching) for children and adults. Which children's catechism(s) to include is the maintainer's choice; add each in its own folder.

## Adding one
- Create `catechisms/<slug>/` with `README.md` (front matter: `title`, `year`, `edition_or_source`, `source_url`, `rights`, `status`, `age_range`) and `text.md` containing the questions and answers exactly as in the source, numbered as the source numbers them.
- Copy from a public source. Never reconstruct from memory.

## For agents
Do not write catechism wording. Use only what is placed here, cite by exact question number, verify scripture proofs against `data/kjv.json`, and respect `rights`. Catechism items are good prerequisites for young learners (use `ageRangeStart`/`ageRangeEnd` on topics).
