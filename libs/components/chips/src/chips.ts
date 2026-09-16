import {
  afterNextRender,
  booleanAttribute,
  Component,
  contentChildren,
  DOCUMENT,
  ElementRef,
  inject,
  InjectionToken,
  Injector,
  input,
  isDevMode,
  output,
} from '@angular/core';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_TEXTS,
  PctSize,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

/**
 * The repair a chip arms on its parent when its remove control is pressed. An interface
 * behind a token rather than the class itself, so neither class in this file has to name the
 * other in a field initializer — `pct-tabs`' channel, walked in the other direction: there
 * the children declare themselves to the parent, here the child calls the parent back.
 */
interface PctChipsRepair {
  armRepair(removed: HTMLElement): void;
}

/** `pct-chips` under the interface above — provided by the component, injected by a chip. */
const PCT_CHIPS = new InjectionToken<PctChipsRepair>('PCT_CHIPS');

/**
 * A marker a chip provides so the row can collect its children — the query reads the
 * `ElementRef`, so the token carries no surface at all.
 */
const PCT_CHIP = new InjectionToken<void>('PCT_CHIP');

/**
 * A row of chosen values the user can take back: the active filters above a table, the
 * recipients of a message.
 *
 * **There is no ARIA APG pattern for chips, and this component does not invent one.** The
 * row is a `list` and every chip a `listitem` — the count a screen reader owes its user
 * first, bought with two attributes — and each removal control is a real `<button>`, so the
 * press, the keyboard and the focus ring are the platform's. There are **no key handlers
 * here**: no `Delete`, no arrows, no roving `tabindex`
 * ([0051](../../../../docs/decisions/0051-chips-are-a-list-the-user-shortens.md),
 * [`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform)).
 *
 * **The chips do not own the collection.** A chip row is a projection of the application's
 * own array — a chip has no `remove()` to perform, only a `removed` to say, and a `removed`
 * the consumer ignores removes nothing (a confirmation, an undo window, a value that must
 * stay are all the consumer not shortening the array).
 *
 * **What this component adds is where focus goes when the button under it disappears.**
 * Measured in all three engines: removing the focused button drops `activeElement` on
 * `<body>`, and Tab restarts from the top of the page. The row repairs that — the next
 * chip's remove button, the previous ones as a fallback — so a keyboard user clears five
 * filters with five presses of Enter and no Tab between them.
 *
 * @example
 * <pct-chips [ariaLabel]="'Active filters'">
 *   @for (filter of filters(); track filter) {
 *     <pct-chip removable (removed)="drop(filter)">{{ filter }}</pct-chip>
 *   }
 * </pct-chips>
 */
@Component({
  selector: 'pct-chips',
  templateUrl: './chips.html',
  styleUrl: './chips.scss',
  providers: [{ provide: PCT_CHIPS, useExisting: PctChips }],
  host: {
    class: 'pct-chips',
    // The role is static, and that is measured rather than assumed: a `role="list"` with
    // zero items raises nothing in any engine's audit (0051 quotes the probe), so an empty
    // row needs no machinery — unlike the listbox, whose empty panel is a critical
    // violation and taught the select to keep its role conditional.
    role: 'list',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-pct-size]': 'size()',
  },
})
export class PctChips implements PctChipsRepair {
  private readonly config = inject(PCT_CONFIG);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /**
   * The accessible name of the list. Optional, and deliberately without a text key behind
   * it: a list is allowed to be nameless, and a library default would have to guess what
   * the list holds — "Chips" names the paint, not the content (0051). Two rows on one page
   * ("recipients", "active filters") are told apart here.
   */
  readonly ariaLabel = input<string>('');

  /** Size of every pill in the row; taken from the global configuration by default. */
  readonly size = input<PctSize>(this.config.defaultSize);

  /** The chip hosts in document order — the map the focus repair walks. */
  private readonly chips = contentChildren(PCT_CHIP, {
    read: ElementRef,
  });

  /**
   * Called by a chip at the moment its remove control is pressed — before the `removed`
   * event, so the map of survivors is drawn while the chip still stands. The repair itself
   * runs one render later and not one render longer: a removal the consumer performs behind
   * a confirmation, seconds after the press, is one the user has navigated away from, and
   * yanking focus back then would be the repair causing the defect it exists to prevent.
   */
  armRepair(removed: HTMLElement): void {
    const order = this.chips().map(
      (chip: ElementRef<HTMLElement>) => chip.nativeElement,
    );
    const at = order.indexOf(removed);
    if (at < 0) return;
    // The nearest survivor AFTER the removed chip keeps the user's place in the row; the
    // ones before it, nearest first, catch the case of the last chip going.
    const candidates = [
      ...order.slice(at + 1),
      ...order.slice(0, at).reverse(),
    ];
    afterNextRender(
      { read: () => this.repair(removed, candidates) },
      { injector: this.injector },
    );
  }

