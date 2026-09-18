# Prose volume snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-prose.mjs --write`. The `check-prose` gate rejects a drift.

"Prose answers “why isn’t this obvious?”, and whatever can be pointed at is pointed
at" is a criterion ([`req-project-concise`](requirements/project.md#req-project-concise)),
and a criterion with no number is settled again by whoever happens to be editing. The
numbers are [0017](decisions/0017-one-home-per-fact.md)'s: a gate header gets 12 lines plus
one per numbered point, a task position 12 closed and 20 open. This file is what they came
out at, written down to the line.

A drift does not mean "an error" — it means "a paragraph arrived or left, and that is to be
visible in review". So both layers land here in both directions, in the diff of the change
that moved them: `node tools/check-prose.mjs --write`. There is no tolerance, for the reason
the size record has none — a tolerance is for a measurement that wobbles, and a line count
does not ([0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)).

**Words are the second reading**, and they are here because a line is elastic: a header that
meets its budget by running three sentences onto one line has moved nothing a reader can
feel, and the word column says so. What is measured either way is **volume, not weight** —
whether a paragraph carries anything is review’s judgment, and the limit is written into
the requirement rather than passed over in silence.

Columns: script · numbered points · lines · words. The budget is not a column: it is 12 plus
the points, and a number copied here would be a second home for a number 0017 already holds.

```
at-pass.mjs 2 14 175
changelog-renderer.mjs 3 14 122
check-acr.mjs 8 20 211
check-aria.mjs 9 21 245
check-bench.mjs 6 18 191
check-bridge.mjs 7 19 200
check-browsers.mjs 6 18 168
check-bundle.mjs 13 25 269
check-consumer.mjs 7 19 197
check-coverage.mjs 6 18 182
check-distance.mjs 5 17 190
check-docs.mjs 8 20 213
check-e2e.mjs 4 15 142
check-files.mjs 10 22 233
check-flake.mjs 5 17 200
check-forms.mjs 4 16 139
check-harness.mjs 6 18 168
check-icons.mjs 6 18 167
check-index.mjs 5 17 150
check-language.mjs 7 19 196
check-mutation.mjs 8 20 212
check-parts.mjs 7 19 195
check-prose.mjs 6 18 189
check-reach.mjs 5 17 136
check-since.mjs 3 15 122
check-styles.mjs 10 22 231
check-support.mjs 5 17 150
check-texts.mjs 6 18 172
check-tokens.mjs 11 23 258
check-tools.mjs 4 16 168
check-typecheck.mjs 4 16 134
check-zoneless.mjs 6 18 153
fresh-inputs.mjs 0 0 0
release.mjs 5 17 146
restore-dictionaries.mjs 0 12 128
```

## Task positions

Columns: position · state · lines · words, in the order `docs/plan.md` carries them. A
closed position is the record of finished work and gets 12 lines; an open one is a working
spec, may think out loud, and gets 20.

A position past its budget carries a reason in
[`tools/prose.policy.json`](../tools/prose.policy.json), and the entry holds the exact line
count — an excuse that stretched with the text would absorb the next paragraph unread.

`docs/plan.md` is temporary: it goes when its last gap closes, and this layer goes with it.
That is a rewrite of this file and not a silence — the gate fails on a walk that finds no
position, because a denominator that empties quietly is the defect it exists to catch.

```
1.2 open 5 62
3.1 closed 12 160
3.2 closed 12 143
3.3 closed 10 153
3.4 closed 12 169
3.5 closed 12 134
3.6 closed 12 180
4.58 closed 9 140
4.71 open 19 312
4.74 open 8 131
4.73 closed 12 176
4.72 closed 12 175
```
