import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { nextPctId } from '@pacit/components/core';
import { PCT_TAB, PCT_TABS, PctTabApi } from './tabs';

/**
 * One section of a `<pct-tabs>`: `role="tabpanel"`, holding its content where the consumer
 * wrote it, and handing the strip above only the label to draw.
 *
 * **It is the panel, not the tab.** The tab is a `<button>` the strip renders from `label`,
 * so the pattern's DOM order — the whole strip, then the panels — comes out of the order
 * anybody would write the markup in, with nothing projected twice.
 *
 * **A panel nobody chose is `hidden="until-found"`.** The browser's find-in-page still
 * searches it, and revealing it fires `beforematch`, which this component answers by choosing
 * the tab — so text found in a section that was not showing leaves the user IN that section
 * rather than watching it disappear
 * ([0045](../../../../docs/decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)).
 * A **disabled** panel is hidden outright instead: find-in-page is a promise of a way in, and
 * a disabled tab has none.
 *
 * @example
 * <pct-tab value="general" label="General">
 *   <p>Anything at all.</p>
 * </pct-tab>
 */
@Component({
  selector: 'pct-tab',
  templateUrl: './tab.html',
  styleUrl: './tab.scss',
  host: {
    class: 'pct-tabs__panel',
    'data-pct-part': 'panel',
    role: 'tabpanel',
    // A panel is a Tab stop of its own. The APG asks for it wherever the content holds
    // nothing focusable — and whether it does is the consumer's business, not knowable here,
    // so the answer that is right in both cases is the one taken. What it costs is one extra
    // stop after the strip; what it buys is a panel that can be scrolled and read by a
    // keyboard whatever the consumer put in it.
    tabindex: '0',
    '[id]': 'panelId',
    '[attr.aria-labelledby]': 'tabId',
    '[attr.hidden]': 'hidden()',
    '[attr.data-pct-chosen]': 'hidden() === null ? "" : null',
    '(beforematch)': 'onFound()',
  },
  providers: [{ provide: PCT_TAB, useExisting: PctTab }],
})
export class PctTab implements PctTabApi {
  /**
   * What names this panel in the strip's `value`. Deliberately not defaulted to a position:
   * an index is a name that changes when a panel is added above it, so a consumer who saved
   * "the third one" would restore a different section.
   *
   * **It is the one input here that is not `required`, and the reason is a measurement.** The
   * strip resolves which panel shows by comparing every panel's value against its own, and
   * that comparison is read from THIS panel's host binding — so panel one asks panel two for
   * its value. Under an `@for` that question arrives too early: the loop refreshes each
   * iteration whole, template and host bindings together, before the next iteration's inputs
   * exist, and a required input read there throws `NG0950`
   * ([`lesson-124`](../../../../docs/lessons.md#lesson-124)). A default answers it in the one
   * frame nobody sees, and a value left out for good is reported below rather than swallowed.
   */
  readonly value = input<string>('');

  /**
   * The text drawn on the tab. Required, and it can be: it is read from the STRIP's template,
   * which is refreshed after all of the content's inputs are set — the ordering `value` runs
   * into does not reach here, so the compiler may as well have the rule (`NG8008`).
   */
  readonly label = input.required<string>();

  /** Skipped by the walk and by the press; the panel is then hidden outright. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly uid = nextPctId('pct-tab');
  readonly panelId = `${this.uid}-panel`;
  readonly tabId = `${this.uid}-tab`;

  /**
   * The strip this panel stands in — injected rather than passed, because injection is what
   * resolves the DECLARATION tree: a panel written inside a nested `pct-tabs` gets that one,
   * however the two are drawn.
   */
  readonly tabs = inject(PCT_TABS, { optional: true });

  /**
   * The `hidden` attribute's three states, and each is a different sentence. `null` — this
   * panel is showing. `until-found` — it is not, and its text is still the document's:
   * find-in-page searches it and can reveal it. `''` — it is not, and it is not to be found
   * either, which is what a disabled panel is.
   */
  protected readonly hidden = computed(() => {
    if (this.tabs?.chosen() === this.value()) return null;
    return this.disabled() ? '' : 'until-found';
  });

  constructor() {
    if (isDevMode() && !this.tabs)
      console.warn(
        `[pct-tab] A \`pct-tab\` outside any \`pct-tabs\`: it will carry ` +
          `\`role="tabpanel"\` with no tab naming it, which is a role the accessibility ` +
          `tree drops, and nothing will ever show it. Put it in the content of a ` +
          `\`<pct-tabs>\`.`,
      );

    // The one thing the compiler cannot say, because `value` cannot be required — see the
    // input. It is read after a render rather than in this constructor for the same reason
    // the default exists: at construction there is no input to read yet.
    if (isDevMode())
      afterNextRender(() => {
        if (this.value() === '')
          console.warn(
            `[pct-tab] A \`pct-tab\` with no \`value\`: two of them are then the same ` +
              `panel as far as the strip is concerned, and the second can never be shown. ` +
              `Give each panel a name of its own.`,
          );
      });
  }

  /**
   * The browser is about to reveal this panel because the user searched the page and the text
   * is in here. It fires BEFORE the attribute is removed and before the scroll, so choosing
   * the tab now is what makes the reveal permanent: the strip's next render writes `hidden`
   * back as `null`, and the panel the user was taken to is the one that stays open.
   *
   * Answering the event is the whole of what `hidden="until-found"` costs. Without it the
   * browser would remove the attribute, this component would write it straight back, and the
   * found text would be shown for a frame and taken away.
   */
  protected onFound(): void {
    this.tabs?.select(this.value());
  }
}
