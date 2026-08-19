# Negative control of the language gate

Deliberately defective inputs. `tools/check-language.mjs` runs all seven of its points on
each of them and **requires every one to be rejected — and rejected by the rule it
declares**. An input that passes is a fault; an input that fires somewhere other than
where its file says is a fault just the same, because it proves something other than
what it declares.

Every case carries the pair `check` + `rule`, not the point number alone — straight from
[`lesson-50`](../../docs/lessons.md#lesson-50).

The reason it exists is the same as for every other gate
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
Here it guards a promise with no symptom whatsoever: a second language compiles, renders,
passes every test and ships. The rule had no gate for as long as it stood, and it was
broken on **both** sides while it stood — which is
[`req-axis`](../../docs/requirements/00-axis.md) exactly.

## How a case is built

A case is not one more copy of the correct input with a single thing broken. The gate
builds it from two layers:

1. a copy of `_reference.json` — a small repository that **must pass**, plus the one
   package file the artifact limb needs;
2. the changes from the case file (`addFiles`, `replaceFile`, `dropPolish`,
   `addExceptions`, `addVocabulary`, `probe`, …).

That way the case file holds **nothing but its own defect** and the diff shows exactly
the one thing at issue. The reference input is checked separately and first: were it
defective itself, every case would fire because of it rather than because of its own —
that is, this whole control would become what it stands against.

## The four limbs, and why each has a case of its own

Each limb is blind where the next one sees, so a case proving one proves nothing about
the others:

- `diacritics-with-no-dictionary-hit` — prose the dictionary of this fixture does not
  confirm. The first limb alone.
- `screaming-case-constant` — `MOJA_WARTOSC`: no diacritics anywhere, and the name is of
  the shape that survived **two** whole passes before a dictionary was pointed at it
  ([`lesson-60`](../../docs/lessons.md#lesson-60)). It fires like any other identifier,
  because `_` is not a letter and the word simply comes apart.
- `opening-quote` — `U+201E`, which outlives a translation that kept the punctuation.
- `inflected-foreign-stem` — an English stem with a Polish ending glued to it. The one
  case that cannot be looked up in anything: the Polish list holds no such stem and the
  English one no such tail, so the three limbs above are all quiet on it and it rode
  through the gate's own source for as long as the gate had stood
  ([`lesson-77`](../../docs/lessons.md#lesson-77)).

## The denominator has seven cases, not one

A scan can go quiet in more ways than it can be wrong, and every one of them is green:

- `empty-repository-list`, `no-word-in-any-file` — nothing read, nothing found;
- `dictionary-unread`, `dictionary-unfolded` — the second limb confirming nothing, or
  confirming only what the first limb already sees;
- `english-not-subtracted` — the opposite failure, which is just as fatal: the shared
  words fire, and the register fills up with English to keep the gate green;
- `english-unread` — the same list, read the other way round. The fourth limb stands on
  it for its STEMS, and without them it finds nothing and says so quietly, which is the
  failure the other three cannot have.

`probe-without-seams` and `inflection-blind` are the ones that answer for the instrument
rather than the input. The words the first probe has to yield are a constant in the gate
and the case hands it a line with the seams taken out, so what it proves is that the
**split** is what produces them; the second case hands the fourth limb's probe with its
ending taken off, which proves the same about the **ending**.

## What these cases do NOT exercise

Three readings arrive here as data rather than from a real run:

- `polish` — instead of `/usr/share/dict/polish` streamed against the words really found,
- `english` — instead of `american-english` read over those words and over the stems they
  leave when an ending comes off,
- `files` — instead of `git ls-files` and a walk of `dist/libs/components`.

This is the same choice as in `check-parts` and `check-browsers` and for the same reason:
a 61 MB dictionary per case would cost minutes on a gate that runs on every commit. The
price is written down outright — the code that reads the dictionaries and lists the files
is not exercised here once. It is exercised instead by **every** run against the real
repository, where the canaries of point 1 answer for it: `ustawienie` present says the
Polish list was read, `wartosc` present says it was folded, `test` absent says the English
one was subtracted, and `build` present says that same English list was read as stems.
