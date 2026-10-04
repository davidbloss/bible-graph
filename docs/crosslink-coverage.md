# Cross-link coverage and the case for the edges we did not add

## Where we are

`npm run validate` reports 601 relations over 1,772 topics. Every relation cites passages that were read with `node scripts/show.mjs` before the edge was written.

All 66 `BOOK_OVERVIEW` topics started with zero relations. 46 of them now carry book-level edges, derived by rolling up the strongest already-verified per-topic relations:

```
GEN 19   MAT 18   ISA 15   PSA 15   ROM 15   HEB 14   EXO 11
ACT 10   DEU 10   1CO 9    LUK 9    MRK 9   ...
```

The rollup keeps each relation's direction, so `quoted-in` still reads OT to NT. Refs are one verse per side, and a pair that is claimed by both books collapses to a single edge.

Twenty book overviews still have no book-level edge:

```
RUT 2JN 3JN 1TH 2TH 2TI TIT PHM OBA NAM ZEP HAG 1CH 2CH EZR NEH EST ECC SNG LAM
```

None of those twenty books is cited by name anywhere in the KJV New Testament. That is checkable rather than a judgement call, and it means an edge of the form "this book is quoted elsewhere" does not exist for them. A whole-KJV n-gram sweep was run to confirm; it surfaced only shared English register.

Decision taken: leave all twenty at zero rather than pad the graph. The alternatives were intra-Old-Testament links, such as NAM to JON or ZEP to JOL, and links into each book's own topics. Both would give every overview degree, but the first is thematic rather than textual and the second is close to tautological. A book that the New Testament never cites having no outgoing quotation edge is the true state of the material, and it is recorded here instead of being papered over.

These are relational gaps, not coverage gaps. Every verse of all twenty books already sits inside some topic, verified verse by verse: RUT 85, 2JN 13, 3JN 14, 1TH 89, 2TH 47, 2TI 83, TIT 46, PHM 25, OBA 21, NAM 47, ZEP 53, HAG 38, 1CH 942, 2CH 822, EZR 280, NEH 406, EST 167, ECC 222, SNG 117, LAM 154, none uncovered.

One of those twenty was checked further and has nothing to link to. NAM is three chapters and its three topics cover all of it (1:1-15, 2:1-13, 3:1-19), so there is no missing topic. The obvious candidate, Jonah's complaint, has no verbatim Old Testament antecedent in the KJV: Jonah 4:2 reads "I knew that thou art a gracious God, and merciful, slow to anger, and of great kindness, and repentest thee of the evil", while the nearest match, Joel 2:13, reads "he is gracious and merciful, slow to anger, and great in compassion, and repenteth of the evil". Different verbs, and Joel is not a quotation source here. The gourd and the worm are unique to Jonah 4. Nothing is linked.

Two checks that changed the plan:

- **Matthew 27:46 and Mark 15:34** render the cry from the cross as "Eli, Eli, lama sabachthani ... my God, my God, why hast thou forsaken me", which invites a link to Lamentations. In the KJV that sentence is Psalm 22:1. `bt_psa_22 -> bt_mat_death_of_jesus` and the Mark equivalent already exist. No Lamentations edge was added.
- **1 Timothy 5:18** "Thou shalt not muzzle the ox that treadeth out the corn" is a verbatim lift of Deuteronomy 25:4, and that edge was missing. 1 Corinthians 9:9 was already linked to the same verse.

## The systematic negative finding

Eleven NT books had no relations at all: COL, PHP, 1TH, 2TH, 1TI, 2TI, TIT, PHM, 1JN, 2JN, 3JN.

Rather than eyeball them, every verse of those eleven books was matched against every OT verse on shared content-word n-grams. No quotation surfaced. The highest-scoring matches are shared English register, not shared text:

```
COL   your_hearts (x3)   DEU.33.16 things_earth (x2)
PHP   stand_fast (x2)    NUM.1.51 nigh_death (x2)
1TH   give_thanks (x2)
2TH   your_hearts (x2)
1TI   thou_shalt (x3)
2TI   thou_hast (x6)
TIT   every_good (x2)
PHM   beseech_thee (x2)
1JN   little_children (x9)  hereby_know (x7)
2JN   children_whom (x1)
3JN   thou_doest (x2)
```

"Thou shalt", "thou hast", "little children" and "beseech thee" match almost any two English verses from the KJV's register. A relation built on those is a relation built on the King James style guide, not on the text.

COL and PHP did yield two edges, both read and confirmed by hand:

- `gen_creation -> col_supremacy_christ` (parallels, GEN 1:1 / COL 1:15-17). COL 1:16 spans "all things created, that are in heaven, and that are in earth, visible and invisible", which reaches for the Genesis 1 scope of creation. It is an allusion, not a quotation.
- `isa_cyrus -> php_mind_of_christ` (quoted-in, ISA 45:23 / PHP 2:10-11). Both read "every knee shall bow, every tongue...". Near-verbatim.

The other nine stay unlinked. These books are paraenesis and early Christian correspondences with no sustained engagement with the Hebrew scriptures, and no genuine quotation exists to cite. That is a fact about the material, not a gap in the work.

## Edges deliberately not added

- `isa_40:31 -> php:3:13-14`. Isaiah's "they shall run, and not be weary" is a real race image, but Philippians 3:14 says "I press toward the mark for the prize" and never uses "run". The word overlap is too thin to cite.
- `isa:11:3 -> col:2:3`. Both pair wisdom with knowledge or understanding, but the distinctive phrase in Colossians is "all the treasures of wisdom", which Isaiah does not have.
- `isa:53:10 -> 2co:5:18`. 2 Corinthians 5:18 says God "hath reconciled us to himself". Isaiah 53:10 does not contain "reconciler" in the KJV; that word arrives in other translations. The link may be sound, but not on KJV evidence. ISA 53:6 was used for 2CO 5:21 instead, where "the LORD hath laid on him the iniquity of us all" matches "he hath made him to be sin for us".

## Thin-overlap warnings, and why they stay

`validate.mjs` warns below 10% shared content words and fails at zero, both advisory only. Two edges sit at zero: `bt_gen_abraham_isaac -> bt_luk_john_born` and `bt_isa_suffering_servant -> bt_mat_peters_mother_in_law`. Both were read and both are paraphrase rather than quotation, which is what the warning is for.

Eleven more sit under 10%. Two of those, `bt_book_jer -> bt_book_2co` and `bt_book_isa -> bt_book_rev`, are book-level rollups that inherited their refs from an underlying relation already on the list. A rollup cannot have a better overlap than the edge it summarises, so those two are expected rather than new evidence against anything. The rest include Jeremiah 31 into 2 Corinthians 3:6, where the KJV says "covenant" and Paul says "testament".

If these warnings ever become noise, the fix is to silence them, not to delete verified edges.