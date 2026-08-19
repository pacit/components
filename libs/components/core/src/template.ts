import { inject, InjectionToken, isDevMode, Provider } from '@angular/core';

/**
 * What a component that offers template slots says about itself, for the message a slot with
 * no home has to print.
 */
export interface PctTemplateHost {
  /** The element name that offers the slots. */
  readonly host: string;
  /** The slot attributes it reads. */
  readonly slots: readonly string[];
}

/** The channel through which a component tells the slots below it that it reads them. */
export const PCT_TEMPLATE_HOST = new InjectionToken<PctTemplateHost>(
  'PCT_TEMPLATE_HOST',
);

/**
 * Declares the slots a component offers, so a slot written under it can tell that it is home.
 *
 * A **slot** is a piece of a component's rendering a consumer may write instead
 * (`req-api-templates`): the select's option row, an icon, a row of a table. The consumer
 * supplies it as an `<ng-template>` carrying the slot's own directive.
 *
 * **A slot is a directive of its own and not a name in a string, and that is a measurement
 * rather than a taste.** The usual shape — `*pctTemplate="'option'"` — buys neither half of
 * what a template needs checked: a name inside a string is invisible to the compiler, and one
 * directive serving many names has nowhere to put the context guard that types each of them
 * ([0027](../../../../docs/decisions/0027-a-slot-is-a-directive.md),
 * [`lesson-84`](../../../../docs/lessons.md#lesson-84)).
 *
 * @example
 * providers: [providePctTemplateHost('pct-select', ['pctSelectOption'])]
 */
export function providePctTemplateHost(
  host: string,
  slots: readonly string[],
): Provider {
  return { provide: PCT_TEMPLATE_HOST, useValue: { host, slots } };
}

/**
 * Reports a slot standing where nothing reads it — under `isDevMode()` and nowhere else.
 *
 * Called from a slot directive's constructor. The slot is a node of the **consumer's**
 * template, a child of the component's element, so it resolves the host's providers the way
 * `pct-select` resolves `PCT_FIELD` from the chrome around it: through the element injector.
 * Nothing there means the slot was written under a component that does not offer it — or
 * under no component at all — and it will never be rendered.
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
 * @param slot the attribute this directive is written as, which is what the message names
 *
 * @example
 * constructor() { pctReportOrphanSlot('pctSelectOption'); }
 */
export function pctReportOrphanSlot(slot: string): void {
  if (!isDevMode()) return;

  const home = inject(PCT_TEMPLATE_HOST, { optional: true });
  if (home !== null && home.slots.includes(slot)) return;

  const where =
    home === null
      ? 'a component that is not among its ancestors'
      : `\`${home.host}\`, which offers ${home.slots
          .map((s) => `\`${s}\``)
          .join(', ')} and not this one`;

  console.warn(
    `[${slot}] This template fills a slot of ${where}. A slot is read by the ` +
      `component it stands directly inside, and this one is rendered by nobody.`,
  );
}
