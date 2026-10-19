# 0094 — The release reaches `main` as a pull request, and the tag follows the merge

**Status:** accepted
**Implements:** [`req-release-semver`](../requirements/release.md#req-release-semver),
[`req-release-metadata`](../requirements/release.md#req-release-metadata)
**Evidence:** the ruleset `main-protected` (id 23640974) read on 2026-10-19 — active, no bypass
actors, `gates` and `e2e (1)` … `e2e (8)` required on the default branch, and a bypass for
GitHub Actions refused because the repository belongs to a person; Nx 23.2.1's
`releaseChangelog`, read in `dist/src/command-line/release/changelog.js` and `utils/git.js`;
GitHub's `receive-pack` advertising `atomic` to `git push`; a rehearsal of both runs on a clone
whose `origin` was a local bare repository, with `gh` and `npm stage` replaced by recorders

## Context

`release.yml` ran `tools/release.mjs` once, and the script ended in `releaseChangelog` with
`gitPush: true`. Read in Nx's source, that call commits the index (the manifest, the stamped
sources, `docs/acr.md`, the CHANGELOG), tags the commit `components@<version>` locally, runs
`git push --follow-tags --no-verify --atomic` on `main`, and only then creates the GitHub
Release through the API — the push throws before that, on any refusal. The script's last step,
`npm stage publish`, follows the whole call.

On 2026-10-19 the ruleset on `main` went active, and it requires the nine CI checks on every
commit that reaches the branch. The release commit is new on the runner and carries none, and
the bot cannot be exempted. So the next real run would have been refused at the push. Because
the push is atomic — GitHub advertises the capability — the tag dies with the branch update:
nothing public would have existed, no tag, no Release, no stage. The run would have been red
for a reason the workflow does not name, and then dispatched CI on an unmoved `main`.

## Decision

**A release is two runs of the same workflow. `prepare` pushes the release commit to
`release/<version>`, dispatches CI on it and opens a pull request, which a person
squash-merges once green. `publish` stages the merged commit on npm, and then tags it and
creates the GitHub Release.**

1. **`prepare`** (`release.mjs` without `--publish`) is the old run up to the commit: bump,
   stamp, `check-acr --write`, build, `check-package --release`, CHANGELOG, commit — with
   `gitTag`, `gitPush` and `createRelease` off. The commit goes to `release/<version>`, which
   the ruleset does not cover. CI is dispatched on that branch, since a push or a pull request
   made with `GITHUB_TOKEN` starts no workflow ([`lesson-243`](../lessons.md#lesson-243)), and
   the dispatched run's checks sit on the branch's head — the pull request's.
2. **The merge is a person's.** A merge by the bot's token would start no CI on `main` either,
   and `publish` needs that run. A squash keeps the release one commit on `main`.
3. **`publish`** (`--publish`) checks out the commit that wrote the manifest's version — not
   `main`'s head, which may already carry later merges whose `@since next` nobody dated — and
   holds it to three things: the manifest moved in it, no tag carries the version, and its CI
   run on `main` is green (0079's guard, now read inside the script for the commit it
   publishes). Then build, `check-package --release`, `npm stage publish`, the tag pushed
   alone, and `gh release create` with the CHANGELOG's entry for the version — the text Nx
   used to send.
4. **The stage comes before the tag.** It is the one step nobody sees until a maintainer
   approves it with 2FA, so a failure before it leaves nothing public and a failure after it
   leaves a stage nobody approves. Until now the tag and the Release were out before npm had
   accepted anything.
5. **The workflow file stays one.** npm knows the trusted publisher by the workflow file's
   name, and a second file reacting to the merge would be a publisher npm refuses.

## Consequences

- **A release takes two dispatches and one merge**, and between them the time CI takes on
  the branch and again on `main` — two runs of about a quarter of an hour.
- **The dry run of `prepare` still walks the whole path**, the OIDC exchange of
  `npm stage publish --dry-run` included, and says which branch it would push. A dry run of
  `publish` refuses when `main` holds no untagged release commit, which is the usual state.
- **The release branch is the record of what was prepared.** The ruleset requires checks, not
  an up-to-date branch, so the pull request can be squashed onto a `main` that moved since
  `prepare`. `publish` refuses unless the squash's parent is the commit the branch was cut
  from, and deletes the branch once the Release is out; `prepare` refuses while one exists.
  A refused squash is reverted and prepared again.
- **A failure after the stage is finished by hand**, and the run says how: a second `publish`
  would stage the same version again.
- **A merge right after the release can cancel its CI run on `main`** (`concurrency` cancels
  in progress); `publish` then refuses, and re-running that run on its commit is the way on.
- **`stamp-version` is no longer cached.** The rehearsal of this decision found that a cache
  hit replays `version.ts` alone: the `@since next` it dates in the sources are neither its
  inputs nor its outputs, and the package gate refused the undated build. A fresh runner never
  hits, so no release shipped it; a second run on the desk did.

## What this costs us

- **The release path grew a branch, a pull request and a step in the person's hands**, and the
  instrument no gate exercises is longer by about a hundred lines.
- **The release commit's subject gains the pull request's number** under a squash, which the
  CHANGELOG does not read.

## Alternatives considered

- **A bypass for the bot.** Refused by GitHub for a repository owned by a person; and a
  bypass is the weakening the ruleset exists to prevent.
- **Push the commit to a branch, wait for its CI, then fast-forward `main` to it.** The ruleset
  asks for checks, not a pull request, so the same commit would pass. But the job would sit
  out a quarter of an hour of CI, the fast-forward fails whenever anything merged meanwhile,
  and the bot's push to `main` still starts no workflow — the site would stay a release
  behind, as after `0.2.0` ([`lesson-243`](../lessons.md#lesson-243)).
- **A personal token or a GitHub App to push to `main`.** A credential stored for the one
  workflow that holds none today (0079), and it would still bypass the checks.
- **A second workflow on `workflow_run` of CI that publishes the merged commit.** No click
  between the merge and the stage, but npm's trusted publisher names `release.yml`, and a
  publish that follows any green run of `main` is the automatic release `release.yml`'s first
  line argues against.
- **Tag first, push the tag, and merge the commit later.** The tag would name a commit `main`
  never holds after a squash.