  /**
   * The three-way verdict, read off the document rather than remembered: the chip still
   * connected is a consumer who kept the value (focus never moved — nothing to repair);
   * focus on a real element is an application that moved it on purpose (a repair would be a
   * fight with the consumer); only a removed chip AND focus fallen to `<body>` is the
   * platform's gap, and the nearest surviving remove button closes it.
   */
  private repair(
    removed: HTMLElement,
    candidates: readonly HTMLElement[],
  ): void {
    if (removed.isConnected) return;
    // Focus on a real, still-connected element is an application that moved it on purpose.
    // Anything else — `<body>`, `null`, a reference left pointing into the removed subtree —
    // is the platform's dropped focus, and the repair's to take.
    const active = this.document.activeElement;
    if (active && active !== this.document.body && active.isConnected) return;
    candidates
      .filter((chip) => chip.isConnected)
      .map((chip) =>
        chip.querySelector<HTMLElement>('[data-pct-part="remove"]'),
      )
      .find(Boolean)
      ?.focus();
  }
}

/**
 * One chosen value in a `pct-chips` row. Its content is the application's — projected, never
 * generated — and the one thing the chip may add to it is the control that takes the value
 * back.
 *
 * A chip that must stay is a chip whose `removable` is off, and the button is then not drawn
 * at all: a control drawn where it cannot be used would be a promise struck through, which
 * is why there is no disabled state here (0051).
 */
@Component({
  selector: 'pct-chip',
  imports: [PctIcon],
  templateUrl: './chip.html',
  styleUrl: './chip.scss',
  providers: [{ provide: PCT_CHIP, useValue: undefined }],
  host: {
    class: 'pct-chip',
    // The platform's own name for "one of these" — `pct-tab`'s move with `tabpanel`: the
    // native `<li>` is out of reach on a custom element, so the role is declared on the
    // element that is actually there (`req-a11y-built-in`).
    role: 'listitem',
  },
})
export class PctChip {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly parent = inject(PCT_CHIPS, { optional: true });
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * The two halves of the cross's accessible name. They exist as ids because the name has
   * to be COMPOSED: the verb is the library's string, what it acts on is the consumer's
   * projected label, and no attribute carries both — `aria-label` would overwrite the one
   * with the other, and reading the projected text into a string would be a DOM read of
   * content the application may change under us.
   */
  private readonly uid = nextPctId('pct-chip');
  protected readonly labelId = `${this.uid}-label`;
  protected readonly removeId = `${this.uid}-remove`;

  /**
   * Whether the chip draws the control that takes it back — off by default. A mixed row is
   * ordinary: the one filter the view cannot stand without keeps its `removable` off and
   * shows no button, and the focus repair steps over it.
   */
  readonly removable = input(false, { transform: booleanAttribute });

  /**
   * Said when the user presses remove. The collection is the application's, so this is an
   * announcement and not an act: the consumer shortens their own array and the row follows
   * on the next render — or does not, and the chip is correct to stand still.
   */
  readonly removed = output<void>();

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnLooseChip());
  }

  protected remove(): void {
    // Armed before the emit, while this chip still stands in the row's map — the emit is
    // synchronous and the consumer's shortening lands in the same render the repair reads.
    this.parent?.armRepair(this.host.nativeElement);
    this.removed.emit();
  }

  /**
   * A chip standing outside `pct-chips`, or wrapped in something inside it, is a `listitem`
   * whose `list` is not DIRECTLY above it — a role promised a context it does not have,
   * which a reader resolves however it likes; and a wrapped chip is also invisible to the
   * focus repair, whose map holds only the row's own children. One check catches both,
   * asked of the platform: the parent element either carries `role="list"` or it does not.
   * Said once, when the chip first stands in the document, and only in dev mode: the fix is
   * in the template, not at runtime.
   */
  private warnOnLooseChip(): void {
    const above = this.host.nativeElement.parentElement;
    if (this.parent && above?.getAttribute('role') === 'list') return;
    console.warn(
      `[pct-chip] A chip whose parent element is not a list. \`role="listitem"\` needs ` +
        `\`role="list"\` directly above it, and the focus repair after a removal lives in ` +
        `the row — make the chip a direct child of <pct-chips>, or use plain markup for a ` +
        `lone label.`,
    );
  }
}
