import { afterNextRender, isDevMode } from '@angular/core';

/**
 * What a slot hands back, so that the component reading it can say the slot is home.
 *
 * Calling it is the whole claim: a slot nobody calls is a slot nobody renders, and that is
 * what the report below is about.
 *
 * @since 0.1.0
 */
export type PctSlotRead = () => void;

/** Production's answer. Nothing is reported there, so nothing has to be claimed. */
const UNREPORTED: PctSlotRead = () => undefined;

/**
 * Reports a slot standing where nothing reads it — under `isDevMode()` and nowhere else.
 *
 * Called from a slot directive's constructor, and the handle it returns is called by the
 * component that queried the slot: `contentChild(PctSelectOptionTemplate)` finding one is
 * exactly the statement "this template is mine, and I will render it". A slot no query
 * reaches is claimed by nobody, and that is the report.
 *
 * **Why the host does not declare itself, though it used to.** The first shape of this was
 * DI: the host carried `providers: [providePctTemplateHost('pct-select', […])]` and the slot
 * resolved it through the element injector. It worked, and it cost 24458 B — a `providers`
 * array compiles to `features: [ɵɵProvidersFeature([…])]`, a call to an imported function
 * inside the static initialiser of the class, which no bundler may treat as pure. So a
 * consumer who imported `pct-select` alone carried `pct-multi-select` with it, for a
 * `console.warn` their production build cannot print ([`lesson-173`](../../../../docs/lessons.md#lesson-173),
 * [`lesson-176`](../../../../docs/lessons.md#lesson-176)).
 *
 * **And why the DOM does not answer it either**, which is the road that was chosen and then
 * measured shut: an `<ng-template>` written inside `<pct-select>` is unprojected content, so
 * Angular never inserts its anchor into the document — `nativeElement.parentElement` is
 * `null` for the CORRECT usage and an element for the wrong one. The one case the report
 * exists to bless is the one case the DOM cannot see.
 *
 * **What this cannot see, and why nothing can.** A slot whose attribute is *misspelt* matches
 * no directive, so there is no instance to report anything: `<ng-template pctSelectOptoin>`
 * compiles, renders nothing and says nothing. The obvious repair — have the host compare the
 * `<ng-template>`s in its content against the slots that claimed one — is measured shut: a
 * control-flow block in the content is itself a `TemplateRef`, its anchor identical to any
 * other, so the comparison fires on a consumer who merely wrapped their slot in an `@if`
 * ([`lesson-84`](../../../../docs/lessons.md#lesson-84)). What answers the misspelling instead
 * is the compiler, one step earlier: a slot carries a required input, so the correctly spelt
 * name left unbound is `NG8008` rather than silence.
 *
 * **What it no longer says.** The message used to name the host a slot stood under when that
 * host offered other slots. Nothing knows that any more — an unclaimed slot has no way to
 * ask who its neighbours are — so one sentence covers both cases. The branch it loses was
 * never reachable in this library: the only two components that read slots read the same one.
 *
 * The report waits for `afterNextRender`, because the claim arrives with the host's content
 * query and a constructor is too early to know. That also means it says nothing during
 * server-side rendering, where there is no render to be after — a dev-mode `console.warn` is
 * for the browser the consumer is looking at.
 *
 * @param slot the attribute this directive is written as, which is what the message names
 *
 * @example
 * readonly read = pctReportOrphanSlot('pctSelectOption');
 *
 * @since 0.1.0
 */
export function pctReportOrphanSlot(slot: string): PctSlotRead {
  if (!isDevMode()) return UNREPORTED;

  let claimed = false;
  afterNextRender(() => {
    // Twice, and neither is spare: the return above keeps production from registering a hook
    // it would only run to do nothing, and this one stands where the call does, which is the
    // form `check-texts` reads and the form that stays true if the callback is ever moved.
    if (claimed || !isDevMode()) return;
    console.warn(
      `[${slot}] This template fills a slot of a component that does not read it. A slot ` +
        `is read by the component it stands directly inside, and this one is rendered by ` +
        `nobody.`,
    );
  });

  return () => {
    claimed = true;
  };
}
