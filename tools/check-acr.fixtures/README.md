# Negative control of the conformance gate

Deliberately defective inputs, and the states of one sentence. `tools/check-acr.mjs` runs all
eight of its points on each of them: a defective input it **requires to be rejected — and
rejected by the point it declares**, and a state of the status sentence it requires to be
accepted and rendered with the sentence the case declares. An input that passes where it was
meant to fail is a fault; an input that fires for a reason other than the one written in its
file is a fault just the same, because it proves something other than what it declares; and
a rendering that puts the wrong word on the report is the fault this whole document exists
to catch.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites where the document is read by strangers. An Accessibility
Conformance Report is the one file a procurement reads without opening the code, and every
way it can lie is quiet: a criterion with no row reads as a pass, a level with no
measurement behind it reads as a measurement, a finding that closed a month ago reads as a
limit the library still has, and a screen-reader pass "recorded" with no transcript on disk
reads exactly like one that was.

## How a case is built

A case is not one more copy of the correct input with one thing broken. The gate builds
it from two layers:

1. the **live input** — the repository itself as it stands at the commit under test: the
   claims, the component cards, the library's sources, the plan, the workflow, the tracked
   files ([`_reference.json`](_reference.json) says so and records nothing, because a stored
   copy would measure the repository as it was the day somebody stored it),
