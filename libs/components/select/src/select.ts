import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  PCT_TEXTS,
  pctDescribedBy,
  pctFieldMessages,
  PctCompareWith,
  PctFieldAppearance,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
  pctSameValue,
  PctSize,
} from '@pacit/components/core';
import {
  PctSelectOption,
  PctSelectPanelAlign,
  PctSelectPanelWidth,
} from './select.types';

/**
 * A single-choice select with a panel of its own (not a native `<select>`).
 *
 * It implements the ARIA „select-only combobox" pattern: the trigger has `role="combobox"`, the
 * panel `role="listbox"`, and focus **never leaves the trigger** — the active option is pointed
 * at by `aria-activedescendant`.
 *
 * Panel positioning stands on CDK Overlay (`req-project-dependencies`) — the only runtime
 * dependency allowed. The keyboard handling is ours, because a custom listbox has no native
 * counterpart (`req-api-platform`).
 *
 * The value is of any type `T` (a string by default) — see `PctSelectOption`. The absence of a
 * choice is `emptyValue`, `null` by default.
 *
 * @example
 * <pct-select label="Country" [options]="countries" [formField]="form.country" />
 *
 * @example
 * // Non-string values: `T` comes from the option list.
 * <pct-select [options]="priorities" [(value)]="priority" />
 * // protected priorities: PctSelectOption<number>[] = [{ value: 1, label: 'Low' }];
 *
 * @example
 * // Entities: equality by key, because HTTP brings back another instance.
 * <pct-select [options]="cities" [compareWith]="byId" [(value)]="city" />
 */
