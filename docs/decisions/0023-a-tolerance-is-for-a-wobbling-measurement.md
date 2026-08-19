# 0023 — A tolerance is for a measurement that wobbles

**Status:** accepted
**Implements:** [`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking)
**Evidence:** [`lesson-78`](../lessons.md#lesson-78) — the drift measured on an unchanged
tree, and the same bytes measured three times over

## Context

`libs/components/size.snapshot.md` records what an application carries per entrypoint. Point 9
of `tools/check-bundle.mjs` held every entrypoint to that number ±5%, or ±256 B where that was
larger, in both directions — and `--write` rewrote the file only when a row left the band.

Two things follow from that pair, and only the first was ever argued.

The band is also the **resolution of the record**. A change inside it is never written down, so
the file ages: measured on an unchanged tree, `./checkbox`, `./radio` and `./select` each stood
76 B above the truth — the price of [C13](../plan.md#c-open-findings), which took a second
message line out of exactly those three. The file was last written at C11 and C13 is the only
commit to have touched a component since, so the attribution is by elimination rather than by
guess. Nothing in the repository said that those three components had got smaller.

The band is also **who pays for it**. The first change to leave it rewrites every row at once,
so its diff carries everybody's accumulated drift. That already happened: C10's commit rewrote
six rows, of which one was C10's 1234 B on `./radio`.

And the width is not small where it matters. ±5% of `./field` is 1115 B — a component can grow
by a kilobyte, in steps, with nothing anywhere to show for it.

The reason to hold a record loosely is a measurement that wobbles. This one does not, and that
was measured rather than assumed: the same artifact and the same toolchain give byte-identical
sizes across repeated runs, with ~100 characters added to the probe workspace's path, and with
the same added to the artifact's path — the two lengths that differ between a developer's
machine and CI. Every byte that moved, moved because the code did.

## Decision

**The size record is exact: any difference, in either direction, fails point 9 and is written
into the file by `--write`.** There is no tolerance on the record, and the two-sided reading it
was introduced with survives intact — a drop fails exactly as a growth does.

The rule generalises past this file: **a tolerance belongs to a measurement that wobbles, not to
a record somebody would rather not rewrite.** `mutation.snapshot.md` next door keeps its ±2
points and should: a mutant killed by the clock depends on what else the machine was doing, so
the number moves without the code moving. `parts.snapshot.md` and `tokens.snapshot.md` have
never had one, for the same reason this one no longer does.

One tolerance stays in the gate, under its own name (`PAIR_SLACK`, point 10): the differential
control compares a two-entrypoint bundle against `a + b − shared`, and that arithmetic leaves a
remainder nothing measures — the entry file's glue. It is a threshold on the difference of two
measurements, not on a record.

## Consequences

- The diff of `size.snapshot.md` is attributable: the rows that move in a commit are the rows
  that commit moved. The plan already quotes those numbers as prices ("1234 B on `./radio`"),
  and they are now the price of one change rather than of a season.
- A change to a component makes the gate red until the number is written down. That is one
  command, and it puts the cost of the change in the diff beside the change — where review can
  argue with it, which is the only place a size ever gets argued with here.
- A toolchain bump — esbuild, `@angular/compiler-cli`'s linker — rewrites every row, and that
  is information the band used to swallow: somebody else's release changed what this library
  costs a consumer.
- Point 9's message carries the delta in bytes and in percent, so the size of a jump is still
  read at a glance. What went is the threshold, not the arithmetic.

## What this costs us

**Every commit that changes a byte of the library now carries a second file.** The gate is the
one that says so, at the cost of one `--write` and a re-run — roughly 25 s locally. A repository
where the snapshot is rewritten in nearly every commit also risks the diff being skimmed rather
than read; against that stands the fact that until today it was rewritten in _no_ commit that
was not already about something else.

**A byte that differs between machines would now be red on CI and green locally.** Three
measurements say the number is path-independent and repeatable, but they were all taken on one
machine and one Node version. If that ever fires, the fix is not to widen the band back —
it is to find what leaked into the bundle, because a size that depends on where it was measured
is not a size.

## Alternatives considered

- **Keep the band, and make `--write` touch only the row that breached** (the finding's
  "budget" reading). It fixes the false diff and keeps CI quiet, and it was rejected because it
  makes the file a set of baselines of different ages while its own prose claims each row is the
  size of a production bundle — the shape [`lesson-64`](../lessons.md#lesson-64) already named
  once. It also keeps the resolution: C13's −228 B would still be recorded nowhere.
- **Keep the band and re-derive the whole file on every run**, failing only on a breach. The
  record then never ages, and the diff never attributes — every commit rewrites every row it
  touched _and_ the ones it did not, which is the very confusion this decision is about.
- **Two thresholds: write on any drift, fail loudly only past ±5%.** The closest alternative to
  what was chosen, and the one that dissolves on inspection — a gate has one severity. Both
  cases end in a red run and a `--write`, so the band would decide nothing but the wording of a
  message, and the wording is now carried by the delta the message prints.
