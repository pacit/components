# Requirements — release

This area covers the former versioning section plus the release-readiness points that used
to hang without an identifier in the "What is still missing" table.

> The shape of an entry and the meaning of the **Gate** / **Control** fields are described
> in the [README](../README.md#requirement-shape).

---

### <a id="req-release-semver"></a>`req-release-semver` — SemVer with pre-release channels

**Promise.** Versioning follows SemVer, with `beta` and `rc` channels. Before 1.0 a breaking
change bumps the **minor**, not the major — otherwise the first `feat(api)!` would throw the
library out to 1.0.0 and take away the right to an unstable API that
[`req-project-latest`](project.md#req-project-latest) explicitly assumes. The `PCT_VERSION`
constant is **generated** from the manifest, not typed by hand.

**Gate:** `libs/components/check-package.mjs` (point 4: `PCT_VERSION` == `version` from the
manifest) + `tools/release.mjs` — the package gate stands **before** the commit, the tag and
the publish
**Control:** `stamp-version` is **not** a dependency of `build` — if it were, the artifact
would always agree with itself and the version check would stop measuring anything. The
construction is a negative control in itself ([`lesson-41`](../lessons.md#lesson-41))
**Lessons:** [`lesson-41`](../lessons.md#lesson-41)

> **Open:** the `beta`/`rc` channels are reachable through `--specifier`, but they have **no
> run and no `dist-tag` of their own**. Binds at the first release that is not meant to go
> to everyone at once.

> **Open:** the **first** version does not follow from the history either. With a single root
> commit `releaseVersion` sees an empty range and keeps the manifest's `0.0.1`, so the first
> run needs an explicit `--specifier`; and at `0.0.1` every bump lands on a patch, because
> `adjustSemverBumpsForZeroMajorVersion` is on. The number the library starts at is therefore
> a decision somebody makes, not one the tool derives. Binds at the first release.

---

### <a id="req-release-ng-add"></a>`req-release-ng-add` — `ng add` and the migration collection

**Promise.** `ng add @pacit/components` wires the skin and the CDK overlay styles into the
build configuration — two things a consumer cannot guess and without which the library looks
broken. The `ng update` migration collection ships **from the first release**, empty though
it is.

**Gate:** `libs/components/check-package.mjs` (point 5) — the collections are in the package
and their factories point at **compiled** files, not at the TS from before the build. Plus
`tools/check-consumer.mjs` (point 4) — the schematic from the **installed** package runs
under a real Angular CLI and actually wires the skin into the build configuration
**Control:** `tools/check-package.fixtures/schematic-missing/` — a package whose collection
points at a factory with no compiled file (i.e. built without the schematics compile step)
must fire point 5. The manifest entry alone guarantees nothing — with the file missing,
`ng add` blows up at the consumer with "Collection not found". Plus
`tools/check-consumer.fixtures/ng-add-failed.json` and a run against the repository with the
CommonJS boundary removed
**Lessons:** [`lesson-55`](../lessons.md#lesson-55)

> The reason an empty collection ships from day one is not cosmetic: `ng update` reads the
> collection from the version **installed** at the consumer, so adding it at the first
> breaking change would help nobody who installed earlier.

> Two gates, because these are two different measurements. The static one asks whether the
> factory file **is there**; the one in use asks whether it can be **loaded**. The
> difference cost the released artifact a crash on the consumer's very first command
> ([`lesson-55`](../lessons.md#lesson-55)).

---

### <a id="req-release-metadata"></a>`req-release-metadata` — The package carries complete metadata

**Promise.** The manifest carries `repository`, and the repository carries a `LICENSE` file.
`"license": "MIT"` without a LICENSE file is formally an **incomplete licence**, and that is
the first thing a corporate consumer's legal department checks. Without `repository`, npm
refuses provenance. And every citation the shipped JSDoc carries — a requirement, a lesson,
a decision — is an address on the documentation site that answers, not a path into a tree
the consumer does not have.

**Gate:** `libs/components/check-package.mjs` (point 6) — two different severities, because
these are two different conditions. Manifest fields: a warning in an ordinary run, an
**error under `--release`**, for as long as `repository` has nothing to point at. The
`licence` check: **always an error** — a LICENSE file in the artifact, non-empty, naming
a licence that matches the `license` field, with a `Copyright (c) <year> <entity>` line.
Plus `tools/check-consumer.mjs` (point 1, rule `licence-missing`) — a file present in `dist`
can still fall out of `npm pack`, and `check-package` cannot see that by construction.
The citations: `libs/components/check-package.mjs` (point 9) reads the shipped `.d.ts` and
bundles for a repository path, a bare `req-*` / `lesson-*`, a host other than the site's
(`apps/docs/public/CNAME`, decision 0078) — and for a reading of zero, which must not pass.
The step that makes it true is `libs/components/link-citations.mjs`, run by the `citations`
target after `build` and before anything reads the artefact
**Control:** `tools/check-package.fixtures/repository-missing/` — a manifest without
`repository` must fire under `--release` and **only warn** in an ordinary run. Both
directions are tested: asserting only on "blocks" would let through a regression after which
point 6 blocks always, and then a repository without a remote would not build at all. Plus
`tools/check-package.fixtures/licence-missing/` (a package with no file) and
`tools/check-package.fixtures/licence-mismatch/` — a file naming Apache-2.0 against a `MIT`
manifest. The second one also tests **how the match is made**: the licence text contains the
word `LIMITED`, which has `MIT` inside it as a substring, so a comparison by `includes` would
call it a match. The archive is guarded by
`tools/check-consumer.fixtures/tarball-without-licence.json`. The citations:
`tools/check-package.fixtures/citation-relative/`, `citation-bare/` and `citation-none/` —
a path, a word, and a package whose types cite nothing, each rejected on its own rule
**Decision:** [0015 — MIT everywhere, rights to the entity, no CLA](../decisions/0015-license-and-model.md)
**Binds at:** the first publish — the LICENSE file, its gate and the `repository` field are
all in place, and `github.com/pacit/components` has been public since 2026-09-15, so
provenance has a repository to agree with. The citations resolve once the site answers at
its address, which is the deploy's condition and not this gate's

> The promise is **double and has to be measured twice**: the manifest fields on one side of
> `npm pack` and the LICENSE file on the other, because those are two different filters. A gate
> on the fields alone leaves the file free to be missing while the registry says ✅.

---

### <a id="req-release-support"></a>`req-release-support` — Support and deprecation policy

**Promise.** Written down explicitly: how many Angular versions back are supported and for
how long, how many minors of warning before an API is removed, and that **the first breaking
change arrives with a codemod**, not with a paragraph in the CHANGELOG.

**Gate:** `tools/check-support.mjs` (five points) over [`docs/support.md`](../support.md),
which holds the three numbers in a table the gate reads. Point 1: the rows are declared and
are numbers. Point 2: the declared Angular window equals the one the `@angular/*` peer ranges
admit — the point that stops the document being a second, drifting copy of the manifest.
Point 3: every entry of the `ng update` collection is whole. **Point 4 is the tie the
promise was missing** — a `feat!:` commit (or a `BREAKING CHANGE:` trailer) after the newest
release tag obliges an entry in the collection for a version above the released one. Point 5:
every `@deprecated` names the version it started in, without which the notice cannot be
counted
**Control:** `tools/check-support.fixtures/` — fifteen prepared inputs, each rejected by the
point it declares, headed by
`tools/check-support.fixtures/breaking-change-without-a-migration.json`: a breaking change
since the last tag against an empty collection, which is the state this repository was in
before the gate existed. Point 4 has two more, because there are three ways to stop owing a
codemod and only one of them is not writing it — the others are counting a migration older
than the release and setting `codemod-required` to `no`. Plus a recorded run on the real
input: `angular-majors` moved to 2 against a `^22.0.0` peer range fires point 2
**Decision:** [0015 — MIT everywhere, rights to the entity, no CLA](../decisions/0015-license-and-model.md)
**Binds at:** the first external consumer — a company does not buy a library on the strength
of its code, but on the strength of its **predictability**

> **Two of the promise's clauses are measured and one is not**, and the document says so
> rather than leaving it to be discovered. Point 5 sees that a deprecation recorded its
> starting version; **nothing sees that the removal waited the declared two minors**, because
> that needs a record of the public API as it stood at each release and there is none —
> `parts.snapshot.md` is that shape of record for CSS parts and the API has no equivalent.
> Point 4 likewise measures **nothing until the first release tag**: before it there is no
> installed version to migrate from, so a breaking change owes no codemod. The run says which
> of the two states it is in on every line it prints.

### <a id="req-release-since"></a>`req-release-since` — The public surface says since when

**Promise.** Every public API — an input, a model, an output, a public method of an exported
class, a public field or getter beside them, an export of an entry point — says what it is in
a sentence and names the version it appeared in, in the JSDoc at its declaration:
`@since 0.1.0` for what shipped, `@since next` for what `main` has and the published package
does not. What can stop being public does: a member only its own template reads is
`protected`, and a member that overrides another is dated where it is declared. The tag
travels into the shipped `.d.ts`, so a consumer's editor reads it, and the site marks
`unreleased` what the package at its version cannot have. The release names the version:
`stamp-version.mjs` rewrites `next` on the run that bumps the manifest, before the build
([0080](../decisions/0080-an-api-is-dated-next-until-the-release-names-it.md))
**Gate:** `tools/check-since.mjs` (points 1–4: every item dated; a value that is `next` or a
version the manifest has reached; no deprecation of what never shipped; a sentence above the
tags, because a name is not a description) +
`libs/components/check-package.mjs` point 10 (`--release`: no `@since next` in the shipped
types)
**Control:** `tools/check-since.fixtures/` — seven prepared inputs, each rejected by its own
point, and `_reader/`, a prepared library whose every API the readers must return, written
with the `export` keyword, with a list, and under names several declarations share;
`tools/check-package.fixtures/since-next/` on the release side, warning day to day and
blocking under `--release`
**Non-goals:** a part. A part is markup, and a since column in the card would be a second
home for the fact ([0017](../decisions/0017-one-home-per-fact.md)). A public method is not
one: seventy-four are dated, most of them the plumbing between a component and its parts,
and all of them in the shipped types — the one place the tag shows, because the site
renders no method rows. Nor is a public field: fifty-seven are dated, after the sweep of
2026-09-18 made `protected` the six that only their own template read and gave the harnesses'
two static members one declaration each in `PctHarness` instead of fifty-two
