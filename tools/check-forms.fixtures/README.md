# Negative control of the form-control contract gate

Deliberately defective inputs. `tools/check-forms.mjs` runs all four of its points on each of
them and **requires every one to be rejected — and rejected by the point AND the rule it
declares**. An input that passes is a fault; an input that fires for a reason other than the
one written in its `fixture.json` is a fault just the same, because it proves something other
than what it declares ([`lesson-50`](../../docs/lessons.md#lesson-50): point 1 alone carries
five rules).

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.** And
here the promise it guards is one that the compiler is no help with at all: in
`FormUiControl` **every member is optional**, so a control missing `touched`, or declaring
`invalid` without `booleanAttribute`, compiles, satisfies `implements FormValueControl` and
passes every test that control already has.

## How a case is built

A case is not a copy of the correct input with one thing broken. The gate builds it from
four layers:

1. `_reference/` — the reference input: the block policy (`libs/components/forms.policy.json`)
   and two controls, one carrying the block itself and one standing on a base,
2. the case directory's files, copied **onto a copy of the reference**, plus the removals from
   `drop` in `fixture.json`,
3. the dependency's declarations — `node_modules/@angular/forms/types/signals.d.ts`, copied
   from the repository so the reference re-probes the REAL contract exactly as the live run
   does, or the text a case writes in its `contract` field (`null` for none). A
   `node_modules` path is nothing git would track, which is why a doctored contract lives in
   the descriptor rather than as a file,
4. the rename: the sources sit here as `*.ts.txt` and become `*.ts` only at assembly, in a
   temporary directory outside the repository. A `.ts` file in `tools/` belongs to no
   compiler program, so it would fire `check-typecheck` — **one gate's fixture may not be
   another's defect**.

That way the case directory holds **nothing but the defect**, and does not drift from the
reference when the shape of the input changes.

**The reference input must pass.** Were the reference itself defective, every case would fire
because of it rather than because of its own, and every "rejected" would be false.

## The cases

| directory                       | point | check         | rule                   | defect                                                                    |
| ------------------------------- | ----: | ------------- | ---------------------- | ------------------------------------------------------------------------- |
| `policy-removed`                |     1 | `denominator` | `no-policy`            | no block declared, so the members are whatever a file has                 |
| `sources-without-a-class`       |     1 | `denominator` | `no-classes`           | sources that parse to no class at all                                     |
| `member-adrift`                 |     1 | `denominator` | `unattributed`         | a member declaration above every class header                             |
| `contract-unreadable`           |     1 | `denominator` | `no-contract`          | the dependency's declarations missing                                     |
| `no-controls`                   |     1 | `denominator` | `no-controls`          | classes and members, and not one form control                             |
| `block-outside-the-contract`    |     2 | `contract`    | `outside-the-contract` | the block names a member `FormUiControl` does not carry                   |
| `member-missing`                |     3 | `block`       | `member-missing`       | a control with no `touched`                                               |
| `control-behind-a-namesake`     |     3 | `block`       | `member-missing`       | a control without its block, beside a class of its name that is none      |
| `base-named-like-another-class` |     3 | `block`       | `member-missing`       | a base of the reference base's name, from another file, declaring nothing |
| `transform-dropped`             |     4 | `shape`       | `shape-drift`          | `invalid` declared without `booleanAttribute`                             |

`transform-dropped` is the case this gate was written for, and it is worth reading beside
`member-missing`: they are the two halves of one promise and they break independently. A
member that is not there is a control that never learns a state; a member declared the wrong
way is worse, because it IS there — `<pct-widget invalid>` passes the string `''`, which is
falsy, so the control is valid for ever and the template that says otherwise is right in
front of the consumer.

Point 1's five rules are five different ways for the gate to be measuring nothing, and each
has a case of its own because each arrives from a different direction: the policy deleted,
the sources moved, the reading's anchor outgrown, the dependency's declarations gone, the
contract stopped being implemented. A gate that reports success over an empty set is the
failure mode this whole tree exists against ([`lesson-33`](../../docs/lessons.md#lesson-33)).

`control-behind-a-namesake` and `base-named-like-another-class` hold what a name stands for.
TypeScript compiles two classes of one name in two files, and binds a base's name in the file
that writes it, through its declaration or its import. Read by the name alone, the first case
lost a control behind a namesake that is no control, and the second handed a control the
block of a namesake it does not extend. Both passed, and both are refused here.

## What the reference carries beyond the defects

`_reference` holds **two** controls and not one, and the second is the exemption this gate
would be wrong without: `PctKnob` declares the form contract and not one member of the block,
which all stand on `PctKnobBase` behind it. That is the shape `pct-select` and
`pct-multi-select` really have — two tags over one abstract class — and it is code the
negative control has to walk. Measured: with the base read out of the reading, the reference
itself fires `member-missing` on all four members of its block, and so does the repository on
sixteen.

`shapes.ts` carries two things no other input does: a namespace import and a class with no name.
Neither binds a name an `extends` can follow, and the reading every gate that follows `extends`
shares (`tools/class-bases.mjs`) has to walk past both; without its guards it stopped on either
(measured: `bound.elements is not iterable`, and `reading 'text'`).

The reference's block is four members where the repository's is eight, and its policy says
why: a name in the policy that no control declares would make the reference fire point 3 on
itself. The same law as the token gate's dictionary — a reference input carries what it uses
and nothing "just in case".
