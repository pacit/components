# Requirements — release

This area covers the former versioning section plus the release-readiness points that used
to hang without an identifier in the „What is still missing" table. Old identifiers are
mapped in the [migration table](../README.md#identifier-migration-2026-07-27).

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
`ng add` blows up at the consumer with „Collection not found". Plus
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
refuses provenance.

**Gate:** `libs/components/check-package.mjs` (point 6) — two different severities, because
these are two different conditions. Manifest fields: a warning in an ordinary run, an
**error under `--release`**, for as long as `repository` has nothing to point at. The
`licence` check: **always an error** — a LICENSE file in the artifact, non-empty, naming
a licence that matches the `license` field, with a `Copyright (c) <year> <entity>` line.
Plus `tools/check-consumer.mjs` (point 1, rule `licence-missing`) — a file present in `dist`
can still fall out of `npm pack`, and `check-package` cannot see that by construction
**Control:** `tools/check-package.fixtures/repository-missing/` — a manifest without
`repository` must fire under `--release` and **only warn** in an ordinary run. Both
directions are tested: asserting only on „blocks" would let through a regression after which
point 6 blocks always, and then a repository without a remote would not build at all. Plus
`tools/check-package.fixtures/licence-missing/` (a package with no file) and
`tools/check-package.fixtures/licence-mismatch/` — a file naming Apache-2.0 against a `MIT`
manifest. The second one also tests **how the match is made**: the licence text contains the
word `LIMITED`, which has `MIT` inside it as a substring, so a comparison by `includes` would
call it a match. The archive is guarded by
`tools/check-consumer.fixtures/tarball-without-licence.json`
**Decision:** [0015 — MIT everywhere, rights to the entity, no CLA](../decisions/0015-license-and-model.md)
**Binds at:** the first publish — the LICENSE file and its gate have been there since
2026-08-06, the `repository` field since 2026-08-07. It points at
`github.com/pacit/components`, which does not exist yet; provenance demands agreement with
the repository the publish runs from, so the condition only closes when the remote is created
(B2)

> The promise was **double and measured single**: the manifest fields had a gate from A1, the
> LICENSE file had none and did not exist, while the requirement stood in the registry as ✅.
> Closed in B1 — measured on both sides of `npm pack`, because those are two different
> filters.

---

### <a id="req-release-support"></a>`req-release-support` — Support and deprecation policy

**Promise.** Written down explicitly: how many Angular versions back are supported and for
how long, how many minors of warning before an API is removed, and that **the first breaking
change arrives with a codemod**, not with a paragraph in the CHANGELOG.

**Gate:** none — gap: the document does not exist. The migration collection does
([`req-release-ng-add`](#req-release-ng-add)), but nothing ties a breaking change to an
obligation to ship a migration
**Control:** none — gap: a `feat!:` commit with no entry in the migration collection has to
fire
**Binds at:** the first external consumer — a company does not buy a library on the strength
of its code, but on the strength of its **predictability**
