# Negative control of the form-control contract gate

Deliberately defective inputs. `tools/check-forms.mjs` runs all four of its points on each of
them and **requires every one to be rejected — and rejected by the point AND the rule it
declares**. An input that passes is a fault; an input that fires for a reason other than the
one written in its `fixture.json` is a fault just the same, because it proves something other
than what it declares ([`lesson-50`](../../docs/lessons.md#lesson-50): point 1 alone carries
six rules).

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
something else is a fault as well. `control-anonymous` and `control-exported-as-the-default`
hold the place and the name of the control they refuse, `header-in-a-comment` the header's,
`transform-dropped`, `member-overridden` and `member-past-a-semicolon` the line of a member, the
last two its text as the refusal prints it, the member cases at point 3 the class and the
member and where a declaration under its name that is no member stands, or for `member-static`
that the line ends there, and
`checkbox-member-missing` and the three cases of a base this reading has not got the whole list
of where a chain stopped — nothing for a control with no base, one line for two tags
over one base, none for a control that lacks nothing, two lines in order for two bases, and the
lead-in on its own line after the last missing member — with what each base stands for.

## The cases

| directory                                  | point | check         | rule                   | defect                                                                    |
| ------------------------------------------ | ----: | ------------- | ---------------------- | ------------------------------------------------------------------------- |
| `policy-removed`                           |     1 | `denominator` | `no-policy`            | no block declared, so the members are whatever a file has                 |
| `sources-without-a-class`                  |     1 | `denominator` | `no-classes`           | sources the reading finds no class in                                     |
| `header-in-a-comment`                      |     1 | `denominator` | `header-without-class` | a class header in a comment                                               |
| `header-in-a-comment-beside-its-namesake`  |     1 | `denominator` | `header-without-class` | the same, beside the control of its name, which it took the place of      |
| `control-in-a-namespace-at-the-margin`     |     1 | `denominator` | `header-without-class` | a namespace's control left at the margin, its header read                 |
| `control-unexported`                       |     1 | `denominator` | `control-unread`       | a control declared without `export`, its members handed to the one above  |
| `control-nested`                           |     1 | `denominator` | `control-unread`       | a control declared inside a function, indented                            |
| `control-nested-beside-its-namesake`       |     1 | `denominator` | `control-unread`       | the same under the name of the control a header stands at in the file     |
| `control-anonymous`                        |     1 | `denominator` | `control-unread`       | a control written as a class expression                                   |
| `control-exported-as-the-default`          |     1 | `denominator` | `control-unread`       | a control exported as the default, with no name, refused where it starts  |
| `control-in-a-namespace`                   |     1 | `denominator` | `control-unread`       | a control exported from a namespace, indented                             |
| `control-in-a-method`                      |     1 | `denominator` | `control-unread`       | a control declared inside a static method of a class that is none         |
| `every-control-unread`                     |     1 | `denominator` | `control-unread`       | the library's one control nested, refused before `no-controls`            |
| `contract-unreadable`                      |     1 | `denominator` | `no-contract`          | the dependency's declarations missing                                     |
| `no-controls`                              |     1 | `denominator` | `no-controls`          | classes and members, and not one form control                             |
| `block-outside-the-contract`               |     2 | `contract`    | `outside-the-contract` | the block names a member `FormUiControl` does not carry                   |
| `member-missing`                           |     3 | `block`       | `member-missing`       | a control with no `touched`                                               |
| `control-behind-a-namesake`                |     3 | `block`       | `member-missing`       | a control without its block, beside a class of its name that is none      |
| `member-lent-by-a-class-without-a-header`  |     3 | `block`       | `member-missing`       | a control with no `disabled`, below it an unexported class that has one   |
| `member-in-a-comment`                      |     3 | `block`       | `member-missing`       | a control's `touched` retired into a comment inside its body              |
| `member-static`                            |     3 | `block`       | `member-missing`       | a control's `touched` declared `static`, which no form binds              |
| `member-as-a-parameter-property`           |     3 | `block`       | `member-missing`       | a control's `touched` a parameter property of its constructor             |
| `member-under-a-computed-name`             |     3 | `block`       | `member-missing`       | a control's `touched` under a computed name, which Angular reads as none  |
| `member-without-readonly`                  |     3 | `block`       | `member-missing`       | a control's `touched` written without `readonly`                          |
| `member-overridden-without-readonly`       |     3 | `block`       | `member-missing`       | a leaf's override of `invalid` through `Boolean`, without `readonly`      |
| `member-overridden-under-a-computed-name`  |     3 | `block`       | `member-missing`       | the same under `['invalid']`, which hides the base's member as well       |
| `checkbox-member-missing`                  |     3 | `block`       | `member-missing`       | a control of `FormCheckboxControl` with no `touched`                      |
| `contract-under-another-name`              |     3 | `block`       | `member-missing`       | the same of `FormValueControl`, imported under another name               |
| `contract-through-a-namespace`             |     3 | `block`       | `member-missing`       | the same, named through a namespace import                                |
| `contract-after-another`                   |     3 | `block`       | `member-missing`       | the same, the contract second in the `implements` clause                  |
| `contract-inside-another-type`             |     3 | `block`       | `member-missing`       | the same, the contract a type argument of `Readonly<…>`                   |
| `contract-deep-inside-another-type`        |     3 | `block`       | `member-missing`       | the same, two types down inside an intersection                           |
| `contract-through-an-import-type`          |     3 | `block`       | `member-missing`       | the same, named by an import type                                         |
| `contract-through-a-qualified-import-type` |     3 | `block`       | `member-missing`       | the same, an import type followed by three names, a comment between       |
| `base-named-like-another-class`            |     3 | `block`       | `member-missing`       | a base of the reference base's name, from another file, declaring nothing |
| `base-without-a-header`                    |     3 | `block`       | `member-missing`       | the block on an unexported root, the refusal naming where the chain stops |
| `base-from-a-package`                      |     3 | `block`       | `member-missing`       | two controls over a package's class and a mixin, two stop lines in order  |
| `base-from-an-expression`                  |     3 | `block`       | `member-missing`       | a control over a mixin's result, the base followed to no class            |
| `transform-dropped`                        |     4 | `shape`       | `shape-drift`          | `invalid` declared without `booleanAttribute`                             |
| `member-overridden`                        |     4 | `shape`       | `shape-drift`          | a leaf's `override` of `invalid`, with `Boolean` for `booleanAttribute`   |
| `member-past-a-semicolon`                  |     4 | `shape`       | `shape-drift`          | two `invalid`s alike up to a transform's first `;`, one with an `alias`   |

`transform-dropped` is the case this gate was written for, and it is worth reading beside
`member-missing`: they are the two halves of one promise and they break independently. A
member that is not there is a control that never learns a state; a member declared the wrong
way is worse, because it IS there — `<pct-widget invalid>` passes the string `''`, which is
falsy, so the control is valid for ever and the template that says otherwise is right in
front of the consumer.

Point 1's six rules are six different ways for the gate to be measuring nothing, and each has a
case of its own because each arrives from a different direction: the policy deleted, the
sources moved, a class header the parser holds no class for, a control the parser holds and the
reading has no header for, the dependency's declarations gone, the contract stopped being
implemented. A gate that reports success over an empty set is the failure mode this whole tree
exists against ([`lesson-33`](../../docs/lessons.md#lesson-33)).

`header-without-class` and `control-unread` are the two directions of one pairing: the
pattern's headers against the classes the TypeScript parser holds, by the offset a class's name
stands at. The first refuses a header with no class behind it; the second a control with no
header in front of it. The pattern reads `export class` at the margin, and a control declared
otherwise is legal TypeScript: without `export`, exported as the default, inside a function, a
namespace or a method, as a class expression. On main, five of those inputs passed,
`control-unexported` with its members handed by position to the control above it, which
declares them all the same way, and `control-anonymous` and `control-exported-as-the-default`
were refused on their members rather than as controls (measured). The parser's list is read at
every depth — a function's body, a namespace's, a method's, a variable's initializer — and
paired by where the name stands, so a control nested under the name of one a header stands at
is not taken for it.

The order holds what each message says. A header standing at a control the parser holds below
the top level is the header's fault, so `header-without-class` comes first:
`control-in-a-namespace-at-the-margin` would otherwise be told the reading reads no header for a
control it has one for. A control with no header is refused before `no-controls`, which would
tell `every-control-unread` that not one class implements a contract. `no-policy` and
`no-classes` come before it and can name an input of theirs first that also has a control with
no header, and `no-contract` comes after it: on an input with both, either message is true, the
verdict is the same, and which one is named is not held by a case.

Members need no rule of their own: they are the parser's, each the class's whose name a header
stands at. A line in a comment is no member, and a member of a class no header stands at
is that class's: a class no point measures, because it is no control this reading recognises or
point 1 has refused it, or a base, which hands down nothing — point 3 then refuses the control
and names the base its chain stopped at (`base-without-a-header`), and never passes it. A class
implementing a contract through another name of the sources is no control here, a header
standing at it or not, which is the limit below. By position, the last header above it, a class
with no header lent what it declares at two spaces to the control above it, and a line in a
comment at a member's indentation was a member: `member-lent-by-a-class-without-a-header` and
`member-in-a-comment` both passed on main (measured). The rule that refused a member the reading
could not place, `unattributed`, is gone with the reading by position, and with it the case of a
member above every class, which the parser holds as none.

What a member is, is the parser's as well: a property declaration written `readonly` and with an
initializer, whatever else it is written with, and what point 4 compares is the initializer's
tokens — the whitespace and the comments between them aside, and a comma that only closes a list
dropped, which prettier writes where it wraps one. Read by a pattern at the margin — two spaces,
`readonly`, a name, an equals sign and everything up to the first line ending in `;` —
`member-overridden` and `member-past-a-semicolon` both passed main's gate, built on main's
reference (measured). The first is the `override readonly` that `noImplicitOverride` demands of a
leaf redeclaring its base's member, which was no member, so the base's declaration was compared in
its place; `override readonly invalid = input(false)` does not compile over a base with
`booleanAttribute` (TS2416), so the case writes `transform: Boolean`, which compiles and reads
`''` false, with a decorator on the line above, so that the line the refusal names is the name's.
The second is two transforms written with a block body, cut at their first statement, before the
`alias` that tells them apart.

What else a class declares under a name is no member, and in a leaf it hides its base's:
TypeScript types the property by the leaf's declaration, and the field written at run time is the
leaf's. `member-overridden-without-readonly` and `member-overridden-under-a-computed-name` are the
defect of `member-overridden` written without `readonly` and under `['invalid']`; ngc compiles
both, and both passed main's gate and the first reading of this one, which read them as nothing
and let the base's member stand (measured). Four more cases hold what is no member on a control
with no base: a parameter property, on which ngc refuses `input()` (NG8110); a computed name, a
template literal there, for which Angular reflects no name (NG8002 on a binding); a member written
without `readonly`, which Angular takes and this library's rule does not; and `static`, which
declares no property of an instance — ngc refuses an input so declared (NG1100) — and so is named
nowhere in the refusal. The pattern refused all four as well. `declare` declares nothing: it says
the type of a property the class has anyway, which is how a leaf narrows its base's member, and
the reference's knob carries one.

Which class is a control is the parser's too, off the class's own `implements` clause, and eight
cases at point 3 hold that reading: a contract is either of the two names, at any position of the
clause or at any depth within a type of it, through a named import under another name, as the last
part of a qualified name, or as the last part of an import type's qualifier, read off the parser's
names, not off the qualifier's text, in which a comment can stand. `contract-under-another-name`
passed on main, whose pattern over the header found no contract's name in
`implements PctValueContract<number>`; `contract-inside-another-type` and
`contract-through-an-import-type` passed on an earlier reading of this one, of the clause's own
types, and `contract-through-a-qualified-import-type` on one of the qualifier's text (measured). A
contract wrapped in a type of the clause makes a control, which errs toward measuring a class, never
toward leaving one out. What the clause reaches through another name of the sources — a type alias,
an interface extending a contract, a base that implements one — is not read, which is said in the
gate and not held by a case.

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

`shapes.ts` carries three shapes that bind no name an `extends` can follow: a namespace import,
an import that binds nothing (`import '@angular/localize/init'`) and a class with no name. The
reading every gate that follows `extends` shares (`tools/class-bases.mjs`) has to walk past all
three; without its guards it stopped on each (measured: `bound.elements is not iterable`,
`reading 'namedBindings'`, and `reading 'text'`). The reading of what a class implements walks
the same imports, and stops on the two imports without its own guards (measured).

`lookalike.ts` holds four classes that are no control and carry none of the block. Three are
refused by point 3 under a reading that took them for one (measured): `PctLookalike` implements an
interface the file declares under a contract's name, which TypeScript binds there in the
contract's place, and is a control to a reading by the name alone; `PctLegacyDial` extends a
class of the sources under a contract's name (`legacy.ts`), imported under another, and is one to
a reading of `extends` as well as `implements`; `PctPlain` implements an imported interface that
is neither contract, and is one to a reading taking any name a named import binds.
`PctModuleShaped` implements `Partial<typeof import('@angular/core')>`, an import type with no
qualifier, which names no contract, and stops a reading that takes every import type to have one
(measured: `reading 'kind'`).

`PctWidget` writes three members of the block in shapes the pattern at the margin did not read,
and the reference passing is the proof that they are read: `disabled` under a name in quotes,
which Angular reflects as `disabled`; `touched` with a type before `=`, wrapped as prettier wraps
it — with the comma it writes after the last property — and a JSDoc comment inside, compared equal
to the knob's one-line declaration; and `errors` broken after `=`. Measured: under the pattern,
the reference itself fires `member-missing` on all three, and compared as text, `touched` drifts
from the knob's. `PctKnob` says the type of its base's `touched` again with `declare`, which hides
nothing.

The reference's block is four members where the repository's is eight, and its policy says
why: a name in the policy that no control declares would make the reference fire point 3 on
itself. The same law as the token gate's dictionary — a reference input carries what it uses
and nothing "just in case".
