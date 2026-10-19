# Negative control of the form-control contract gate

Deliberately defective inputs. `tools/check-forms.mjs` runs all four of its points on each of
them and **requires every one to be rejected — and rejected by the point AND the rule it
declares**. An input that passes is a fault; an input that fires for a reason other than the
one written in its `fixture.json` is a fault just the same, because it proves something other
than what it declares ([`lesson-50`](../../docs/lessons.md#lesson-50): point 1 alone carries
seven rules).

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

A case may also carry `message`, a phrase the refusal has to contain: a rule that names what it
found — the file, the line, the class — says it in the message, and the right rule saying
something else is a fault as well. `control-anonymous` holds the place and the name of the
control it refuses, `member-lent-by-a-class-without-a-header` the line of the member.

## The cases

| directory                                 | point | check         | rule                   | defect                                                                    |
| ----------------------------------------- | ----: | ------------- | ---------------------- | ------------------------------------------------------------------------- |
| `policy-removed`                          |     1 | `denominator` | `no-policy`            | no block declared, so the members are whatever a file has                 |
| `sources-without-a-class`                 |     1 | `denominator` | `no-classes`           | sources the reading finds no class in                                     |
| `member-adrift`                           |     1 | `denominator` | `unattributed`         | a member declaration above every class header                             |
| `member-lent-by-a-class-without-a-header` |     1 | `denominator` | `unattributed`         | a member of an unexported class below a control that lacks it             |
| `member-in-a-comment`                     |     1 | `denominator` | `unattributed`         | a control's `touched` retired into a comment inside its body              |
| `header-in-a-comment`                     |     1 | `denominator` | `header-without-class` | a class header in a comment                                               |
| `header-in-a-comment-beside-its-namesake` |     1 | `denominator` | `header-without-class` | the same, beside the control of its name, which it took the place of      |
| `control-in-a-namespace-at-the-margin`    |     1 | `denominator` | `header-without-class` | a namespace's control left at the margin, its header read                 |
| `control-unexported`                      |     1 | `denominator` | `control-unread`       | a control declared without `export`, its members handed to the one above  |
| `control-nested`                          |     1 | `denominator` | `control-unread`       | a control declared inside a function, indented                            |
| `control-nested-beside-its-namesake`      |     1 | `denominator` | `control-unread`       | the same under the name of the control a header stands at in the file     |
| `control-anonymous`                       |     1 | `denominator` | `control-unread`       | a control written as a class expression, refused before its members are   |
| `control-in-a-namespace`                  |     1 | `denominator` | `control-unread`       | a control exported from a namespace, indented                             |
| `control-in-a-method`                     |     1 | `denominator` | `control-unread`       | a control declared inside a static method of a class that is none         |
| `contract-unreadable`                     |     1 | `denominator` | `no-contract`          | the dependency's declarations missing                                     |
| `no-controls`                             |     1 | `denominator` | `no-controls`          | classes and members, and not one form control                             |
| `block-outside-the-contract`              |     2 | `contract`    | `outside-the-contract` | the block names a member `FormUiControl` does not carry                   |
| `member-missing`                          |     3 | `block`       | `member-missing`       | a control with no `touched`                                               |
| `control-behind-a-namesake`               |     3 | `block`       | `member-missing`       | a control without its block, beside a class of its name that is none      |
| `checkbox-member-missing`                 |     3 | `block`       | `member-missing`       | a control of `FormCheckboxControl` with no `touched`                      |
| `contract-under-another-name`             |     3 | `block`       | `member-missing`       | the same of `FormValueControl`, imported under another name               |
| `contract-through-a-namespace`            |     3 | `block`       | `member-missing`       | the same, named through a namespace import                                |
| `contract-after-another`                  |     3 | `block`       | `member-missing`       | the same, the contract second in the `implements` clause                  |
| `base-named-like-another-class`           |     3 | `block`       | `member-missing`       | a base of the reference base's name, from another file, declaring nothing |
| `transform-dropped`                       |     4 | `shape`       | `shape-drift`          | `invalid` declared without `booleanAttribute`                             |

`transform-dropped` is the case this gate was written for, and it is worth reading beside
`member-missing`: they are the two halves of one promise and they break independently. A
member that is not there is a control that never learns a state; a member declared the wrong
way is worse, because it IS there — `<pct-widget invalid>` passes the string `''`, which is
falsy, so the control is valid for ever and the template that says otherwise is right in
front of the consumer.

Point 1's seven rules are seven different ways for the gate to be measuring nothing, and each
has a case of its own because each arrives from a different direction: the policy deleted,
the sources moved, a class header the parser holds no class for, a control the parser holds
and the reading has no header for, a member the parser holds in no class the reading has, the
dependency's declarations gone, the contract stopped being implemented. A gate that reports success over an empty set is
the failure mode this whole tree exists against
([`lesson-33`](../../docs/lessons.md#lesson-33)).

`header-without-class` and `control-unread` are the two directions of one pairing: the
pattern's headers against the classes the TypeScript parser holds, by the offset a class's name
stands at. The first refuses a header with no class behind it; the second a control with no
header in front of it. The pattern reads `export class` at the margin, and a control declared
otherwise is legal TypeScript: without `export`, inside a function, a namespace or a method, as
a class expression. Each of `control-unexported`, `control-nested` and
`control-nested-beside-its-namesake` passed before the rule, the first with its members handed
by position to the control above it, which declares them all the same way; `control-anonymous`
fired, and on its members rather than on the class they are missing from, so the rule comes
before `unattributed`. The parser's list is read at every depth — a function's body, a
namespace's, a method's, a variable's initializer — and paired by where the name stands, so a
control nested under the name of one a header stands at is not taken for it. A header of the
pattern standing at a control's name the parser holds below the top level is the header's fault,
`header-without-class`, which comes first: `control-in-a-namespace-at-the-margin` would
otherwise be told the reading reads no header for a control it has one for. The rules above
both, `no-policy` and `no-classes`, can name an input of theirs first that also has a control
with no header: the verdict is the same, another refusal named.

`unattributed` is the same pairing for members. The pattern finds a member's declaration, and
the parser says whose it is: the property whose name stands there, of the class whose name a
header stands at. By position, the last header above it, a class with no header lent what it
declares at two spaces to the control above it, and a line in a comment at a member's
indentation was a member: `member-lent-by-a-class-without-a-header` and `member-in-a-comment`
both passed (measured).

Which class is a control is the parser's too, off the class's own `implements` clause, and the
four cases at point 3 hold that reading: a contract is either of the two names, at any position
of the clause, through a named import under another name, or as the last part of a qualified
one. `contract-under-another-name` passed before it, because a pattern over the header found no
contract's name in `implements PctValueContract<number>`. What the clause reaches through
another name of the sources — a type alias, an interface extending a contract, a base that
implements one — is not read, which is said in the gate and not held by a case.

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

`shapes.ts` carries three things no other input does: a namespace import, an import that binds
nothing (`import '@angular/localize/init'`) and a class with no name. None binds a name an
`extends` can follow, and the reading every gate that follows `extends` shares
(`tools/class-bases.mjs`) has to walk past all three; without its guards it stopped on each
(measured: `bound.elements is not iterable`, `reading 'namedBindings'`, and `reading 'text'`).
The reading of what a class implements walks the same imports, and stops on the first two
without its own guards (measured).

`lookalike.ts` holds three classes that are no control and carry none of the block, each
refused by point 3 under a reading that took it for one (measured): `PctLookalike` implements an
interface the file declares under a contract's name, which TypeScript binds there in the
contract's place, and is a control to a reading by the name alone; `PctLegacyDial` extends a
class of the sources under a contract's name (`legacy.ts`), imported under another, and is one to
a reading of `extends` as well as `implements`; `PctPlain` implements an imported interface that
is neither contract, and is one to a reading taking any name a named import binds.

The reference's block is four members where the repository's is eight, and its policy says
why: a name in the policy that no control declares would make the reference fire point 3 on
itself. The same law as the token gate's dictionary — a reference input carries what it uses
and nothing "just in case".
