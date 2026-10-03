# 0084 — A fallback stays while Angular supports an engine without the feature, and e2e forces it

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-quality-browsers`](../requirements/quality.md#req-quality-browsers),
[`req-project-latest`](../requirements/project.md#req-project-latest)
**Evidence:** the bump to Playwright 1.63 (PR #48) — `CSS.supports('field-sizing', 'content')`
and `typeof Intl.Locale.prototype.getWeekInfo` probed in chromium 153, firefox 155 and webkit
26.6, true and `function` in all three; `@angular/build` 22.2.1 resolving its own policy,
`baseline widely available on 2025-10-20`, to chromium 111+, firefox 112–152 and safari 16.4+;
`apps/sandbox-e2e/src/textarea.spec.ts` and `date.spec.ts` with each fallback forced, and the
controls in [`req-api-platform`](../requirements/api.md#req-api-platform) re-run against them

## Context

Two things in the library exist because an engine lacked a platform feature, and both lost
that engine on the same day. [0041](0041-a-height-the-platform-computes.md) measures a
textarea's height in script where `field-sizing: content` is missing;
[0043](0043-a-day-is-not-an-instant.md) reads the first day of the week from a table of 80
regions where `Intl.Locale.prototype.getWeekInfo()` is missing. In both records the engine was
firefox 151. Firefox 155 has both, so the e2e suite stopped running either fallback in any
browser.

0041 had seen this coming and written a case to expire: it asserted firefox as the engine
without the property, went red at the bump, and was rewritten to assert all three. 0043 had
no such case, and the table's last engine went with nothing to say so. Neither left the
question the expiry was for answered: **is the fallback still owed to anyone?**

## Decision

**A fallback stays while Angular supports an engine without the feature.** The library
declares no browser list of its own: its peer range admits one Angular major
(`angular-majors` in [`docs/support.md`](../support.md)), and that major comes with Angular's
browser policy — for 22, the browsers that were Baseline widely available on 2025-10-20. That
set reaches chromium 111, firefox 112 and safari 16.4 and includes firefox 151, where both
features were measured absent — and the older ends of the other two lines predate them as
well. An application built with Angular 22's defaults targets those engines, so the library has
to work there; that the e2e run has newer ones is a fact about the e2e run.

So both fallbacks stay, and **each is forced in every engine** rather than left to whichever
engine still lacks the feature:

- **the textarea** runs every case of `textarea.spec.ts` twice — on the engine's own road and
  with `withoutFieldSizing`: an init script that answers `false` to `CSS.supports` for the
  property and sets `field-sizing: fixed !important`, its initial value. Both halves, because
  the absence is asked twice — by the directive in script and by the sheet's `@supports` — and
  a stub of one leaves the other deciding the height under the cases. A last case per road says
  which road the box is on (the computed `field-sizing`, and whether a height was written), so
  a stub that stopped working is a red case and not a second run of the platform road.
- **the week** runs a case per field of the `/date` view, Japanese and Polish, with
  `getWeekInfo` and with an init script deleting it before the application starts. The
  expected first column is the platform's own: the method is kept aside, asked for `firstDay`,
  and the day named by the platform's own formatter. Japan is a row of the table and Poland is
  not, so a missing row and a wrong default are each red on one of them.

**The expiry is replaced, not dropped.** The textarea's road case still asserts that all three
engines have the property, and the week case that all three have the method. What changes is
when a fallback is removed: at the Angular major whose browser policy no longer reaches an
engine without the feature, which is a peer-range bump this repository makes on purpose.

## Consequences

- The first run of the forced textarea road found a defect the suite had never listened for. The
  resize observer wrote the height inside its own callback, and every engine answers that with
  an error event — `ResizeObserver loop completed with undelivered notifications`, once per
  rewrap — while the heights stay right. Playwright's `pageerror` does not hear it, so every
  case now ends by reading the page's own `error` events, and the measurement waits for the next
  frame (`autosize.ts`, comment 3). Without the fix the rewrap case is red in all three engines.
- The controls `req-api-platform` records for the measured road bite again, in three engines
  instead of one: its reset removed, 2 cases per engine; its `observe` call removed, 1; its
  subscription taken at construction, 1; its height written inside the callback again, 1.
- The week's table is drawn in a browser for the first time; until now only the unit suite
  reached it, in node.
- The run is 39 cases longer: 21 for the textarea and 18 for the week.

## What this costs us

- **An init script is not an engine.** It removes the two answers the library asks for and
  leaves the rest of a newer engine in place. A defect that needs an older engine's layout as
  well as the missing property passes here. What is gained is the library's own code on the
  road it takes there, which no browser in this run otherwise walks.
- **The removal waits on Angular.** A fallback is kept for as long as the framework supports an
  engine without the feature, even if no consumer of this library uses one. This trades bytes
  that may be paid for nothing against a promise the framework makes and this library would
  otherwise quietly break.
- **The floor and the ceiling are `lh`, and firefox 112–119 have no `lh`.** The unit arrived in
  120, so on the oldest engines of the set `min-block-size` and `max-block-size` are dropped:
  the box still follows its text by measurement, but `rows` is the platform's own `rows` sizing
  and `maxRows` does nothing. The init script cannot show this — the engines it runs in have
  the unit — and it is named here rather than claimed away.
- **One frame at the old height after a rewrap** on the measured road, which the frame-deferred
  measurement costs; the platform road has no script to wait for.

## Alternatives considered

| alternative                                      | why rejected                                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| remove both fallbacks                            | Angular 22 supports firefox 112–152 and safari from 16.4; firefox 151 was measured without either feature, so a supported engine would grow nothing and start the week on Monday everywhere |
| keep them, with no browser road                  | the state the bump left: controls recorded in the requirement that no longer bite, and a table no browser has drawn a grid from                                                             |
| a CI job with an older firefox                   | Playwright pins one build per engine; an older one is a second install and a second runner, for two features an init script can take away                                                   |
| stub `CSS.supports` alone                        | the sheet's `@supports` still lays the box out, so the cases pass whichever road is right — the same check of the primary that [`lesson-120`](../lessons.md#lesson-120) names               |
| declare the library's own, narrower browser list | it would be a second policy beside Angular's that a consumer's build does not read; a library narrower than its framework breaks applications that follow the framework                     |