2. the operations from the case file, applied to a copy of it (`criteria` — a row replaced,
   added or, with `null`, dropped; `assistiveTechnology`; `cards` — a card's row rewritten
   or, with `null`, dropped, so that a card can owe a row by not having it at all;
   `texts` and `sources` — a cited file or a library source rewritten; `dropFiles`; `plan`
   — a finding closed, dropped or absent, or **opened**, so that a case which needs an open
   finding builds its own instead of borrowing one the plan will close; `ci`; `atLogs`;
   `acts` — an act of the reader walk's table rewritten, added or, with `null`, dropped).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the repository moves.

**The live input must pass.** It is checked first, on the real run; were it defective, every
case would fire because of it rather than because of its own defect, and every "rejected"
would be false. A case examines the decision, not the drift of the file on disk: the
comparison with `docs/acr.md` is the real run's alone, and the cases run with it left out.

A case that carries a `status` is read the other way round. It is a state of the report, not
a defect, and the gate must accept it; what it examines is the rendering — the word after
`Status:` (`status.word`) and every phrase the case names (`status.says`): the rows counted,
their owners. The sentence is the one line of the report a procurement reads first, and a
rule with three branches can lie in three ways — the stronger word on a report with no
transcript behind it, a count that skips a level, an owner left unnamed — every one of them
in a single line that reads like a report. `status` in the check column is the runner's own
label for these cases and not a point's identifier: point 8's is `rendering`, and it fires on
the real run alone. Every case that counts rows leans on the live rows standing at Supports
or Not Applicable, and turns red the day one drops — a count one higher than the case names.
The two that would not are the pass-unrecorded pair, whose sentence is the same either way;
the second keeps its edge, and the first,
[`a-pass-not-on-record.json`](a-pass-not-on-record.json), would go on passing as a duplicate
of it — so
[`nothing-holds-the-report-below-supports.json`](nothing-holds-the-report-below-supports.json),
red on that day with the weaker word against the stronger one it names, is its canary, and
the two are patched together. A `null` that names no row, no card or no criterion, and a
`plan` state other than `open` on an item the plan lacks, are authoring faults reported by
the case's name; an `acts` `null` on a route the table lacks and a `dropFiles` path the
tracked set lacks are still silent, and no case uses either that way.

## The cases

| file                                                                                                                       | what it breaks — or, for a state of the status sentence, what it sets                                    | point | check       |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----- | ----------- |
| [`a-criterion-the-report-skips.json`](a-criterion-the-report-skips.json)                                                   | the row for 1.1.1 is gone — a skipped criterion reads as a pass                                          | 1     | `catalogue` |
| [`a-criterion-the-standard-does-not-have.json`](a-criterion-the-standard-does-not-have.json)                               | a row for `9.9.9` — a number that is no success criterion                                                | 1     | `catalogue` |
| [`a-word-outside-the-five.json`](a-word-outside-the-five.json)                                                             | `1.1.1` says "Meets", a word the template does not have                                                  | 2     | `level`     |
| [`supports-on-no-measurement.json`](supports-on-no-measurement.json)                                                       | `1.1.1` says Supports and cites a requirement alone                                                      | 2     | `level`     |
| [`supports-with-a-limit-attached.json`](supports-with-a-limit-attached.json)                                               | `1.1.1` says Supports and cites an open finding                                                          | 2     | `level`     |
| [`not-evaluated-with-no-owner.json`](not-evaluated-with-no-owner.json)                                                     | `1.4.4` says Not Evaluated and cites no finding                                                          | 2     | `level`     |
| [`a-point-the-gate-does-not-number.json`](a-point-the-gate-does-not-number.json)                                           | `1.1.1` cites point 42 of `check-aria`                                                                   | 3     | `evidence`  |
| [`a-case-the-spec-does-not-hold.json`](a-case-the-spec-does-not-hold.json)                                                 | `1.4.13` cites a tooltip case by a title the spec no longer has                                          | 3     | `evidence`  |
| [`a-sentence-the-source-does-not-say.json`](a-sentence-the-source-does-not-say.json)                                       | `2.5.2` quotes the field row on `click`, and the source says otherwise                                   | 3     | `evidence`  |
| [`a-decision-that-is-not-on-disk.json`](a-decision-that-is-not-on-disk.json)                                               | `2.2.1` cites decision 9999, which is not on disk                                                        | 3     | `evidence`  |
| [`a-scan-that-finds-what-it-forbids.json`](a-scan-that-finds-what-it-forbids.json)                                         | a template grows a `<video>`, and 1.2.1 still says Not Applicable                                        | 3     | `evidence`  |
| [`a-video-in-a-namespace-the-scan-forbids.json`](a-video-in-a-namespace-the-scan-forbids.json)                             | a template grows an `<xH1ml:video>`, a video `ngc` makes, and 1.2.1 still says Not Applicable            | 3     | `evidence`  |
| [`a-video-in-a-one-letter-namespace-the-scan-forbids.json`](a-video-in-a-one-letter-namespace-the-scan-forbids.json)       | a template grows an `<a:video>`, the shortest prefix, and 1.2.1 still says Not Applicable                | 3     | `evidence`  |
| [`an-audio-in-capitals-the-scan-forbids.json`](an-audio-in-capitals-the-scan-forbids.json)                                 | a template grows an `<AUDIO>`, which the DOM lowers, and 1.2.1 still says Not Applicable                 | 3     | `evidence`  |
| [`an-svg-text-in-its-namespace-the-scan-forbids.json`](an-svg-text-in-its-namespace-the-scan-forbids.json)                 | a drawing grows an `<svg:text>`, and 1.4.5 still says Not Applicable                                     | 3     | `evidence`  |
| [`a-tabindex-in-capitals-the-scan-forbids.json`](a-tabindex-in-capitals-the-scan-forbids.json)                             | a template writes `TABINDEX="4"`, which `setAttribute` lowers, and 2.4.3 still says Supports             | 3     | `evidence`  |
| [`a-tabindex-bound-as-a-property-the-scan-forbids.json`](a-tabindex-bound-as-a-property-the-scan-forbids.json)             | a template binds the property, `[tabIndex]="2"`                                                          | 3     | `evidence`  |
| [`a-tabindex-bound-as-an-attribute-the-scan-forbids.json`](a-tabindex-bound-as-an-attribute-the-scan-forbids.json)         | a template binds `[attr.tabindex]="3"`                                                                   | 3     | `evidence`  |
| [`a-tabindex-bound-to-true.json`](a-tabindex-bound-to-true.json)                                                           | a template binds `[tabindex]="true"`, which the property takes for one                                   | 3     | `evidence`  |
| [`a-tabindex-bound-with-a-plus-sign.json`](a-tabindex-bound-with-a-plus-sign.json)                                         | a template binds `[tabindex]="+1"`: a plus is no minus                                                   | 3     | `evidence`  |
| [`a-tabindex-bound-two-way.json`](a-tabindex-bound-two-way.json)                                                           | a template binds `[(tabindex)]="order"`, a value it cannot judge: refused, not passed                    | 3     | `evidence`  |
| [`a-tabindex-that-wraps-to-one.json`](a-tabindex-that-wraps-to-one.json)                                                   | a template binds `[tabindex]="-4294967295"`, which the property wraps to one                             | 3     | `evidence`  |
| [`a-positive-tabindex-written-with-a-sign-and-a-unit.json`](a-positive-tabindex-written-with-a-sign-and-a-unit.json)       | a template writes `tabindex=" +01px"`, one by HTML's integer rule                                        | 3     | `evidence`  |
| [`a-tabindex-in-the-other-branch-of-a-condition.json`](a-tabindex-in-the-other-branch-of-a-condition.json)                 | a template binds `[tabindex]="on() ? 0 : 1"`, positive in the second branch                              | 3     | `evidence`  |
| [`a-tabindex-in-an-icu-case.json`](a-tabindex-in-an-icu-case.json)                                                         | an ICU's case draws `<span tabindex="2">`, which only the HTML tree holds                                | 3     | `evidence`  |
| [`a-tabindex-in-markup-an-expression-holds.json`](a-tabindex-in-markup-an-expression-holds.json)                           | a template hands `innerHTML` a string with `tabindex=2` in it                                            | 3     | `evidence`  |
| [`a-tabindex-left-to-a-substitution-in-an-expression.json`](a-tabindex-left-to-a-substitution-in-an-expression.json)       | a template hands `innerHTML` a template literal whose tabindex a substitution says                       | 3     | `evidence`  |
| [`a-tabindex-left-to-a-concatenation-in-an-expression.json`](a-tabindex-left-to-a-concatenation-in-an-expression.json)     | a template hands `innerHTML` markup whose tabindex a concatenation says                                  | 3     | `evidence`  |
| [`a-tabindex-bound-in-an-inline-template.json`](a-tabindex-bound-in-an-inline-template.json)                               | a component's inline `template` binds `[tabindex]="1"`                                                   | 3     | `evidence`  |
| [`a-template-the-scan-cannot-read.json`](a-template-the-scan-cannot-read.json)                                             | a template closes a tag it never opened                                                                  | 3     | `evidence`  |
| [`an-inline-template-the-scan-cannot-read.json`](an-inline-template-the-scan-cannot-read.json)                             | an inline `template` closes a tag it never opened                                                        | 3     | `evidence`  |
| [`an-inline-template-given-by-a-constant.json`](an-inline-template-given-by-a-constant.json)                               | a `template` given by a constant, which the reading does not hold                                        | 3     | `evidence`  |
| [`a-tabindex-bound-in-a-host-block-the-scan-forbids.json`](a-tabindex-bound-in-a-host-block-the-scan-forbids.json)         | a `host` block binds `'[tabIndex]': '5'`                                                                 | 3     | `evidence`  |
| [`an-input-default-bound-as-a-tabindex-the-scan-forbids.json`](an-input-default-bound-as-a-tabindex-the-scan-forbids.json) | a `host` block binds `order()` over `order = input(2)`: an input holds what any template gives it        | 3     | `evidence`  |
| [`a-tabindex-from-a-field-the-class-fills-in.json`](a-tabindex-from-a-field-the-class-fills-in.json)                       | the same over a `readonly` field with no initializer, which `Object.assign` fills                        | 3     | `evidence`  |
| [`a-tabindex-from-a-computed-the-constructor-replaces.json`](a-tabindex-from-a-computed-the-constructor-replaces.json)     | the same over a `readonly` `computed` the constructor replaces                                           | 3     | `evidence`  |
| [`a-tabindex-from-a-computed-anyone-can-replace.json`](a-tabindex-from-a-computed-anyone-can-replace.json)                 | the same over a `computed` that is not `readonly`                                                        | 3     | `evidence`  |
| [`a-tabindex-from-a-static-namesake.json`](a-tabindex-from-a-static-namesake.json)                                         | the same over a method returning `5` beside a static namesake returning `0`                              | 3     | `evidence`  |
| [`a-tabindex-under-a-shorthand-key.json`](a-tabindex-under-a-shorthand-key.json)                                           | a `host` block writes `tabindex` by shorthand, over a constant                                           | 3     | `evidence`  |
| [`a-tabindex-a-method-returns-in-its-other-branch.json`](a-tabindex-a-method-returns-in-its-other-branch.json)             | the same over a method returning `this.on ? -1 : 1`                                                      | 3     | `evidence`  |
| [`a-tabindex-a-method-returns-second.json`](a-tabindex-a-method-returns-second.json)                                       | the same over a method returning `-1`, then `2`                                                          | 3     | `evidence`  |
| [`a-tabindex-a-host-binding-decorator-sets.json`](a-tabindex-a-host-binding-decorator-sets.json)                           | a component writes `@HostBinding('attr.tabindex') readonly order = 1`                                    | 3     | `evidence`  |
| [`a-tabindex-a-host-binding-getter-sets.json`](a-tabindex-a-host-binding-getter-sets.json)                                 | a component writes `@HostBinding('attr.tabindex')` on a getter returning `1`                             | 3     | `evidence`  |
| [`a-tabindex-a-renderer-sets.json`](a-tabindex-a-renderer-sets.json)                                                       | a component calls `renderer.setAttribute(el, 'tabindex', '1')`                                           | 3     | `evidence`  |
| [`a-tabindex-a-script-assigns.json`](a-tabindex-a-script-assigns.json)                                                     | a component assigns `el.tabIndex = 1`                                                                    | 3     | `evidence`  |
| [`a-tabindex-a-script-assigns-by-key.json`](a-tabindex-a-script-assigns-by-key.json)                                       | a component assigns `el['tabIndex'] = 1`                                                                 | 3     | `evidence`  |
| [`a-tabindex-in-capitals-in-markup-a-script-holds.json`](a-tabindex-in-capitals-in-markup-a-script-holds.json)             | a component holds the string `'<b TABINDEX="1">'`                                                        | 3     | `evidence`  |
| [`a-tabindex-left-to-a-substitution.json`](a-tabindex-left-to-a-substitution.json)                                         | a component holds markup whose tabindex a substitution says                                              | 3     | `evidence`  |
| [`a-tabindex-left-to-a-concatenation.json`](a-tabindex-left-to-a-concatenation.json)                                       | a component holds markup whose tabindex a concatenation says                                             | 3     | `evidence`  |
| [`an-accesskey-bound-as-a-property-the-scan-forbids.json`](an-accesskey-bound-as-a-property-the-scan-forbids.json)         | a template binds the property, `[accessKey]`, and 2.1.4 still says Supports                              | 3     | `evidence`  |
| [`an-accesskey-behind-an-escape.json`](an-accesskey-behind-an-escape.json)                                                 | a `host` key spells `[attr.acc\u0065sskey]`, which TypeScript cooks to `accesskey`                       | 3     | `evidence`  |
| [`a-motion-listener-in-a-template.json`](a-motion-listener-in-a-template.json)                                             | a template listens with `(window:devicemotion)`, and 2.5.4 still says Not Applicable                     | 3     | `evidence`  |
| [`a-motion-event-in-capitals.json`](a-motion-event-in-capitals.json)                                                       | a component asks `DeviceMotionEvent.requestPermission()`                                                 | 3     | `evidence`  |
| [`a-motion-handler-behind-an-escaped-name.json`](a-motion-handler-behind-an-escaped-name.json)                             | a component assigns `window.ondevic\u0065motion`, a name with an escape                                  | 3     | `evidence`  |
| [`a-motion-sensor.json`](a-motion-sensor.json)                                                                             | a component reads `new Gyroscope(…)`, a sensor of the same motion                                        | 3     | `evidence`  |
| [`an-orientation-query-in-capitals.json`](an-orientation-query-in-capitals.json)                                           | a stylesheet queries `(ORIENTATION: portrait)`, and 1.3.4 still says Supports                            | 3     | `evidence`  |
| [`an-orientation-query-in-a-template-style.json`](an-orientation-query-in-a-template-style.json)                           | a template's `<style>` queries `(orientation: portrait)`                                                 | 3     | `evidence`  |
| [`an-orientation-query-in-a-css-sheet.json`](an-orientation-query-in-a-css-sheet.json)                                     | a component gains `avatar.css` with the query                                                            | 3     | `evidence`  |
| [`an-orientation-lock-a-script-calls.json`](an-orientation-lock-a-script-calls.json)                                       | a component calls `screen.orientation.lock('portrait')`                                                  | 3     | `evidence`  |
| [`an-orientation-query-in-capitals-a-script-matches.json`](an-orientation-query-in-capitals-a-script-matches.json)         | a component asks `matchMedia('(ORIENTATION: landscape)')`                                                | 3     | `evidence`  |
| [`an-orientation-read-off-the-window-screen.json`](an-orientation-read-off-the-window-screen.json)                         | a component reads `window.screen.orientation.type`                                                       | 3     | `evidence`  |
| [`an-orientation-read-by-key.json`](an-orientation-read-by-key.json)                                                       | a component reads `window['orientation']`                                                                | 3     | `evidence`  |
| [`an-orientation-the-window-holds.json`](an-orientation-the-window-holds.json)                                             | a component reads `window.orientation`, behind a cast                                                    | 3     | `evidence`  |
| [`an-orientation-listener-in-a-template.json`](an-orientation-listener-in-a-template.json)                                 | a template listens with `(window:orientationchange)`                                                     | 3     | `evidence`  |
| [`a-sheet-the-scan-cannot-read.json`](a-sheet-the-scan-cannot-read.json)                                                   | a stylesheet leaves a block open                                                                         | 3     | `evidence`  |
| [`a-video-in-an-inline-template-behind-an-escape.json`](a-video-in-an-inline-template-behind-an-escape.json)               | an inline `template` draws `<vid\u0065o>`, and 1.2.1 still says Not Applicable                           | 3     | `evidence`  |
| [`a-video-a-script-creates.json`](a-video-a-script-creates.json)                                                           | a component calls `document.createElement('video')`                                                      | 3     | `evidence`  |
| [`an-audio-a-script-constructs.json`](an-audio-a-script-constructs.json)                                                   | a component calls `new Audio('chime.mp3')`                                                               | 3     | `evidence`  |
| [`an-svg-text-in-an-inline-template-behind-an-escape.json`](an-svg-text-in-an-inline-template-behind-an-escape.json)       | an inline `template` draws `<t\u0065xt>` in an `<svg>`, and 1.4.5 still says Not Applicable              | 3     | `evidence`  |
| [`an-svg-text-a-script-creates.json`](an-svg-text-a-script-creates.json)                                                   | a component calls `createElementNS(svg, 'text')`                                                         | 3     | `evidence`  |
| [`an-svg-text-a-renderer-creates.json`](an-svg-text-a-renderer-creates.json)                                               | a component calls a renderer's `createElement('text', 'svg')`                                            | 3     | `evidence`  |
| [`a-gate-that-left-ci.json`](a-gate-that-left-ci.json)                                                                     | `check-aria` is cited, and ci.yml no longer runs it                                                      | 4     | `wired`     |
| [`a-card-that-owes-the-keyboard.json`](a-card-that-owes-the-keyboard.json)                                                 | the button card's keyboard row turns into a gap under a Supports                                         | 5     | `cards`     |
| [`a-finding-that-has-closed.json`](a-finding-that-has-closed.json)                                                         | finding 4.75 is ticked in the plan while 4.1.2 still leans on it                                         | 6     | `finding`   |
| [`a-pass-claimed-without-its-logs.json`](a-pass-claimed-without-its-logs.json)                                             | `recorded: true` with nothing under `docs/acr/at/`                                                       | 7     | `pass`      |
| [`a-pass-claimed-with-a-card-still-owing.json`](a-pass-claimed-with-a-card-still-owing.json)                               | `recorded: true` with a log on disk, and every card still reading `none — gap`                           | 7     | `pass`      |
| [`an-act-whose-owner-never-presses-it.json`](an-act-whose-owner-never-presses-it.json)                                     | the dialog act cites the axe sweep as its owner, a spec that never names the control                     | 7     | `owner`     |
| [`an-act-the-record-never-opened.json`](an-act-the-record-never-opened.json)                                               | `recorded: true`, and the toast act moves to a control no log has an `open` row on                       | 7     | `pass`      |
| [`a-pass-recorded-in-words.json`](a-pass-recorded-in-words.json)                                                           | `recorded: "false"` — a word, which point 7 skipped and every rendering read as true                     | 7     | `pass`      |
| [`a-pass-not-on-record.json`](a-pass-not-on-record.json)                                                                   | the pass not recorded, every row at Supports or Not Applicable: the decision's sentence                  | 8     | `status`    |
| [`a-pass-not-on-record-and-a-row-below-supports.json`](a-pass-not-on-record-and-a-row-below-supports.json)                 | the pass not recorded and 4.1.2 below Supports: still the decision's sentence — the pass is read first   | 8     | `status`    |
| [`a-row-below-supports-with-the-pass-on-record.json`](a-row-below-supports-with-the-pass-on-record.json)                   | the pass recorded and 4.1.2 at Partially Supports on a finding: one row, counted, and its owner named    | 8     | `status`    |
| [`three-rows-below-supports-one-at-each-word.json`](three-rows-below-supports-one-at-each-word.json)                       | three rows below Supports, one at each word under it: three, in the standard's order, all three owners   | 8     | `status`    |
| [`a-row-held-by-a-card-and-no-finding.json`](a-row-held-by-a-card-and-no-finding.json)                                     | 2.1.1 at Partially Supports over a card that owes the keyboard row: the card is the owner named          | 8     | `status`    |
| [`two-kinds-of-owner-on-one-report.json`](two-kinds-of-owner-on-one-report.json)                                           | 1.4.4 on two findings and 2.1.1 over two owing cards: both kinds named, the findings in the plan's order | 8     | `status`    |
| [`a-label-two-rows-cite-named-once.json`](a-label-two-rows-cite-named-once.json)                                           | 1.3.3 and 2.4.4 over the same owed cards' row: two rows, one limit, the label named once                 | 8     | `status`    |
| [`nothing-holds-the-report-below-supports.json`](nothing-holds-the-report-below-supports.json)                             | the pass recorded, every row at Supports or Not Applicable: the word the decision reserves               | 8     | `status`    |

Point 2 has four cases because a level can be wrong in four directions and every one of them
reads like a report: a word outside the five, a _Supports_ on prose, a _Supports_ that names
its own limit, a _Not Evaluated_ with no owner. Point 3 has sixty-five. Five are one per kind
of citation that can go stale — a gate's point, a case's title, a quoted sentence, a decision's
number, a scan over the sources — because each goes stale for a different reason and at a
different moment. The other sixty are the scans', one per spelling of what a scan forbids,
because a spelling its reading does not take reads as a library that has none: a tag in a
namespace or in capitals, or one a script creates; an attribute written in capitals, bound as a
property, two ways or through `attr.`, keyed in a `host` block, set by a script, a decorator or
a renderer; a value a condition, a method, a field or a string a script builds hands over; an
inline template, a name behind an escape; a media feature in capitals, in a template's
`<style>`, in a `.css` sheet or in a script; a listener of the orientation and a read of it. A
template, an inline template and a sheet the reading cannot read are refused as such. Two of
them passed the pattern the reading replaced as well
([`a-tabindex-in-an-icu-case.json`](a-tabindex-in-an-icu-case.json) and
[`a-tabindex-in-markup-an-expression-holds.json`](a-tabindex-in-markup-an-expression-holds.json)):
they hold that the parser reaches what the raw text reached. Point 7 has five: "recorded" can
be a lie in three places — the directory, the cards, and the logs, which can stand on disk
without one `open` row the table promises — the act table can cite a spec that never presses
the control, recorded or not, and the flag itself can be a word rather than a boolean, which
the point would skip and every rendering read as true. Point 8 has eight, for a sentence with
three states and the edges inside two of them: the pass unrecorded over rows all held and over
one below, because the pass is read before the rows; one row below and three, one at each word
under Supports, because a count goes wrong in the singular or in one of the words as easily as
in the plural; a row held by a finding and one held by a card, because a limit has two kinds of
owner and a sentence that knows one kind reads "held by nothing" at the other; both kinds on
one report, with the findings in the plan's order and a card that has no row at all, because a
sentence that names one owner and stops reads like a report whose other limit has closed; a
label two rows lean on, named once, because one row of the cards is one limit; and nothing
below with the pass on record, the one state that earns the stronger word.
