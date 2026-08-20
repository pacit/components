# Negative control of the styles gate

Deliberately defective inputs. `tools/check-styles.mjs` runs all nine of its checks on each
of them and **requires every one to be rejected — and rejected by the point it declares**.
An input that passes is a fault; an input that fires for a reason other than the one
written in its `fixture.json` is a fault just the same, because it proves something other
than what it declares.

The reason it exists is the same as for every other gate in this repository
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
Here that is particularly literal, because both guarded promises break in silence: a sheet
with `padding-left` looks faultless in every LTR screenshot, that is, in every one the
repository takes, `opacity: 0.6` on a text layer looks faultless always and takes
[`req-token-contrast`](../../docs/requirements/tokens.md#req-token-contrast) back to the
state before [`lesson-6`](../../docs/lessons.md#lesson-6), and a forced-colors rule that
loses on specificity looks faultless in the two browsers that substitute the colours
themselves — that is, in the two the screenshots are taken in
([`lesson-70`](../../docs/lessons.md#lesson-70)) — and a `150ms` written by hand looks
faultless to everybody, including the gate that measures the motion axis, because the axis
it measures is still right and this component simply no longer reads it.

## How a case is built

A case is not a fifteenth copy of the correct input with one thing broken. The gate
builds it from two layers:

1. `_reference/` — the reference input: two components with their sheets, one of them
   carrying a justified exception and each of them a block of forced-colors mode written
   the way point 7 asks for,
2. the case directory's files, copied **onto a copy of the reference**, plus the removals
   from `drop` in `fixture.json`.

That way the case directory holds **nothing but the defect** — it is visible without
comparing files — and does not drift from the reference when the shape of the input
changes.

**The reference input must pass.** This is not a check for good measure: were the
reference itself defective, every case would fire because of it rather than because of its
own defect, and every "rejected" would be false. Verified by a run — a `margin-left` added
to the reference `button.scss` moved `partial-opacity` and `opacity-from-variable` onto
somebody else's point at once.

It carries one thing besides: `field.scss` has a forced-colors block **written out state by
state**, and that is the only place the exemption in point 7 is measured. A case directory
proves a check FIRES; that the check stays silent where a sheet does say what the more
specific state is to be has nowhere else to be shown. Removing the second rule from that
block does make the reference fail — which is how it was verified.

The component sources sit here as `*.ts.txt` and become `*.ts` only at assembly, in a
temporary directory outside the repository. The reason is hard and was written down
earlier in [`tsconfig.root.json`](../../tsconfig.root.json): a `.ts` file in `tools/`
belongs to no compiler program, so it would fire `check-typecheck`. One gate's fixture may
not be another's defect — the same class of problem as the fake `package.json` in
[`check-package.fixtures`](../check-package.fixtures/README.md).

## The cases

| directory                                                            | what it breaks                                                  | point |
| -------------------------------------------------------------------- | --------------------------------------------------------------- | ----- |
| [`no-sheets`](no-sheets)                                             | not one sheet to examine                                        | 1     |
| [`style-via-mixin`](style-via-mixin)                                 | `padding-left` composed by interpolation, invisible in the text | 2     |
| [`no-components`](no-components)                                     | not one `@Component` — zero equal to zero                       | 3     |
| [`decorator-past-parser`](decorator-past-parser)                     | a decorator past the parser's anchor                            | 3     |
| [`style-in-decorator`](style-in-decorator)                           | `styles: [...]` instead of a sheet                              | 3     |
| [`sheet-outside-project`](sheet-outside-project)                     | a `styleUrl` at a sheet outside the list                        | 3     |
| [`exception-without-justification`](exception-without-justification) | an exception marker with no reason                              | 4     |
| [`exception-without-use`](exception-without-use)                     | the marker names a property other than the one under it         | 4     |
| [`physical-padding`](physical-padding)                               | `padding-left`                                                  | 5     |
| [`physical-text-align`](physical-text-align)                         | `text-align: left` — a physical VALUE, not a name               | 5     |
| [`partial-opacity`](partial-opacity)                                 | `opacity: 0.6` on a state                                       | 6     |
| [`opacity-from-variable`](opacity-from-variable)                     | `opacity: var(...)` — an undecidable value                      | 6     |
| [`forced-colors-outranked`](forced-colors-outranked)                 | a rule of forced-colors mode shorter than the base rule's       | 7     |
| [`paint-inside-an-icon`](paint-inside-an-icon)                       | `stroke` on the drawing a consumer may replace                  | 8     |
| [`duration-literal`](duration-literal)                               | `transition: … 150ms` — a component keeping its own time        | 9     |
| [`motion-query-in-a-sheet`](motion-query-in-a-sheet)                 | a sheet answering `prefers-reduced-motion` a second time        | 9     |

Point 3 has four cases, because there are four different routes by which a component
disappears from the measurement: it is not in the file list, the parser does not see it,
it is styled outside a sheet, or it points at a sheet the gate does not read. Each ends
the run green and each leaves a repository that looks sensible.

## Points 1–3 are the denominator, not a formality

The rules are in points 5–7; points 1–3 guard the set those rules work over. The same
mechanism that has shrunk the sample of files in a coverage report, the set of
measured components and the set of projects — here it is the set of
declarations that shrinks.

Two of those cases are not hypotheses. `no-components` exists because the gate **passed**
on it: a git pathspec is not a shell glob, the pattern returned an empty source list, and
the comparison "recognised N of M" is blind to zero. `decorator-past-parser` exists
because the decorator counter repeated the parser's anchor character for character — a
shift of one space put out both sides of the comparison at once. Both are described by
[`lesson-48`](../../docs/lessons.md#lesson-48); the second sat in `check-zoneless` too and
was fixed together with this one.

## Adding a new check to the gate

A new check in `check-styles.mjs` comes **together with the case** that fires it, and with
an identifier that tells you it was this check that fired. A check with no case is exactly
what [`req-axis`](../../docs/00-axis.md) forbids: a promise with no machine able to fire
on it, only one floor up.
