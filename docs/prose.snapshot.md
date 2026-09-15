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
at-pass.mjs 5 17 193
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
check-styles.mjs 10 22 231
check-support.mjs 5 17 150
check-texts.mjs 6 18 172
check-tokens.mjs 11 23 258
check-tools.mjs 3 15 150
check-typecheck.mjs 4 16 134
check-zoneless.mjs 6 18 153
fresh-inputs.mjs 0 0 0
release.mjs 5 17 134
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
0.1 closed 3 42
1.1 closed 22 651
1.2 open 5 62
2.1 closed 12 145
2.1.1 closed 12 127
2.1.2 closed 12 132
2.1.3 closed 8 89
2.1.4 closed 12 131
2.1.5 closed 12 126
2.1.6 closed 12 131
2.1.7 closed 11 135
2.1.8 closed 12 154
2.2 open 20 277
2.3 closed 11 119
2.4 closed 12 140
2.5 closed 12 154
2.6 closed 12 141
2.7 closed 6 83
2.7.1 closed 7 92
2.7.2 closed 10 127
2.7.3 closed 12 159
2.7.6 closed 12 145
2.7.7 closed 12 150
2.7.4 closed 10 135
2.7.5 closed 9 113
3.0 closed 12 171
3.1 open 20 268
3.2 open 10 130
3.3 open 9 118
3.4 open 7 97
4.1 closed 3 38
4.2 closed 12 182
4.3 closed 10 141
4.4 closed 12 143
4.5 closed 12 149
4.6 closed 12 168
4.7 closed 12 140
4.8 closed 12 134
4.9 closed 12 154
4.10 closed 12 164
4.11 closed 12 166
4.12 closed 12 151
4.13 closed 12 153
4.14 closed 12 145
4.15 closed 12 158
4.16 closed 12 154
4.17 closed 12 158
4.18 closed 10 142
4.19 closed 12 131
4.20 closed 12 164
4.21 closed 11 145
4.22 closed 11 125
4.23 closed 12 144
4.24 closed 6 77
4.25 closed 10 122
4.26 closed 12 144
4.27 closed 10 119
4.28 closed 10 140
4.29 closed 9 125
4.30 closed 12 174
4.31 closed 12 137
4.32 closed 8 108
4.33 closed 12 140
4.34 closed 23 329
4.35 closed 12 147
4.36 closed 12 135
4.37 closed 12 149
4.38 closed 10 134
4.39 closed 12 137
4.40 closed 12 171
4.41 closed 12 158
4.42 closed 8 108
4.43 closed 12 150
4.44 closed 10 122
4.45 closed 12 141
4.46 closed 8 105
4.47 closed 12 176
4.48 closed 12 174
4.49 closed 9 111
4.50 closed 9 107
4.51 closed 9 115
4.52 closed 9 124
4.53 closed 10 137
4.54 closed 9 120
4.55 closed 11 152
4.56 closed 12 166
4.57 closed 12 171
4.58 open 19 266
4.59 closed 12 163
4.60 closed 12 143
4.61 closed 12 168
4.62 closed 12 166
4.63 closed 12 166
4.64 closed 12 154
4.65 open 15 214
4.66 open 17 230
4.67 open 20 292
4.68 closed 12 156
5.1 closed 12 131
5.2 closed 10 109
5.3 closed 9 75
5.4 closed 12 120
5.5 closed 12 134
```