@Component({
  selector: 'pct-select',
  imports: [OverlayModule],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  host: {
    class: 'pct-select',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-open]': 'open() ? "" : null',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    // Inside the chrome `pct-field` draws the border and the label — the control hands
    // them over.
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctSelect<T = string>
  implements FormValueControl<T | null>, PctFieldControl
{
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * The selected value — a required field of the `FormValueControl` contract. The type is
   * `T | null`, because „nothing selected" is a state reachable for every `T`: the select
   * starts empty and a form reset returns to it.
   *
   * `NoInfer` takes from this binding the right to **decide** `T` — the type comes from the
   * option list alone, and the value is checked against it. Without it `T` widened to a union
   * of candidates (`string | number`), and a list of numbers with a string value compiled,
   * because both fitted the union.
   */
  readonly value = model<NoInfer<T> | null>(null);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input<string>('');

  readonly touch = output<void>();

  // --- component API ---

  readonly options = input<readonly PctSelectOption<T>[]>([]);
  readonly label = input<string>('');
  readonly hint = input<string>('');
  /**
   * The placeholder. With no value it comes from `PCT_TEXTS` — and it comes **at render time**,
   * not at construction: an input's default value is produced once, so an application
   * switching language at runtime would be left with the string from before the change
   * ([0014](../../../../docs/decisions/0014-texts-as-signal.md)). `placeholder=""` stays an
   * empty placeholder rather than a return to the default — absent and empty mean different
   * things.
   */
  readonly placeholder = input<string>();
  readonly size = input<PctSize>(this.config.defaultSize);

  /**
   * Value equality. Identity by default, which for strings and numbers is the same as `===`.
   * Entities need comparison by key — an instance from the server is not the same reference as
   * an option on the list, so without this the selected item would not highlight after the
   * form loads.
   */
  readonly compareWith = input<PctCompareWith<T>>(pctSameValue);

  /**
   * The value standing for no choice — set when the form is reset. `null` by default, but an
   * application with a non-nullable field (`plan: string`) supplies its own (`emptyValue=""`),
   * so that a reset does not write `null` into the model against its type.
   */
  readonly emptyValue = input<NoInfer<T> | null>(null);

  /**
   * Width of the dropdown panel — equal to the control by default (`'field'`). The panel then
   * comes out exactly from its edge, so the list reads as an extension of the field. `'auto'`
   * fits the width to the longest option (without narrowing the panel below the control), and
   * a CSS length sets it outright.
   */
  readonly panelWidth = input<PctSelectPanelWidth>('field');

  /** Alignment of the panel to the control when it is wider or narrower than it. */
  readonly panelAlign = input<PctSelectPanelAlign>('start');

  private readonly trigger =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  // --- a11y ---

  private readonly uid = nextPctId('pct-select');
  protected readonly triggerId = `${this.uid}-trigger`;
  protected readonly labelId = `${this.uid}-label`;
  protected readonly listboxId = `${this.uid}-listbox`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // --- working with the chrome (req-api-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });

  /** Whether the control is inside the chrome — it then hands over label and messages. */
  protected readonly inField = this.fieldApi !== null;

  /** A `<button>` is a labelable element, so `<label for>` works. */
  readonly controlId = this.triggerId;
  readonly labelStrategy: PctLabelStrategy = 'for';
  readonly fieldAppearance: PctFieldAppearance = 'boxed';
  readonly fieldCursor: PctFieldCursor = 'pointer';

  /** A click on the border outside the trigger opens the list — as a click on the trigger. */
  activate(): void {
    this.toggle();
  }

  /** Set by the chrome when one is present. */
  private readonly fieldDescribedBy = signal<string | null>(null);

  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly open = signal(false);

  /**
   * The panel renders in a CDK overlay, outside the host tree, so the scoped-theme cascade
   * (`req-token-scoped`) does not reach it. The theme is therefore carried from the host's
   * nearest ancestor onto the panel itself.
   */
  protected readonly panelTheme = signal<string | null>(null);

  /**
   * For the same reason the panel does not inherit its type — outside the host tree it takes
   * it from `body`, that is the browser's default serif font instead of the application's. The
   * family belongs to the application (there is no token for it) and the size to the control's
   * context: inside the chrome `pct-field[size]` sets it, standalone its own `size` does. So
   * both are read from the trigger on opening: the panel is set in exactly what the visible
   * control is set in.
   */
  protected readonly panelFont = signal<{
    family: string;
    size: string;
  } | null>(null);

  /**
   * The third property broken in an overlay, for the same reason as the theme and the type
   * (`lesson-35`): writing direction. The panel is a child of `body`, so it inherits the
   * direction from it rather than from the control — in `dir="rtl"` the trigger was set from
   * the right and the list below it from the left (measured: `direction: rtl` on the trigger
   * against `ltr` on the panel). It shows only once the panel is open, so no screenshot of the
   * resting state would have caught it, and the stylesheet is impeccably logical throughout —
   * `text-align: start` simply resolves the other way.
   *
   * The read goes from the trigger, not from `document.dir`: direction can be scoped just as
   * the theme can, and the panel is to be an extension of THIS control, not of the page.
   */
  protected readonly panelDir = signal<string | null>(null);

  /**
   * The panel's width and anchor point: inside the chrome `pct-field` draws the border, so the
   * panel lines up with **it** rather than with the trigger, which stands in a column inset by
   * padding and decorations. A standalone control is its own border.
   */
  protected readonly anchor = computed(() => this.fieldApi?.surface() ?? null);

  /** The anchor width measured on opening — the reference for the panel. */
  private readonly anchorWidth = signal(0);

  /**
   * The width handed to the overlay. An empty string means „do not set it" — the content then
   * decides the width, and `overlayMinWidth` guards the lower bound so that the panel is never
   * narrower than the control.
   */
  protected readonly overlayWidth = computed(() => {
    const width = this.panelWidth();
    if (width === 'auto') return '';
    return width === 'field' ? this.anchorWidth() : width;
  });

  protected readonly overlayMinWidth = computed(() =>
    this.panelWidth() === 'auto' ? this.anchorWidth() : '',
  );

  /**
   * The panel drops below the control, and with no room at the bottom jumps above it (the
   * second position). Horizontally it keeps the declared alignment — fitting inside the window
   * is the job of the CDK strategy's `push`.
   */
  protected readonly panelPositions = computed<ConnectedPosition[]>(() => {
    const x = this.panelAlign();
    return [
      { originX: x, originY: 'bottom', overlayX: x, overlayY: 'top' },
      { originX: x, originY: 'top', overlayX: x, overlayY: 'bottom' },
    ];
  });

  /** Index of the option active by keyboard (not the same as the selected one). */
  protected readonly activeIndex = signal(-1);

  /**
   * Index of the selected option (`-1` when there is none). What is computed is the **index**
   * rather than the option itself, because the template compares by position anyway —
   * otherwise every row of the list would call the comparison on every detection pass.
   *
   * `null`/`undefined` is filtered out before the comparison: a custom comparator then only
   * receives the values it declared itself (`(a, b) => a.id === b.id` would blow up on
   * `null`).
   */
  protected readonly selectedIndex = computed(() => {
    const current = this.value();
    if (current === null || current === undefined) return -1;
    const same = this.compareWith();
    return this.options().findIndex((o) => same(o.value, current));
  });

  protected readonly selectedOption = computed(
    () => this.options()[this.selectedIndex()] ?? null,
  );

  protected readonly displayText = computed(
    () => this.selectedOption()?.label ?? '',
  );

  /** A library string read at render time — see `placeholder`. */
  protected readonly placeholderText = computed(
    () => this.placeholder() ?? this.texts().selectPlaceholder,
  );

  // The shared message logic from `core` — not duplicated in every control.
  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
  });
  protected readonly errorText = this.messages.errorText;
  readonly showInvalid = this.messages.showInvalid;

  /** Inside the chrome the chrome renders the message, not the control. */
  protected readonly showError = computed(
    () => !this.inField && this.messages.showError(),
  );

  protected readonly describedBy = computed(() =>
    this.inField
      ? this.fieldDescribedBy()
      : pctDescribedBy([
          [this.hintId, this.hint() !== ''],
          [this.errorId, this.messages.showError()],
        ]),
  );

  /** Id of the active option, for `aria-activedescendant`. */
  protected readonly activeOptionId = computed(() => {
    const i = this.activeIndex();
    return this.open() && i >= 0 ? this.optionId(i) : null;
  });

  protected optionId(index: number): string {
    return `${this.uid}-option-${index}`;
  }

  constructor() {
    this.fieldApi?.attach(this);

    // The active option has to be visible in a scrolling list.
    effect(() => {
      const i = this.activeIndex();
      if (!this.open() || i < 0) return;
      // The list is indexed instead of building a selector from the id — that needs no
      // `CSS.escape` (absent in jsdom) and matches the semantics of activeIndex directly.
      const el = this.panel()?.nativeElement.querySelectorAll<HTMLElement>(
        '[data-pct-part="option"]',
      )[i];
      el?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  // --- interaction ---

  private get interactive(): boolean {
    return !this.disabled() && !this.readonly();
  }

  protected toggle(): void {
    if (!this.interactive) return;
    if (this.open()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  protected openPanel(): void {
    if (!this.interactive) return;
    const trigger = this.trigger().nativeElement;
    this.panelTheme.set(
      this.hostRef.nativeElement
        .closest('[data-theme]')
        ?.getAttribute('data-theme') ?? null,
    );
    const style = getComputedStyle(trigger);
    this.panelFont.set({ family: style.fontFamily, size: style.fontSize });
    this.panelDir.set(style.direction);
    this.anchorWidth.set((this.anchor() ?? trigger).offsetWidth);
    this.open.set(true);
    // The selected option becomes active, or the first available one when there is no choice.
    const selected = this.selectedIndex();
    this.activeIndex.set(selected >= 0 ? selected : this.firstEnabled());
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.activeIndex.set(-1);
  }

  protected selectAt(index: number): void {
    const option = this.options()[index];
    if (!option || option.disabled || !this.interactive) return;
    this.value.set(option.value);
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive) return;
    const key = event.key;

    if (!this.open()) {
      // Opening: the arrows, Enter, space or Alt+ArrowDown.
      if (
        key === 'ArrowDown' ||
        key === 'ArrowUp' ||
        key === 'Enter' ||
        key === ' '
      ) {
        event.preventDefault();
        this.openPanel();
      }
      return;
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(this.firstEnabled());
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(this.lastEnabled());
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectAt(this.activeIndex());
        break;
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
      case 'Tab':
        // Tab closes the list and lets focus leave the control.
        this.close();
        break;
      default:
        if (key.length === 1) this.typeahead(key);
    }
  }

  // --- navigation ---

  private enabledIndexes(): number[] {
    return this.options()
      .map((o, i) => (o.disabled ? -1 : i))
      .filter((i) => i >= 0);
  }

  private firstEnabled(): number {
    const list = this.enabledIndexes();
    return list.length > 0 ? list[0] : -1;
  }

  private lastEnabled(): number {
    const list = this.enabledIndexes();
    return list.length > 0 ? list[list.length - 1] : -1;
  }

  /** Moves the active option, skipping disabled ones; no wrapping (as a native select). */
  private moveActive(delta: number): void {
    const list = this.enabledIndexes();
    if (list.length === 0) return;
    const current = list.indexOf(this.activeIndex());
    if (current === -1) {
      this.activeIndex.set(delta > 0 ? list[0] : list[list.length - 1]);
      return;
    }
    const next = Math.min(Math.max(current + delta, 0), list.length - 1);
    this.activeIndex.set(list[next]);
  }

  private typeaheadBuffer = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * The timer clearing the buffer would outlive the component: closing the panel with a key
   * right after typing leaves a scheduled call which, once the control is destroyed, keeps it
   * in memory — and in tests hands work over to the next one.
   */
  private readonly typeaheadCleanup = inject(DestroyRef).onDestroy(() =>
    clearTimeout(this.typeaheadTimer),
  );

  /** Typeahead on the first letters — parity with a native `<select>`. */
  private typeahead(char: string): void {
    this.typeaheadBuffer += char.toLowerCase();
    clearTimeout(this.typeaheadTimer);
    this.typeaheadTimer = setTimeout(() => (this.typeaheadBuffer = ''), 500);

    const match = this.options().findIndex(
      (o) =>
        !o.disabled && o.label.toLowerCase().startsWith(this.typeaheadBuffer),
    );
    if (match >= 0) this.activeIndex.set(match);
  }

  /** Called by signal forms (`focusBoundControl()`, for instance). */
  focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }

  /** Called by signal forms when the form is reset. */
  reset(): void {
    this.value.set(this.emptyValue());
    this.close();
  }
}
