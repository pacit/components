# 0088 — A row is measured by its own run, and the whole is measured at night

**Status:** accepted
**Implements:** [`req-quality-unit`](../requirements/quality.md#req-quality-unit),
[`req-quality-e2e`](../requirements/quality.md#req-quality-e2e)
**Evidence:** the `task_history` of the main checkout on the desk (the worktrees' own hold no
rows), read over the fourteen days 2026-09-20 to 2026-10-03 — 121 runs of the two Playwright suites and the mutation run, 52.4 hours, 14.9
of them in runs stopped or red; CI run 37537775744 of 2026-10-06 (gates 3.5 minutes, six
shards 9 to 23); the `mutation` job of the four nightly runs of 2026-10-04 to 07, 68 to 72
minutes each; one file measured twice, by a narrow run and by the full one, to the same four
numbers; and the kernel's log of 2026-10-06 10:56: the OOM killer taking a 2.6 GB process out of
the editor's scope, which systemd then tore down, 14 GB at its peak ([`lesson-251`](../lessons.md#lesson-251))

## Context

The rule of 2026-09-19 was that nothing is pushed before the desk has run what CI runs,
browsers included — and the desk did: `sandbox-e2e:e2e` 57 times at a median of 29 minutes,
`docs-e2e:e2e` 47 times at 17, the mutation run 17 times at 78. Nearly four hours of every
day, on an eight-core laptop that is also where the work happens, beside the other sessions
that happen there too. Twenty-one of the sandbox runs were stopped before they ended, a round
of review having moved the commit under them; thirteen ended red, and the ones looked into
were one test each, in a file the branch did not touch, green alone on repeat. Every other task of the
battery has a median under a minute.

CI answered the same question in fifteen minutes meanwhile — twenty-three for the run
cited, its tail shard — the gates in three and a half on
one runner, the suites in nine to twenty-three across six
([0081](0081-a-shard-is-a-machine-not-a-second-worker.md)), retries on and a machine to each
shard. The nightly measured the mutants in seventy minutes on one runner and held the record
to them — the same seventy the desk paid once more per pull request, and again after each
round of review, because `check-mutation` holds the report to the exact text of the sources
(point 1).

The record is what forced the full run. `mutation.snapshot.md` is a row per file with a
two-sided tolerance of two points, a file with no row fires `incomplete-snapshot`, and six
commits on `main` moved it between 2026-10-02 and 2026-10-07. `--write` rendered the whole
file from the whole report, and a narrow run (`--mutate`) handed to it wrote four rows where
there had been a hundred and twenty, with no word said. So the choice was seventy minutes or a
false record — and what nobody had measured was whether a narrow run measures a file AS the
full one does. It does: `date/src/locale.ts`, 135 mutants, by the full run of 2026-10-06 and a
`--mutate` run of the next day over the same text — 121 killed, 12 surviving, 1 uncovered, 1
timeout, in both. Stryker drives Vitest in related mode, so a file's mutants meet the specs
that reach the file whichever run throws them; what the narrow run does not have is the whole.

And the memory. On 2026-10-06 at 10:56 the kernel's OOM killer took a 2.6 GB process out of
the editor's scope and systemd tore the scope down — 14 GB at its peak, with the browser
engines and the Vitest workers of the desk's runs inside it, because a run a session starts
lives in the editor's scope.

## Decision

**The desk measures what a change touches; the machines CI has measure the whole.**

1. **`scripts/before-push` runs without the browsers, and that is the battery.** The spec of
   the component a change touches runs on one engine, by hand, before the push; the whole
   suite is the pull request's verdict. Six shards became eight, each one still a runner to
   itself, so [0081](0081-a-shard-is-a-machine-not-a-second-worker.md)'s property holds and
   the tail shortens: 23 minutes at six, measured, was 11.4 at eight on the first run of this
   change (37655766884 — the run in 13.1, the shards 7.6 to 11.4), and a job is free on a
   public repository.
2. **A change measures its own files with a narrow run, and `--write` merges.** `stryker run
--mutate <file>` from the workspace root, minutes for a file; then
   `node tools/check-mutation.mjs --write` rewrites THE ROWS of the files the run measured,
   keeps every other row, and adds TOTAL up from the rows — the arithmetic point 6 holds a
   row to, so the file a full run writes and this one are one file. `mergeSnapshot` is held
   to the renderer by the gate's own control (a file unchanged, a file moved, a file the
   record never saw) and refuses what would make a row false rather than narrow: no record
   to merge into, a slice of a file, a run that measured nothing, a file outside the
   inventory, a text that is not the one on disk, and every narrowing of the denominator
   point 5 reads off the configuration. The door is one function for both writers: a full run is looked at before
   it is rendered — one that lost a file of the inventory writes nothing
   (`write/full-run-incomplete`) — and a report whose `mutate` cannot be read is neither
   kind (`write/patterns-unreadable`). A full run is for a record that is not there yet.
3. **The nightly holds the whole, and keeps its report.** `nightly.yml` runs the full set
   over `main` every night and holds every row to the tolerance, as before; it now uploads
   `mutation.json` as an artifact, so the morning after a red the record is rewritten from
   that run — `gh run download`, `--write`, a commit — and not from seventy minutes of a
   desk.
4. **Anything heavier than a gate runs under a memory ceiling on the desk**:
   `systemd-run --user --scope -p MemoryMax=6G -- <command>`. The kernel then kills the run,
   and not the editor.

## Consequences

- A pull request that touches library sources costs the desk minutes where it cost an hour
  and a quarter, and a round of review costs it minutes where it cost an hour: the battery,
  a spec, a narrow run. The browsers and the full set run where they already ran.
- A regression in a file the change did NOT measure — a spec of file A that also covered file
  B, rewritten — shows at night and not in the pull request. That is the cost, and it is
  bounded: the row is held at night to two points, the report is an artifact, and the fix is
  a commit the next morning. Before, the same regression was seen before the merge, at
  seventy minutes a sighting.
- A narrow run cannot say what the full one says about the whole: the clock's share and the
  inventory's `source-unaccounted` are the nightly's, and the merge does not pretend
  otherwise — it checks the inventory of what it writes, not of what it did not measure.
- The e2e verdict moves from the desk to the pull request's checks. A merge still waits for
  them; what no longer waits is the push.

## What this costs us

Eight cases and sixty rules where there were fifty-three; a second writer of the record,
held to the first by a control rather than by an eye; and the morning red named above, the
day after a merge. Measured against 52 hours in fourteen days, and a killed editor.

## Alternatives considered

- **A mutation workflow on the branch, on demand.** The same seventy minutes on a runner
  instead of the desk: the desk is free, the merge is not — every round of review that moves
  a source moves the report, and the last round waits an hour for it.
- **The full set sharded across runners.** Twenty minutes, but `check-mutation` would have to
  read a report assembled from four, and `--mutate` is on its list of disarming flags for a
  reason: today a report says what one run did. A larger change to the gate than the one
  taken, for a file the narrow run already measures to the same numbers.
- **Wait for the nightly with no merge.** `incomplete-snapshot` fires on every new file and
  the tolerance on most moved ones; the six commits above would have reddened a night each,
  and a red that is expected is a red nobody reads.
- **More workers on the desk.** The desk is the binding resource, and it is shared.
