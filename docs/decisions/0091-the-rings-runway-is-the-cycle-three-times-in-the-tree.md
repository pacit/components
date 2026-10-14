# 0091 — The ring's runway is the cycle three times in the tree, because a mandatory snap refuses a window

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-project-dependencies`](../requirements/project.md#req-project-dependencies),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-quality-browsers`](../requirements/quality.md#req-quality-browsers)
**Evidence:** three runways of one wheel, built as throwaway entrypoints on the branch
`probe/runway-0091` (commits `071c06eb` to `691570ca`, never merged) and measured on 2026-10-14 —
their bytes by `check-bundle` through nx and by Angular's real builder (A), their scroll in the
three engines this repository runs (chromium 153.0.8010.12, firefox 155.0, webkit 26.6 — Playwright
1.63.0) under a wheel tick, a burst of twelve and a jump (B), and their rows by NVDA, VoiceOver and
Orca through the `at-pass` workflow dispatched on the branch (C, runs 38625570466, 38627405624
and 38630726714) — the "Measurement" section below. In short: a window over the runway, the CDK's or
the wheel's own, **cannot be re-centred under `scroll-snap-type: y mandatory`** — all three engines
snap a `scrollTop` set into rows the window has not rendered back to the nearest rendered row
**synchronously**, before the window can move (B8); the CDK's viewport costs a consumer **54 KB**
more than the wheel's own window alone and **38 KB** more beside an overlay they already have (A2 to
A4) and draws a **blank frame** at the re-centring in chromium (B2); three copies of the rows
re-centre with no blank frame and no frame of the cycle they left in all three engines (B2); and
`scroll-snap-stop: always` is one row per tick in firefox and webkit and, in chromium 153, **three
rows, none, or three and an eighth off any row** by runway, in four runs over two commits (B1)

## Context

[0089](0089-one-value-more-than-one-control-and-the-consumer-chooses.md) decided that the
wheel is a listbox on the platform's scroll and that `wrap` rings on scroll as it rings on
keys, and left one thing open on purpose (§4): whether the ring's runway — the many cycles of
the rows the scroll runs over, re-centred on `scrollend` to the middle cycle — is the CDK's
virtual-scroll viewport, a third `@angular/cdk` entrypoint under the dependency policy, or a
window of the wheel's own. It asked for the answer as a record of its own, before the wheel's
code, measured by three things: the bytes on `./wheel`, a fling across the re-centring in
three engines, and three readers on a listbox whose rows are a window. This is that record.

Three runways were built, as three throwaway entrypoints with one shell. The shell is 0089's
wheel: `role="listbox"` on the element that scrolls, one tab stop, `pctListNavigation` with
`wrap` over sixty rows of `00` to `59`, `aria-activedescendant` on the row the walk stands on,
five rows of 32 px with the line on the third, `scroll-snap-type: y mandatory` on the list and
`scroll-snap-align: center` on every row, and a `scrollend` that reads the row under the line
as the value and, when the line has left the middle cycle, moves `scrollTop` by whole cycles
back into it. What differs is the runway:

- **K — the CDK's viewport.** `cdk-virtual-scroll-viewport` with `*cdkVirtualFor` over seven
  cycles of the rows and `itemSize` 32: the CDK renders the rows the viewport can reach and
  a buffer, and moves them in a translated wrapper over a spacer of the whole.
- **C — three copies.** `@for` over three cycles of the rows, every one in the tree; the middle
  copy is canonical and carries the ids, the outer two are `aria-hidden` with no id.
- **W — a window of the wheel's own.** Seven cycles again, of which eleven rows around the
  scroll position are rendered under a `padding-top` of the rows above and a height of the
  whole; the window moves on `scroll`, and a key moves it in the same render as the row it
  lands on.

## The measurement

The probes are kept in `tmp/probes/` of the worktree that wrote this record and on the
branch: `a-bytes/` (A), `b-fling/` (B) and `c-readers/` (C). Each row below carries the
condition it was taken under.

### A — bytes

