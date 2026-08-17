# Support and deprecation policy

What a consumer of `@pacit/components` can count on: which Angular versions a release works
with, how long an old release keeps getting fixes, how much warning an API gets before it
disappears, and what arrives with a breaking change besides a CHANGELOG entry.

This is the document [`req-release-support`](requirements/release.md#req-release-support)
asks for, and it exists **before** the first release rather than after the first complaint —
a company does not buy a library on the strength of its code but on the strength of its
predictability, and predictability written down after the fact is a report, not a promise.

## The policy in numbers

The rows below are read by `tools/check-support.mjs`, so they cannot quietly disagree with
the package they describe. Everything after this table explains a row; nothing after it adds
a number of its own.

| row                  | value | what it fixes                                                            |
| -------------------- | ----: | ------------------------------------------------------------------------ |
| `angular-majors`     |     1 | how many Angular majors one release of this library supports at once     |
| `support-months`     |     0 | how long a line keeps getting fixes after it stops being the newest      |
| `deprecation-minors` |     2 | how many minor releases an API stays deprecated before it may be removed |
| `codemod-required`   |   yes | whether a breaking change must ship an `ng update` migration             |

## Which Angular versions — `angular-majors`

One: the newest. The peer ranges in the manifest say the same thing (`^22.0.0`), and that is
not a coincidence anyone has to maintain by hand — point 2 of the gate counts the majors the
`@angular/*` peer ranges admit and requires the count to equal the row above. Widening the
window is therefore one edit in each place, and doing only one of them fails CI.

Before 1.0 this follows from [`req-project-latest`](requirements/project.md#req-project-latest):
the library stands on the newest versions of everything and the compatibility matrix starts
applying at the first release. **At 1.0 the row is meant to become 2** — the current Angular
major and one back, which is roughly a year of releases at Angular's cadence. It becomes 2 on
the day the peer ranges admit two majors and the library is tested against both, not on the
day somebody would like it to.

## How long an old line lives — `support-months`

Zero, and that is the honest number rather than a generous one. A fix lands in the newest
line; there are no backports to a line that is no longer newest, and no security branch. A
consumer who cannot upgrade holds a version that works and receives nothing further.

The reason is arithmetic, not indifference: a backport promise costs a second CI matrix, a
second release path and a maintainer available on someone else's timetable, and this library
has one maintainer. **At 1.0 this row is meant to become 6**, matching the cadence at which
Angular itself ships a major — so a consumer always has one Angular cycle to move.

A zero here is worth more than a number nobody would honour. `req-axis` applies to a support
promise exactly as it applies to code: a promise nothing enforces is a promise that will be
broken quietly, and the first consumer to find out will be the one who needed it.

## Deprecation — `deprecation-minors`

An API is never removed without notice. The sequence is fixed:

1. the API is marked `@deprecated` **with the version it was deprecated in** and with what to
   use instead,
2. it keeps working, unchanged, for at least **two minor releases**,
3. it is removed only in a release that is breaking anyway — and that release ships a codemod
   (below).

Step 1 has a form the gate reads, because a countdown that starts at an unrecorded moment
cannot be counted:

```ts
/** @deprecated since 0.4.0 — use `messages` instead. Removed no earlier than 0.6.0. */
```

Point 5 requires the `since <version>` clause on every `@deprecated` tag in the library
sources. What it does **not** do is count the two minors at the moment of removal — that
needs a record of the public surface as it stood at each release, and the gate has no such
record. So the notice is measured, the waiting is not: see the last section.

Before 1.0 a breaking change bumps the **minor**, not the major
([`req-release-semver`](requirements/release.md#req-release-semver)), so "two minors of
warning" is the whole distance a pre-1.0 deprecation travels — it is not a smaller promise
than the post-1.0 one, it is the same one under a different numbering.

## Breaking changes arrive with a codemod — `codemod-required`

Every breaking change ships a migration in the `ng update` collection
([`req-release-ng-add`](requirements/release.md#req-release-ng-add)). Upgrading is:

```bash
ng update @pacit/components
```

and the machine does the rename, not the reader of a CHANGELOG. The collection has shipped
empty since the first version deliberately — `ng update` reads it from the version
**installed** at the consumer, so a collection added at the first breaking change would not
reach anybody who installed the release before it.

Point 4 is what ties the two together: a `feat!:` commit (or a `BREAKING CHANGE:` trailer)
after the last release tag obliges an entry in the collection for a version above the last
released one. One entry may cover several breaking changes of the same release — `ng update`
runs migrations by version, not by commit.

**Until the first release this point measures nothing, and says so on every run.** There is
no installed version to migrate from, so a breaking change before the first tag owes no
codemod. The obligation begins with the first tag, and the gate begins enforcing it at the
same second — nothing has to be remembered or switched on.

## What this policy does not promise

- **No backports** while `support-months` is 0, as above.
- **No support for an Angular version outside the peer range.** It may work; nothing measures
  it, so nothing is promised.
- **The two-minor wait is not measured.** Point 5 sees that a deprecation named its version;
  no gate sees that a removal waited. Closing that needs a record of the public surface at
  each released version — `parts.snapshot.md` is that shape of record for CSS parts, and the
  API has no equivalent yet.
- **A codemod is not a guarantee of a silent upgrade.** A migration rewrites what can be
  rewritten mechanically; a change of behaviour cannot be, and those are named in the
  CHANGELOG entry for the release.
- **Nothing here is a service-level agreement.** It is a published policy under an MIT
  licence ([decision 0015](decisions/0015-license-and-model.md)), with no warranty and no
  response time.

## Where the numbers are enforced

`tools/check-support.mjs`, five points: the rows above are declared and well-formed (1), the
Angular window equals the one the manifest admits (2), every migration entry is whole and its
factory has a file (3), a breaking change since the last release has a codemod (4), and every
`@deprecated` names the version it started in (5). Its negative control is
[`tools/check-support.fixtures/`](../tools/check-support.fixtures/README.md) — fifteen
prepared inputs, each of which must be rejected by the point it declares.
