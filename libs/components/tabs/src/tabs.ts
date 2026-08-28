import {
  Component,
  computed,
  contentChildren,
  ElementRef,
  InjectionToken,
  input,
  model,
  Signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { pctListNavigation } from '@pacit/components/core';
import { PctTabsActivation, PctTabsOrientation } from './tabs.types';

/**
 * What a strip needs to know about one of its panels, and nothing more. Declared HERE, beside
 * the strip, so that the panel can provide it while importing the strip — the other direction
 * (`contentChildren(PctTab)`) would close the import cycle. It is `pct-menu`'s channel one
 * component over, and for the same reason.
 */
export interface PctTabApi {
  /** What names this panel in `value`. */
  readonly value: Signal<string>;
  /** The text drawn on the tab the strip renders for it. */
  readonly label: Signal<string>;
  /** Skipped by every movement, and by the press it would otherwise answer. */
  readonly disabled: Signal<boolean>;
  /** The id of the panel element — what the tab's `aria-controls` points at. */
  readonly panelId: string;
  /** The id the strip is to give the tab it draws — what the panel's `aria-labelledby` names. */
  readonly tabId: string;
  /**
   * The strip that owns it — the nearest `pct-tabs` up the DECLARATION tree, which is what
   * injection resolves for projected content. It is what tells a nested strip's panels from
   * its parent's: both sets are content of the outer `pct-tabs`, and only this says which
   * walk they belong to.
   */
  readonly tabs: PctTabsApi | null;
}

/** The channel through which a panel announces itself to the strip it stands in. */
export const PCT_TAB = new InjectionToken<PctTabApi>('PCT_TAB');

/**
 * What a panel needs to know about the strip it stands in: which value is showing, and how to
 * ask for its own. The second half exists for one caller — a panel the browser has just found
 * text in ([0045](../../../../docs/decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)).
 */
export interface PctTabsApi {
  /** The value really showing, which is not always the `value` the consumer wrote. */
  readonly chosen: Signal<string>;
  /** Chooses a panel by value; a disabled one is not chosen. */
  select(value: string): void;
}

/** The channel through which a strip offers itself to the panels below it. */
export const PCT_TABS = new InjectionToken<PctTabsApi>('PCT_TABS');

/**
 * Tabs: one section of a page showing at a time, chosen from a strip of labels.
 *
 * It implements the ARIA APG
 * [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) pattern — `role="tablist"` on the
 * strip, `role="tab"` on each label, `role="tabpanel"` on each section, and a **roving
 * tabindex**: the strip is one stop in the page's tab order and the arrows walk inside it.
 *
 * **The tabs are drawn by this component and the panels are the consumer's.** A `<pct-tab>`
 * IS the panel — it carries `role="tabpanel"`, holds the content where it was written, and
 * hands up only the label to be drawn on the strip. Nothing is projected twice and nothing is
 * rendered through an `<ng-template>`: the DOM order the pattern asks for (the strip, then the
 * panels) is the order the consumer already wrote.
 *
 * **A panel nobody chose is hidden with `hidden="until-found"`**, so the browser's own
 * find-in-page still searches it and reveals it — measured in three engines, and the whole
 * subject of
 * [0045](../../../../docs/decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md).
 *
 * @example
 * <pct-tabs [(value)]="section" ariaLabel="Settings">
 *   <pct-tab value="general" label="General">…</pct-tab>
 *   <pct-tab value="network" label="Network">…</pct-tab>
 * </pct-tabs>
 */
@Component({
  selector: 'pct-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
  host: {
    class: 'pct-tabs',
    '[attr.data-pct-orientation]': 'orientation()',
  },
  providers: [{ provide: PCT_TABS, useExisting: PctTabs }],
})
export class PctTabs implements PctTabsApi {
  /**
   * Which panel is showing, by the `value` of a `<pct-tab>`.
   *
   * It is a `model` and not an `input`, because the component changes it: a press or a walk in
   * `automatic` mode is the user choosing, and a consumer who binds one way still gets the
   * component working — the value it writes is simply not read back.
   *
   * A value naming no panel is **not** an error and not an empty strip: the first panel that
   * can be reached shows instead, which is what the initial `''` means as well. The model is
   * left alone in that case rather than written back — a component that repaired the
   * consumer's state during rendering would be writing a signal it reads, which finishes in
   * one pass for one consumer and never for two ([`lesson-94`](../../../../docs/lessons.md#lesson-94)).
   */
  readonly value = model<string>('');

  /** Which axis the strip runs along; the arrows follow it. */
  readonly orientation = input<PctTabsOrientation>('horizontal');

  /** Whether a walk over the strip also chooses. See `PctTabsActivation`. */
  readonly activation = input<PctTabsActivation>('automatic');

  /**
   * The strip's accessible name. An INPUT rather than an `aria-label` on the tag: the role
   * sits on a `<div>` inside this template, the host carries no role at all, and an ARIA name
   * on a roleless element is ignored
   * ([`req-a11y-built-in`](../../../../docs/requirements/a11y.md#req-a11y-built-in)).
   */
  readonly ariaLabel = input<string>('');

  /** As `ariaLabel`, for a name that already stands somewhere on the page. */
  readonly ariaLabelledby = input<string>('');

  private readonly list =
    viewChild.required<ElementRef<HTMLElement>>('list');

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  /**
   * The panels of THIS strip, in document order. The query is over the whole content —
   * `descendants: true` — because a `<pct-tab>` may stand inside an `@if` or an `@for`, and
   * the filter is what keeps a nested strip's panels out of its parent's walk.
   */
  private readonly declared = contentChildren(PCT_TAB, { descendants: true });

  protected readonly tabs: Signal<readonly PctTabApi[]> = computed(() =>
    this.declared().filter((tab: PctTabApi) => tab.tabs === this),
  );

  /**
   * The keyboard walk — the shared machinery from `core`, and the first role to use it with a
   * roving tabindex rather than `aria-activedescendant`: here the tab really takes focus, so
   * `activeIndex` says which element to call `focus()` on.
   *
   * `wrap` is `true` because the APG's own example comes round at the ends, and `label` is
   * **absent**, which switches typeahead off. That is the decision the field is documented
   * for: a strip holds a handful of visible labels a user points at or arrows to, and typing
   * `s` at one has no meaning the pattern gives it.
   */
  private readonly nav = pctListNavigation<PctTabApi>({
    items: this.tabs,
    isDisabled: (tab) => tab.disabled(),
    sameItem: (a, b) => a.value() === b.value(),
    wrap: true,
  });

  /**
   * Where `value` really points. A value naming a panel wins even when that panel is
   * disabled — the consumer asked for it, and `disabled` is about what the USER may choose —
   * and a value naming nothing falls back to the first panel that can be reached.
   */
  protected readonly chosenIndex: Signal<number> = computed(() => {
    const tabs = this.tabs();
    const named = tabs.findIndex((tab) => tab.value() === this.value());
    return named >= 0 ? named : tabs.findIndex((tab) => !tab.disabled());
  });

  readonly chosen: Signal<string> = computed(
    () => this.tabs()[this.chosenIndex()]?.value() ?? '',
  );

  /**
   * The one tab in the page's tab order, `-1` when there is none to put it on.
   *
   * It follows the walk while the strip has focus and returns to the chosen tab when focus
   * leaves it, which is the roving pattern. The two fallbacks are not decoration: a
   * `<button disabled>` cannot be focused, so a `0` left on a disabled tab would take the
   * whole strip out of the page's tab order — a control the keyboard cannot reach at all,
   * reported by nothing.
   */
  protected readonly rovingIndex: Signal<number> = computed(() => {
    const tabs = this.tabs();
    const active = this.nav.activeIndex();
    if (active >= 0 && tabs[active] && !tabs[active].disabled()) return active;
    const chosen = this.chosenIndex();
    if (chosen >= 0 && !tabs[chosen].disabled()) return chosen;
    return tabs.findIndex((tab) => !tab.disabled());
  });

  select(value: string): void {
    const tab = this.tabs().find((candidate) => candidate.value() === value);
    if (!tab || tab.disabled()) return;
    this.value.set(value);
  }

  /**
   * A press on a tab. There is no `Enter` or `Space` handler beside it and that is the point
   * of the strip being drawn with `<button>`s: the platform turns both keys into a `click`,
   * so `manual` activation needs no key map of its own and cannot disagree with the pointer
   * ([`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform)).
   *
   * The `disabled` guard the menu's item deliberately does without is needed here, and the
   * difference is whose element it is: there the `<button>` is the consumer's and carries the
   * native attribute, here it is ours and carries `aria-disabled`, because a tab is a
   * signpost as much as a control — one that vanishes from the accessibility tree tells the
   * reader nothing about the section it names.
   */
  protected onPress(tab: PctTabApi): void {
    if (tab.disabled()) return;
    this.nav.setActive(this.tabs().indexOf(tab));
    this.select(tab.value());
  }

  /**
   * The walk's key map. It is the whole of what this component takes from the keyboard: the
   * arrows along the strip's own axis, `Home` and `End` at its ends, and nothing else — a key
   * that is not one of the four is left to the page, which is why `PageDown` still scrolls
   * and `Enter` still reaches the `<button>` underneath.
   *
   * The listener sits on the TAB and not on the strip around it, because that is where the
   * key is really pressed: a handler on the container would be a handler on an element that
   * cannot take focus, and the linter is right to ask about one.
   *
   * On a horizontal strip the arrows follow the READING order, so they swap under `rtl` — an
   * arrow that moves "right" through a list drawn right to left is the one thing a user is
   * certain to notice.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const vertical = this.orientation() === 'vertical';
    const rtl = !vertical && this.direction() === 'rtl';
    const forward = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';

    if (event.key === forward) this.nav.move(1);
    else if (event.key === back) this.nav.move(-1);
    else if (event.key === 'Home') this.nav.first();
    else if (event.key === 'End') this.nav.last();
    else return;

    event.preventDefault();
    this.settle();
  }

  /**
   * Focus arriving at a tab is where the walk starts. Without it the first `ArrowRight` after
   * tabbing in would land on the FIRST tab rather than on the one after the chosen one: the
   * shared walk begins at "nowhere", and a movement from nowhere goes to the edge it comes
   * from — which is the right answer for a list that has just opened and the wrong one for a
   * strip the user is already standing in.
   *
   * It covers the pointer as well — measured: a click on a tab focuses it in all three
   * engines. `onPress` sets the cursor all the same, and the duplication is deliberate rather
   * than forgotten: a press that arrives without a focus event (a synthetic `click()`, which
   * is what a unit test issues) would otherwise leave the walk where it was, and the next
   * arrow would move from a tab the user is no longer on.
   */
  protected onFocusin(event: FocusEvent): void {
    const index = this.buttons().findIndex(
      (button) => button.nativeElement === event.target,
    );
    if (index >= 0) this.nav.setActive(index);
  }

  /**
   * Focus leaving the strip puts the roving `0` back on the chosen tab, so that the next
   * `Tab` into the component lands where the user left off rather than where they last
   * arrowed. A move INSIDE the strip is not a leave: `relatedTarget` says where focus went,
   * and `null` — the browser's own chrome, another window — is a leave like any other.
   */
  protected onFocusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && this.list().nativeElement.contains(next)) return;
    this.nav.clear();
  }

  /**
   * What a movement does once the walk has moved: the tab really takes focus, and in
   * `automatic` mode it is chosen as well.
   *
   * The button is focused straight away rather than after the roving `tabindex` has been
   * written, because `focus()` does not care what the attribute says — and waiting for the
   * render would put the two halves of one keystroke in two frames.
   */
  private settle(): void {
    const index = this.nav.activeIndex();
    const tab = this.tabs()[index];
    if (!tab) return;
    this.buttons()[index]?.nativeElement.focus();
    if (this.activation() === 'automatic') this.select(tab.value());
  }

  /**
   * `ltr` / `rtl` as the strip RESOLVES it, not as `document.dir` declares it: an English page
   * with one Arabic section is the case a reading off the document gets wrong, and it is the
   * same argument `placement.ts` makes for a panel's side. It is read at the keystroke, which
   * is a browser's business — nothing here runs on a server.
   */
  private direction(): string {
    return getComputedStyle(this.list().nativeElement).direction;
  }
}
