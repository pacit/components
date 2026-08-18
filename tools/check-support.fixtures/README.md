# Negative control of the support gate

Deliberately defective inputs. `tools/check-support.mjs` runs all five of its points on each
of them and **requires every one to be rejected — and rejected by the point it declares**. An
input that passes is a fault; an input that fires for a reason other than the one written in
its file is a fault just the same, because it proves something other than what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate that rule bites harder than usual. Four of its five points measure a document,
and a document is the one input that always looks fine: a row that lost its number still
reads like a policy, and a support window that drifted from the manifest reads like a support
window. [`breaking-change-without-a-migration.json`](breaking-change-without-a-migration.json)
is the state the repository was actually in before this gate existed — the `ng update`
collection had shipped since the first commit, and nothing obliged a breaking change to add
to it.

## How a case is built

A case is not a sixteenth copy of the correct input with one thing broken. The gate builds it
from two layers:

1. [`_reference.json`](_reference.json) — the reference input: the policy rows, the peer
   ranges, the migration collection, the last released version, the breaking commits since
   it, the deprecations,
2. the operations from the case file, applied to a copy of it (`dropPolicy`, `dropRows`,
   `policy`, `peers`, `dropPeers`, `dropCollection`, `migrations`, `released`, `breaking`,
   `deprecations`).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the shape of the input changes.

**The reference input must pass.** Were it defective itself, every case would fire because of
it rather than because of its own defect, and every "rejected" would be false — that is, this
whole negative control would become exactly what it stands against.

The reference describes a **released** library, and deliberately: before the first tag point 4
measures nothing, so a reference in today's actual state would leave the tie the whole gate
exists for untested by every case built on it.

The input is **data, not a directory on disk**: the gate examines the decision, not the
reading of files. The plumbing defends itself — a broken reader takes a row, a peer range or
the collection with it, and point 1, 2 or 3 fires on the real run at once. The recorded proof
that the two halves are wired together is in the task position (B6) of
[`plan.md`](../../docs/plan.md): the real run, with `angular-majors` moved to 2, fires point 2.

## The cases

| file                                                                                             | what it breaks                                             | point |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ----- |
| [`no-policy-document.json`](no-policy-document.json)                                             | the policy document is gone                                | 1     |
| [`policy-without-a-row.json`](policy-without-a-row.json)                                         | the table lost a row                                       | 1     |
| [`a-number-that-is-a-sentence.json`](a-number-that-is-a-sentence.json)                           | a row answers with circumstances instead of a number       | 1     |
| [`window-wider-than-the-manifest.json`](window-wider-than-the-manifest.json)                     | the policy promises more Angular majors than npm will take | 2     |
| [`window-narrower-than-the-manifest.json`](window-narrower-than-the-manifest.json)               | the manifest admits a major the policy does not claim      | 2     |
| [`peers-that-disagree-on-the-major.json`](peers-that-disagree-on-the-major.json)                 | `@angular/cdk` a major behind `@angular/core`              | 2     |
| [`a-range-the-gate-will-not-guess-at.json`](a-range-the-gate-will-not-guess-at.json)             | a comparator range instead of a caret                      | 2     |
| [`collection-with-no-schematics-object.json`](collection-with-no-schematics-object.json)         | `migration.json` declares no `schematics`                  | 3     |
| [`migration-without-a-version.json`](migration-without-a-version.json)                           | an entry `ng update` can never select                      | 3     |
| [`migration-with-no-description.json`](migration-with-no-description.json)                       | an entry that rewrites source and says nothing             | 3     |
| [`migration-factory-with-no-file.json`](migration-factory-with-no-file.json)                     | the factory names a file that is not there                 | 3     |
| [`breaking-change-without-a-migration.json`](breaking-change-without-a-migration.json)           | a `feat!:` since the last tag, empty collection            | 4     |
| [`migration-left-from-the-previous-release.json`](migration-left-from-the-previous-release.json) | entries exist, all older than the last release             | 4     |
| [`codemod-obligation-switched-off.json`](codemod-obligation-switched-off.json)                   | the policy row that drives point 4 set to `no`             | 4     |
| [`deprecation-without-a-version.json`](deprecation-without-a-version.json)                       | a `@deprecated` tag with no `since`                        | 5     |

Point 2 has four cases because a window can drift in four directions and three of them look
like an improvement: widening the promise, widening the manifest, and letting one `@angular/*`
package lag. The fourth is the parser refusing to guess — the case that keeps the other three
honest, since a range read wrongly is a window nobody declared.

Point 4 has three because there are three ways to stop owing a codemod: not writing one,
counting an old one, and turning the obligation off in the document. Each leaves a repository
that looks tidy and each ends the run green.

## What no case here can prove

That the **wait** happened. Point 5 sees that a deprecation named the version it started in;
nothing sees that the removal came two minors later, because that needs a record of the public
API as it stood at each release and no such record exists
([`docs/support.md`](../../docs/support.md), "What this policy does not promise").

## Adding a new point to the gate

A new point in `check-support.mjs` comes **together with the case** that fires it, and with an
identifier that tells you it was this point that fired. A point with no case is exactly what
[`req-axis`](../../docs/00-axis.md) forbids: a promise with no machine able to fire on it,
only one floor up.
