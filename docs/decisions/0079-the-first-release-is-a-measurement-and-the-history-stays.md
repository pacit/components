# 0079 — The first release is a measurement, and the history stays

**Status:** accepted
**Implements:** [`req-release-semver`](../requirements/release.md#req-release-semver),
[`req-release-metadata`](../requirements/release.md#req-release-metadata)
**Evidence:** `git log` on 2026-09-16 — 455 commits, 16 of them marked `!`, 92 `feat`,
24 `fix`, 5 `refactor` and 30 `docs` touching `libs/components`; the release rehearsal of
2026-09-15 resolving `0.0.1` to `0.0.2`; npm's documentation of trusted publishing, which
lives in a package's settings and requires npm 11.5.1; GitHub's changelog entries of
2026-07-08 and 2026-07-31 on tokens that bypass 2FA

## Context

The repository went public on 2026-09-15 and the publish was refused the same day, on the
maintainer's word ([0075](0075-the-push-and-the-premiere-are-two-moments.md)). Four questions
stood between that day and `npm publish`, and none of them was about code:

- **the number.** The rehearsal read `0.0.1` → `0.0.2` against sixteen breaking commits, and a
  first public version that looks like a typo is a first impression spent,
- **the CHANGELOG.** `nx release` renders it from conventional commits, and for a first release
  the range is the whole history: some hundred and fifty titles written in this repository's
  voice, for a reader who asked what the package is,
- **the history itself.** The maintainer asked whether to squash it to a handful of commits
  and continue on branches, because read as a list it looks like noise,
- **the token.** `release.yml` publishes with a stored `NPM_TOKEN`, and the plan was to
  replace it with trusted publishing _before_ the first publish.

## Decision

**The history is not rewritten. The first version is `0.1.0`, derived, not dictated. Its
CHANGELOG entry is a measurement rendered by this repository's own renderer, and trusted
publishing is configured a minute after the first publish, because it cannot be before.**

1. **The history stays.** It has been public since the day it had 404 commits: rewriting
   `main` invalidates every clone, fork and link anybody has made, which is the class of
   irreversibility [0016](0016-mit-irreversibility.md) is about. The documentation cites it —
   seven commit hashes and the numbers of CI runs stand as evidence in
   [`lessons.md`](../lessons.md) and the plan — and `tools/check-distance.mjs` and the
   `git-tag` version resolver count on this line and no other. And it is not noise: 455
   conventional commits with a type and a scope, each green in CI at the push, are the
   evidence trail the trust surface sells. A consumer reads the CHANGELOG; the history is for
   the maintainer and for an audit, and for both a long one beats a folded one.
2. **`0.1.0`, from the commits.** Sixteen commits carry `!`, and
   `adjustSemverBumpsForZeroMajorVersion` turns a breaking change on a zero major into a
   minor. The rehearsal's `0.0.2` had a different cause, measured on 2026-09-17: Nx 23 reads
   a commit's scope as a project name (`useCommitScope`, on by default) and counts a scoped
   commit as a patch unless the scope is the project — and this repository's scopes name
   components and areas, never `components`. Every scoped commit was a patch and the
   breaking ones were nothing. With `useCommitScope: false` in `nx.json` every commit whose
   files touch the project counts, and the range resolves to `0.1.0`; `specifier: 0.1.0`
   stays the fallback, not the plan. Without the switch every later release would have been
   under-bumped the same way.
3. **The first entry is a measurement.** `tools/changelog-renderer.mjs` extends Nx's default
   renderer; when `tools/release.mjs` says this is the first release it renders the version
   title and what the release _is_ — the number of cards, of features and fixes since the
   first commit, of gates — with the site's address, instead of the list. Every later release
   renders the conventional list unchanged, `docs` and `refactor` visible as `nx.json` already
   says. The renderer is read by `nx release` alone, so `tools/tools.policy.json` names it the
   way it names `release.mjs`.
4. **The token publishes once, and then the publisher does.** Trusted publishing is
   configured in the package's settings on npm, and a package that has never been published
   has none. So: a granular token with 2FA bypass, scoped to the organization, seven days,
   one run; then the trusted publisher named after `release.yml`, the token and the secret
   deleted, and `NODE_AUTH_TOKEN` removed from the workflow. The next release is the proof.
   This is not a preference: tokens that bypass 2FA lose the right to publish around
   2027-01, by npm's own schedule.
   _Amended 2026-09-17, the afternoon of the publish: the publisher may only **stage**.
   npm's staged publishing (CLI 11.15 and later) uploads the tarball and holds the version
   until a maintainer approves it with 2FA, on npmjs.com or with `npm stage approve`; a
   trusted publisher can be limited to that, and this one is. So `release.mjs` runs
   `npm stage publish` — Nx's `releasePublish` knows only `npm publish`, which the registry
   now refuses from this workflow — and the tag and the GitHub Release precede the version on
   npm by however long the approval takes. The dry run now asks npm to skip its "cannot publish
   over" check (`--force`, dry run only), because the artifact it packs still carries the
   published version — and on the runner it treats npm's "not logged in" as the finding it
   is: an OIDC exchange the registry refused. The proof stays where it was: the next release._
   _Read 2026-09-25, the release of `0.2.0` (run 36142718568 on `dcf69606`): the proof is in.
   The publisher staged — `npm stage publish --provenance`, the provenance statement in the
   transparency log at index 2956911741 — the tag and the GitHub Release went out at 13:44
   UTC, and the maintainer approved with 2FA at 20:16 UTC; `npm view` then said
   `latest: 0.2.0` with the SLSA v1 predicate under `dist.attestations`. Two more proofs
   went out with it, neither reachable
   by a dry run: the first `@since next` dated on the release run — the button's `tone`,
   `@since 0.2.0` in the shipped `.d.ts`, and `PCT_VERSION = '0.2.0'` in the tarball equal
   to the tag — and the first codemod in the collection a consumer installs, `badge-tone`
   under `0.2.0` in `migration.json`, reached through `ng-update.migrations` in the
   manifest. The release commit `b0e4525d` carries the CHANGELOG, the manifest, the constant
   and the dated source together, which closes [`lesson-220`](../lessons.md#lesson-220) by
   reading; the rehearsal before it had a finding of its own
   ([`lesson-242`](../lessons.md#lesson-242)), and so had the first CI after the tag: on the
   pull request that wrote this note it found `docs/acr.md` still rendered at `0.1.0`, because
   the release commit moves the manifest and re-renders nothing that reads it, and a push with
   `GITHUB_TOKEN` gives it no CI of its own; the push run after that pull request merged added
   a third, `format:check` red on the CHANGELOG the release had written
   ([`lesson-243`](../lessons.md#lesson-243)) — all three go into the release path next._
5. **The order of the premiere is fixed by what depends on what.** The site at its address
   first, because the public `.d.ts` cite it; then the citations, the CI-colour check in the
   release workflow and the contributor path; then the publish, on a sentence, as
   [0075](0075-the-push-and-the-premiere-are-two-moments.md) already says.

## Consequences

- **`CHANGELOG.md` and the GitHub Release of `0.1.0` say the same short thing**, because Nx
  uses the rendered entry for both, and a reader of either learns what the package is before
  learning what changed.
- **The dry run shows the entry before anything is written**: `tools/release.mjs --dry-run
--first-release` prints what the renderer produces.
- **`release.yml` changes twice**: once before the first publish, to read CI's colour; once
  after it, to drop the token. The second change is the one with a deadline.
- **A dry run still cannot reach one thing**: it writes no manifest, so `stamp-version` reads
  the old version ([`lesson-41`](../lessons.md#lesson-41)). The real run is the only proof of
  the order, and `PCT_VERSION` in the published package equal to the tag is its reading.
  Since 2026-09-25 the dry run's gate knows this: `release.mjs` hands it `--rehearsal`, and
  the `@since next` no stamp has dated is a warning naming what the real run will date, where
  `--release` refuses it — the first rehearsal after the word reached `main` had ended there
  ([`lesson-242`](../lessons.md#lesson-242)).

## What this costs us

- **One more script under `tools/`**, held to the same header and budget as the gates, for an
  entry that renders once. From `0.2.0` on it is a pass-through.
- **The first publish uses a stored token after all**, for one run. The window is a week
  and the secret dies with it; it is the shortest path npm leaves open.
- **The history stays long**, and a reader who opens `git log` expecting a summary gets 455
  lines. That reader has the CHANGELOG and the release notes, which is where the summary is.

## Alternatives considered

- **Squash the history and continue on branches.** Rejected for the four reasons in the
  decision. Branches with squash-merged pull requests and conventional titles remain
  available later and are compatible with `nx release`; they are a workflow choice, not a
  release condition, and one maintainer with a gate line on every push gains little from
  them.
- **Hide `docs` and `refactor` from the changelog.** Zero work, ~116 entries instead of ~150,
  and still a diary where a first entry should be a description.
- **Nx version plans.** A hand-written entry as a first-class Nx feature — but it replaces
  conventional commits as the source of the version for every release after, which is a
  larger policy change than a first entry justifies.
- **`1.0.0`.** A stable-API promise this library has not made: `docs/support.md` states the
  numbers it would change, and the pre-1.0 rule for breaking changes exists precisely so
  that the first `feat!` did not force it.
- **A prerelease channel first, `0.1.0-rc.1`.** A label changes nothing about what has gone
  out ([0016](0016-mit-irreversibility.md)), and the dist-tag for a channel does not exist
  yet; it would be a second first release.
