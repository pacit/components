# 0040 — A lockfile is repository material, the tree it locks is not

**Status:** accepted
**Implements:** [`req-project-reach`](../requirements/project.md#req-project-reach),
[`req-project-language`](../requirements/project.md#req-project-language)
**Evidence:** measured on the commit that added the trees and on the one after it —
`check-reach` reported **45 tracked files nothing reaches**, `check-language` ended in
`EISDIR` before reaching its report, and `nx run components:mutation` ended in `EISDIR` too,
so the only machine that says whether the unit tests catch anything could not start. Taking
the trees out of the git index cleared the first two and **did not touch the third**, which
is what pinned the decision to a shape rather than to a preference
([`lesson-59`](../lessons.md#lesson-59), [`lesson-113`](../lessons.md#lesson-113))

## Context

`npx skills add` installed two Angular skills. It wrote 42 files under `.agents/skills/`, put
a symlink to each tree into `.claude/skills/` and `.opencode/skills/` — the directories those
two tools walk — and recorded the source and the digest of each in `skills-lock.json`. All 47
entries went into the git index, and three tools then disagreed about the repository:

- **the reach walk** said 45 of them have no reader;
- **the language gate** never got as far as saying anything: a tracked symlink to a directory
  is `EISDIR` to a reader that opens every path in the index;
- **Stryker** never got as far either, on the same symlink, copying the project into its
  sandbox.

Underneath the three there is one question, and it is not answerable by any of them: **what
is this repository made of?** A vendored tree is material or it is not, and reach, language
and the mutation sandbox have to give the same answer.

## Decision

**`skills-lock.json` is tracked. The trees it locks are not.** `.gitignore` carries
`.agents/`, `.claude/skills/` and the vendored names under `.opencode/skills/`, and
`npx skills experimental_install` restores the payload from the lockfile.

Three things settle it, and none of them is new here:

1. **The split already exists in this repository**, one directory up: `package-lock.json` is
   tracked and `node_modules` is not. A lockfile is the reproducible record; the payload is
   what the record can rebuild. A skills lockfile is the same object, down to the digest.
2. **Nothing configured here reads `.agents/`.** The two tools that are configured — the
   `.claude/*.json` pair and `opencode.json` — reach it only through links, and the reach policy has
   said since the pre-publication tidy-up where the first of them takes its workspace skills from:
   from the plugin declared in its settings, "instead of a copy of them in the repository". A
   register entry would have had to name a reader, and the honest name would have been "any agent
   tool that follows the convention" — which is not a reader, it is the absence of one.
3. **The payload is somebody else's documentation.** Forty of the 42 files are reference
   pages about a framework that ships a new minor every few weeks. A copy of them ages from
   the moment it lands, and it ages silently, because nothing in this repository is measured
   against it.

## What it costs

**A fresh clone has no skills until somebody runs the installer.** That is the price, it is
paid by an agent rather than by the build, and it is the same price a fresh clone already
pays for `node_modules`. It is worth one qualification, because it is the weak joint of the
whole analogy: the restore command is called `experimental_install` and the tool says so. If
it goes away, what is lost is the convenience of restoring — the lockfile still records what
was installed, and `skills add` against the recorded source is the manual form of the same
thing.

**The guard against the trees coming back is weaker than it looks.** `check-reach` fires on a
newly tracked tree that nothing points at — but a mention is an edge, and the entry in the
plan describing the failure re-reached all 42 files with one anchored pattern
([`lesson-113`](../lessons.md#lesson-113)). So the rule is written down here, in prose, and
the gate is a second line rather than the first.

## The half that is not about tracking at all

Stryker copies the **working tree**. Untracking a file does not remove it from disk, so the
mutation run went on crashing on the same symlink after the index was clean, and the fix was
where [`lesson-59`](../lessons.md#lesson-59) already put it: `ignorePatterns` in
`libs/components/stryker.config.json`, which now names the three agent directories.

The language gate got the other kind of answer, because its subject really is the index: it
now reads the **mode** git recorded and steps over everything that is not a regular file. A
symlink carries no text of its own — git stores the target path as the blob — so reading it
gives either the same words a second time under a path nobody wrote them at, or `EISDIR`.

## Alternatives considered

**Keep the trees and give each tool an entry.** A `roots` or `enumerated` line for `.agents`,
a vocabulary entry for the digests, three names in `ignorePatterns`. It works, and it spends
the one thing the reach policy says it cannot afford: an entry takes a whole tree out of the
measurement in a single line, which is the shape of the defect the gate exists for. Three
excuses to keep a copy nobody here reads is the wrong side of that trade.

**Drop the lockfile too.** Then nothing records what was installed and the skills become
whatever each machine happened to fetch. The lockfile is the cheapest possible record — one
file, two entries — and it is the half that makes ignoring the payload safe.
