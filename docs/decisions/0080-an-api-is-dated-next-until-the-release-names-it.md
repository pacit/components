# 0080 — An API is dated `next` until the release names it

**Status:** accepted
**Implements:** [`req-release-since`](../requirements/release.md#req-release-since)
**Evidence:** the sweep of 2026-09-17 — 514 public API items in 82 files, none dated, 265 of
them inputs, models and outputs and 249 entry-point exports, 75 of those with no JSDoc at
all; 66 public methods read the same day; `adjustSemverBumpsForZeroMajorVersion` in Nx,
which makes the next number depend on the commits the release will count; a CI checkout
with `filter: tree:0` and a Pages checkout with no tags at all

## Context

The site deploys from `main` on every green run and the package deploys when a maintainer
approves a release, so from the first commit after a tag the site describes an API the
package does not have. Position 3.6 asked for the fact per API — the input, the output, the
model, the export — and not per component: a chip on a card is too coarse for a component
that gained one input.

Three things had to be settled: where the fact lives, what an unreleased API is called, and
what the site compares it with.

## Decision

**The fact lives in the JSDoc at the declaration**, as `@since`. It is the one place both
readers of the API already look: the docs site reads the JSDoc line above every member and
export at build time, and the `.d.ts` carry the same JSDoc to a consumer's editor. A second
home — a version column in the cards, a table in the plan — would drift from the first at
the first edit of either ([0017](0017-one-home-per-fact.md)).

**An unreleased API is dated `next`**, not with a guessed version. Before 1.0 a breaking
change bumps the minor and a feature the patch, so whether the coming release is `0.1.1` or
`0.2.0` depends on every commit until the day it is cut; a hand-written `@since 0.2.0` is
right or wrong by luck. The word costs nothing to write and nothing to check, and the
release is the moment it gets a number: `stamp-version.mjs`, which already copies the
manifest's version into `PCT_VERSION`, rewrites every `@since next` on the run that moves
the version — before the build, so the shipped types name the release. A rehearsal moves
no version and leaves `next` alone.

**The comparison is with the manifest, not with a tag.** The release writes the version
into `libs/components/package.json` in the commit it tags, so between releases the manifest
IS the last tag — and it is present in every checkout, where a tag is not: CI clones with
`filter: tree:0`, Pages with no tags, a consumer's fork with whatever it fetched. A build
that read tags would mark everything `unreleased` wherever the tags were missing, and say
so on the site.

**Two gates hold it.** `check-since` reads the sources with the TypeScript parser and holds
every item to a `@since` that is `next` or a version the manifest has reached, and refuses
a deprecation of what never shipped. `check-package` point 10 reads the built types and
refuses, under `--release`, a package that still carries `next` — the artefact of a build
nobody stamped; day to day it warns, because `next` on `main` is the ordinary state.

**The page says it per row**, with an outlined `unreleased` mark and a legend that names
the package version the count is against; a row says `since` only when its version is newer
than the oldest on the page, so a component that shipped whole says it once, not 30 times.

## Refused

- **A version typed by hand for new API.** Right by luck at `0.x`, and wrong the day a
  breaking change lands in the same cycle — the gate could not tell, because `0.1.1` and
  `0.2.0` are both plausible until the release.
- **Tags at build time.** `fetch-tags` in two workflows and a site that lies in every clone
  that skipped them. The manifest carries the same fact everywhere.
- **Dating parts in this decision.** A part is markup with no declaration to carry a tag;
  it waits for the first card whose contract names one. Methods were refused here at first
  — sixty-six of them, most of them what a component and its parts say to each other — and
  dated the same morning on the maintainer's word: public is public, a consumer's editor
  reads every one of them in the types, and seventy carry the tag now.
- **A `since` on every row.** Two hundred and sixty-five rows saying `0.1.0` is noise; the
  information is in the difference.

## Consequences

- Every public declaration gained a JSDoc block, or two lines in the one it had: 1786 lines
  across 82 files, mechanical, once. A new API is written `@since next` and the gate says so
  when it is not.
- The release commit rewrites sources beyond the manifest and the constant, and `git add
-u libs/components` carries them ([`lesson-220`](../lessons.md#lesson-220) taught the
  cost of a release commit that carried less than the release).
- The shipped `.d.ts` grew by the tags — a fact per declaration, read by an editor, at the
  price of the bytes.