On `691570ca`, the code the record cites; its rows stand in the commit after it. `check-bundle`
through nx (`nx run components:check-bundle --write`, so the library was
rebuilt without the cache first) writes the row of each entrypoint as a consumer's bundler
sees it: the linker run over the package, `ngDevMode` folded, **`@angular/*` external** — so
A1 to A3 are the library's own bytes and the CDK's weight is not in them. A4 is Angular's
real builder (`@angular/build:application`, optimization on, hashing off — the same probe
`check-bundle`'s point 11 runs) over an application importing the entrypoint and nothing else,
every JavaScript file of `out/browser` summed, minified and gzipped at level 9, seven cases
against a floor that imports nothing of the library.

| #   | probe                                                                              | K — CDK viewport                                                                                                                                                                                                                                                                                                                                                         | C — three copies               | W — own window                  |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------------------------------- |
| A1  | the entrypoint's own bytes, by `check-bundle`; what it pulls in; what is external  | 9885 B; pulls `./core`; external `@angular/cdk/scrolling`, `@angular/core`, `@angular/forms/signals`                                                                                                                                                                                                                                                                     | 9369 B; pulls `./core`; no CDK | 10250 B; pulls `./core`; no CDK |
| A2  | a consumer's application importing the entrypoint alone, over the floor of 90740 B | **+95487 B, +29507 gzipped**                                                                                                                                                                                                                                                                                                                                             | +40492 B, +13776 gzipped       | +41318 B, +14060 gzipped        |
| A3  | the same beside `./time` — a consumer who already carries `@angular/cdk/overlay`   | **+42896 B over `./time`, +11903 gzipped**                                                                                                                                                                                                                                                                                                                               | +3933 B, +1153 gzipped         | +4759 B, +1408 gzipped          |
| A4  | where K's excess over W comes from, by package, in the application alone           | 54169 B, 15447 gzipped: `scrolling.mjs` 21172; `rxjs` 12540; **14823 more of `@angular/core` itself** (its core 7340, its debug-node chunk 5537, pending tasks 1724, effects 222); `tslib` 1905; five small chunks of the CDK — the view repeater, platform, scrolling, directionality and element — 4025 together; and K's own compiled code 419 B **smaller** than W's | —                              | —                               |

The three runways' own code lies within 900 B of one another (A1), and K's is the smallest of the
three in the application (A4): the bill is the dependency's, not the wheel's. A consumer who already
carries `@angular/cdk/overlay` — the select, the date, the time — already has the
`ScrollDispatcher`, the `ViewportRuler` and the part of `rxjs` they need, and the viewport still
costs them 38 KB more than a window of the wheel's own (A3). Alone, it costs 54 KB, a quarter of it
parts of Angular the application had not otherwise loaded.

### B — the scroll, in three engines

On `691570ca`. Playwright against the sandbox served from the branch, one worker, no retries; the
row under the line read by `elementFromPoint` at the line's centre, `scroll` and `scrollend` counted
on the list, and at every re-centring the row under the line sampled at each of the next six
animation frames — a frame with no row under the line is the blank one. A **tick** is
`page.mouse.wheel(0, 100)`; a **burst** is twelve wheel events of 120 down to 10 px at 16 ms, which
is a trackpad's momentum as the page receives it, sent from row 50 so that it crosses the end of the
middle cycle; a **jump** is a `scrollTop` set by script. `scroll-snap-stop` is switched between
`always` and `normal` by a stylesheet over the rows. A **touch fling** was asked for twice and
refused twice: CDP's `Input.synthesizeScrollGesture` with a touch source moved nothing in either
headless mode, with and without `--enable-gpu-benchmarking`, and a stroke of timestamped
`Input.dispatchTouchEvent`s moved the rows the finger moved and then snapped — a drag, with no
inertia. The flick of a finger is the compositor's, and a headless engine has none to give; what a
burst measures is the momentum a page can see.

| #   | probe                                                                                                                                                                               | chromium 153                                                                                                                                                                                                                                                            | firefox 155                                                                                                                                                                                                                                                       | webkit 26.6                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | one tick on row 10: rows moved, under `always` · under `normal`, for C · W · K                                                                                                      | **3⅛ and off any row** · **0, two settles** · 3 — the same in four runs, one on `691570ca` and three on `071c06eb`; `normal` 3 · 3 · 3                                                                                                                                  | 1 · 1 · 1; `normal` 3 · 3 · 3                                                                                                                                                                                                                                     | 1 · 1 · 1; `normal` 3 · 3 · 3                                                                                                                                                                                                                                                                                                                                                    |
| B2  | a burst from row 50: rows moved under `always` · under `normal`; the row under the line at six frames after the re-centring                                                         | C 24 · 24, W **21** · 24, K **16** · 16 — K came to rest eight rows short of its burst after two shifts; after the shift C and W show the same row at every frame, **K none, the old cycle, none, then the row** — a blank frame twice and a frame of the cycle it left | 12 · 25, C, W and K; the shift lands between two wheel events and the next ones carry on from the middle cycle — the row under the line advancing `00, 01, 02` under `always` and `00, 03, 05` under `normal` after it, no blank frame, no frame of the old cycle | **6 to 8** · 24 to 25; under `always` the burst never leaves the cycle, and C once came to rest off any row; under `normal` the shift is one jump between two observations (`4223 → 2304` — caught on the second C run; the first missed it by a pixel, 1919 for a cycle of 1920, under a stricter detector since loosened) and the same row at every frame after it, C, W and K |
| B3  | a touch fling across the re-centring                                                                                                                                                | not reachable — see above                                                                                                                                                                                                                                               | not reachable                                                                                                                                                                                                                                                     | not reachable                                                                                                                                                                                                                                                                                                                                                                    |
| B4  | `ArrowDown`, a `scrollTop` set by script: `scroll` events · `scrollend` events                                                                                                      | 1 · 1, C, W and K                                                                                                                                                                                                                                                       | 1 · 1                                                                                                                                                                                                                                                             | 1 · 1                                                                                                                                                                                                                                                                                                                                                                            |
| B5  | `End` from row 0: is the id `aria-activedescendant` names in the tree when the attribute changes · when the scroll has settled                                                      | C yes · yes; W yes · yes; K yes · yes                                                                                                                                                                                                                                   | the same                                                                                                                                                                                                                                                          | C yes · yes; W yes · yes; **K no · yes** — the row is rendered a frame later and nothing stands under the line until it is                                                                                                                                                                                                                                                       |
| B7  | axe (`wcag2a wcag2aa wcag21a wcag21aa wcag22aa`) on each list                                                                                                                       | clean, C, W and K                                                                                                                                                                                                                                                       | clean                                                                                                                                                                                                                                                             | clean                                                                                                                                                                                                                                                                                                                                                                            |
| B8  | a jump of fifty rows into rows the window has not rendered, snap on: `scrollTop` read in the same task · two frames later; then snap off for the jump and restored two frames later | C holds; **W and K snap back in the same task**, to the last rendered row — W 5856 for 7296 asked, K 5952; snap off: lands, **no row under the line for one frame**, the row the next                                                                                   | the same; K to 6272, from 6016                                                                                                                                                                                                                                    | the same as chromium, to the byte                                                                                                                                                                                                                                                                                                                                                |

B8 is the row the others stand on. A mandatory snap is evaluated against the snap areas the
tree holds; a window that has not rendered the destination has none there, and all three
engines resolve the set **before the scroll event the window would move on** — the read in the
same task already returns the snapped-back value. So a windowed runway re-centres only with
the snap switched off around the jump. B8's jump is the harness's, naive: it sets `scrollTop`
and lets the window follow on `scroll`, which is the blank frame it shows. W and K as measured
in B2 move their window in the same handler, and W then shows no blank frame; K, whose rows
the CDK renders a frame later, shows two in chromium. C's rows are in the tree on both sides
of the jump, and nothing is evaluated against nothing.

### C — three readers

The `at-pass` workflow, dispatched on the branch three times: run 38625570466, on `071c06eb`, walked
the seven views with all three readers — its VoiceOver job hung on the first view and ended in
"VoiceOver not running", so run 38630726714, on `691570ca`, read five of them with VoiceOver alone —
and run 38627405624, on `691570ca`, walked the three act views on the copies and the two `Home`
views again with all three: the first pass had read the start row before the inputs were bound, so
every act view opened on row 00 and its `Home` rows are silence by construction; they are not cited.
The walk is `apps/sandbox-e2e/at/walk.ts` as it stands: a Tab walk over `/runway`, whose six lists
are six stops, and on each act view a `reach` onto the list, the key through the reader — `End`,
`Home` or `3` — and an Escape. Orca's key goes through the browser's keyboard, as `orca.spec.ts`
says it must; NVDA's and VoiceOver's through the reader, in whatever mode the reader was in after a
script's `focus()`. What a reader says of a list is its `tab` row; where a key landed is its `open`
row.

| #   | probe                                                                         | NVDA with Firefox on Windows                                                                                                                                                  | VoiceOver with Safari on macOS                                                                                                                                                  | Orca with Firefox on Linux                                                                                                                    |
| --- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | focus on C, the outer copies `aria-hidden` and without id: what the list says | silence — the first stop is reached by a script's `focus()`; the five lists after it, reached by Tab, each get their name and `list`: the role and the name, no count, no row | `00 selected (1 of 60)`                                                                                                                                                         | `Copies hidden · List with 60 items · 00`                                                                                                     |
| C2  | focus on C with the outer copies plain rows with ids of their own             | `Copies plain, list`                                                                                                                                                          | `00 selected (61 of 180)` — every copy counted, and the row placed in the second                                                                                                | `List with 180 items · 00` — every copy counted                                                                                               |
| C3  | focus on W with `aria-setsize="60"` and `aria-posinset` on the rendered rows  | `Window with set size, list`                                                                                                                                                  | `00 selected (1 of 60)` — the set size read                                                                                                                                     | `List with 60 items · 00` — the set size read                                                                                                 |
| C4  | focus on W without them                                                       | `Window without set size, list`                                                                                                                                               | `00 selected (1 of 6)`                                                                                                                                                          | `List with 6 items · 00` — the rendered rows of the canonical cycle                                                                           |
| C5  | focus on K with them · without them                                           | `CDK window with set size, list` · `CDK window without set size, list`                                                                                                        | `00 selected (1 of 60)` · `00 selected (1 of 9)`                                                                                                                                | `List with 1 item · 00` · the same — the CDK's content wrapper is the list's one child, and `aria-setsize` on the rows does not reach past it |
| C6  | `End` from row 0, on C · W · K                                                | `59, 60 of 60` · silence · `End on the CDK window, list`                                                                                                                      | `59 selected (60 of 60)` · `End on the own window list box 59 selected (60 of 60) 1 item selected.` · the same words for the CDK window                                         | `List with 60 items · 59` · `List with 60 items · 59` · `List with 1 item · 59`                                                               |
| C7  | `Home` from row 59, on C · W · K                                              | unread — the view produced no speech at all, and the pass's own record refuses to quote it · `00, 1 of 60` · `Home on the CDK window, list`                                   | `00 selected (1 of 60)` · **`heading level 2 Home on the own window`** · **`heading level 2 Home on the CDK window`** — the cursor fell off the list onto the view's title      | `List with 60 items · 00` · `List with 60 items · 00` · `List with 1 item · 00`                                                               |
| C8  | a typed `3` from row 0, on C · W · K — row 30                                 | `30, 31 of 60` · `30, 31 of 60` · `A digit on the CDK window, list`                                                                                                           | `00 selected (1 of 60)` — the row did not move under the reader's key · `00 selected (1 of 60)` · `00 selected (1 of 60)` — on no runway did the reader's `3` reach the browser | `List with 60 items · 30` · `List with 60 items · 30` · `A digit on the CDK window 30. · List with 1 item · 30`                               |

Three things the rows say. **The hidden copies are neither counted nor walked**: all three readers
count sixty on C (C1, C6 to C8) with no `aria-setsize` anywhere, and Orca counts a hundred and
eighty when the copies are plain, and VoiceOver places the row `61 of 180` (C2). **A window needs
`aria-setsize`, and still loses two readers**: Orca and VoiceOver read the set size on W (C3), Orca
counts six without it (C4) and one on K whatever the rows say (C5), and NVDA, which says the role
and the name on focus and the row only when it changes, says the row with its place — `31 of 60` —
on C and on W and nothing on K (C6 to C8). **Rows re-rendered under a reader's cursor take the
cursor with them**: on `Home`, VoiceOver read `00 selected (1 of 60)` on C and the view's heading on
W and on K (C7) — the row it stood on left the tree, and the cursor fell onto the view's `h2`. The
reader's own key is the reader's: NVDA's `End` on W was silence and its `Home` on C a view left
unread, and VoiceOver's `3` moved no row on any runway; the same keys through Orca, which hands them
to the browser, landed every time.

## Decision

1. **The runway is the cycle whole, three times in the tree.** With `wrap` on, the wheel renders its
   rows three times by `@for`; the middle copy is canonical — it carries the ids, `aria-selected`
   and the row `aria-activedescendant` names — and the outer two are `aria-hidden` and carry no id
   (C1, C6 to C8: sixty in three readers with no `aria-setsize`; plain copies are a hundred and
   eighty in Orca and in VoiceOver, C2). A click on an outer row picks the row of the same index.
   With `wrap` off there is one copy and no runway at all. Nothing is virtualised: a wheel of sixty
   holds a hundred and eighty rows, a wheel of twenty-four, seventy-two.

2. **The re-centring is a `scrollend` away, by whole cycles, with the snap on.** When the
   settled scroll has left the middle cycle, `scrollTop` moves by as many cycles as it takes
   to return; no frame is blank and none shows the cycle the scroll left (B2), the set fires one
   `scrollend` of its own (B4) and the handler, finding the line in the middle cycle, does
   nothing more. The snap is never switched off: it needs no switching when the destination's
   rows are already in the tree (B8).

3. **`scroll-snap-stop: normal`.** `always` is one row per tick in firefox and webkit, and in
   chromium 153 it is three rows on the CDK's window, none on the wheel's own and three and an
   eighth, off any row, on the copies — in four runs over two commits (B1); why the three runways
   differ is not measured here, and a shell that cannot promise one row does not promise it. Under
   `normal` a tick is three rows in all three engines and a burst twenty-four or twenty-five on the
   copies (B1, B2); that is the gesture the minutes column gets, and sixty flicks for sixty minutes
   is the alternative this record refuses.

4. **No third CDK entrypoint.** `@angular/cdk/scrolling` is refused for the runway on three
   readings: it costs a consumer 54 KB (15 KB gzipped) more than a window of the wheel's own
   alone and 38 KB (10 KB) more beside an overlay they already carry (A2 to A4), where the
   runways' own code lies within 900 B of one another (A1);
   its rows are rendered a frame after the scroll, so the re-centring draws a blank frame in
   chromium (B2) and `End` names a row not yet in the tree in webkit (B5); and it is a window,
   which B8 refuses with the rest. `dependencies.policy.json` keeps the CDK's entry at two
   entrypoints, and the reason sentence there does not change.

5. **No window of the wheel's own either.** W re-centres only with the snap switched off
   around the jump and switched on two frames later (B8) — done in the same handler that moves
   the window, it draws no blank frame (B2), and it is still a snap toggled at every settle that
   crosses a cycle, forty lines of it, buying eleven rows in the tree instead of a hundred and
   eighty for a cycle no longer than a day's hours or an hour's minutes; and a reader's cursor
   standing on a row the window re-renders falls off the list (C7). The wheel's rows are
   counted in dozens; a window is for thousands.

6. **There is no runway to share, so nothing moves to `./core`.** 0089 asked 1.6 to end by
   naming the select's long list as the runway's second consumer or not. It is not: three
   copies are a `@for` in the wheel, and the select's list has no ring. A long list that needs
   a window is a question of its own, with K's bill (A) and B8 in front of it.

7. **What this contradicts in 0089.** §4 wrote the ring as "a window over a runway of many
   cycles" whose re-centring is "a change no pixel shows", and listed three copies among the
   alternatives considered. B8 says a window cannot make that change under the snap 0089 §3
   chose, and B2 says three copies make it with no frame blank and none of the cycle they left.
   0089's consequences also made "rows per flick on a column of sixty" the measure deciding
   `scroll-snap-stop`; this record decides it on a tick and a burst, because no headless engine
   here flings (B3) — a substitution, named. 0089 stays as written — it left the runway open
   and asked for this record; the premise it stated in passing is the thing measured here, and
   this record is where the measurement stands. The plan's 1.6 and the wheel's card point
   here.

## Consequences

- **1.6 builds C.** `@for` over three cycles with the middle one canonical, `aria-hidden` and no
  id on the outer rows and no `aria-setsize` or `aria-posinset` anywhere — the count is the
  tree's (C1); the re-centring on `scrollend` by whole cycles; the snap stop `normal`; and no
  `@angular/cdk/scrolling` import anywhere in the package.
- **The probes stay where they are.** The branch `probe/runway-0091` is kept on the remote,
  un-merged, until the wheel lands, and `tmp/probes/` of the worktree holds the harness; the
  record cites commits and run ids rather than files that move.
- **The card says what a flick does.** Rows per tick and per burst are this record's numbers in
  three engines; rows per flick of a finger are not, because no headless engine here flings
  (B3). The wheel's card says so, and reads it by hand on a device before it claims a number.
- **The dependency policy does not grow**, and the sentence on the CDK's entry — "two
  entrypoints, not one" — stays true.

## What this costs us

- **Three times the rows in the tree.** A ring of sixty is a hundred and eighty `role="option"`
  elements; a consumer who puts `wrap` on a wheel of five hundred pays fifteen hundred. The
  wheel documents that `wrap` is for a cycle — a clock's, a calendar's, an enum's — and a long
  list rings at its own expense.
- **A flick travels.** Under `normal` a burst of twelve is twenty-four or twenty-five rows on
  the copies in every engine, and a user who wanted one row per flick does not get it; one row
  per tick is two engines of three and could not be promised (B1).
- **The flick of a finger is unmeasured here.** The e2e pipeline runs the same headless engines
  this record did, so rows per touch flick on a device is a number the suite cannot read; it
  is read by hand and written on the card, or not claimed.
- **Two `scrollend`s per settle that crosses a cycle.** The gesture's and the re-centring's; the
  handler is idempotent and the value is written once, but a consumer listening on the
  element hears both.
- **The outer copies are in the tree for the pointer and hidden from the reader** — a pointer may
  land on an outer row, and the click picks the row of the same index; a reader never meets one (C1,
  C6 to C8). A reader's virtual cursor walking the list meets sixty rows; the eye meets a ring.

## Alternatives considered

- **The CDK's virtual-scroll viewport (K).** Everything a window needs, written and
  maintained by somebody else — and 38 to 54 KB on a consumer's bundle for sixty rows, a frame
  late at the re-centring and on `End`, and under the snap of B8 like every window. It is the
  right answer to a list of thousands and the wrong one to a ring of sixty.
- **A window of the wheel's own (W).** Lighter than K by every byte of the CDK, and correct
  once the snap is switched off around the jump and on again after the render (B8) — with no
  blank frame when the window moves in the same handler (B2). Refused for a cycle that fits in
  the tree three times over: forty lines and a snap toggled at every crossing against eleven
  rows saved, and a cursor VoiceOver loses on `Home` (C7).
- **The outer copies as plain rows with ids (C2).** Orca counts all three — `List with 180
items` — and VoiceOver says `61 of 180` (C2): a reader walking down the list meets every row
  three times; the ids would have to be three as well, and `aria-activedescendant` names one.
- **`scroll-snap-stop: always`.** One row per tick in firefox and webkit, and in chromium 153
  three rows, none, or three and an eighth off any row, by runway
  (B1); a promise the baseline engine cannot keep is not made.
- **Re-centring on `scroll`, mid-flight.** The shift before the settle would hide the outer
  copies' moment entirely, and a `scrollTop` set during the engine's own momentum is the one
  thing B could not reach: no headless engine flings. In firefox the shift already lands
  between two wheel events of a burst and the following ones carry on (B2), which is the
  closest measured reading; the design stays on `scrollend`, where every engine has settled.
- **A scroller of the library's own.** Refused in 0089 and not reopened: the platform
  scrolls, snaps and settles, and B8 is the platform's rule, not a defect to code around.
