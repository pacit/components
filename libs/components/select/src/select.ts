import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
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
  pctListNavigation,
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
 * It implements the ARIA "select-only combobox" pattern: the trigger has `role="combobox"`, the
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
   * `T | null`, because "nothing selected" is a state reachable for every `T`: the select
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

  /**
   * The option list. **The values have to be unique** by `compareWith`: a value is what maps
   * back to an option (`selectedIndex` takes the first match), so of two options sharing one
   * value only the earlier is ever reachable — picking the later one shows the earlier one's
   * label and leaves `aria-selected` on it. Which option an equal value denotes is not the
   * component's to decide, so it does not repair the list quietly: in dev mode it says so.
   *
   * The panel's loop tracks `$index` and not the value. Every binding of a row is already a
   * function of the index — the id, `aria-selected`, both flags, both handlers — so keying by
   * value moves DOM that is rewritten in place anyway, while a list rebuilt from a response
   * (the very case `compareWith` exists for) arrives as all new references and would re-create
   * every row. It also takes away Angular's NG0955, which is the reason the report above had
   * to be written: it was the only thing that ever spoke about a duplicated value, and it
   * asked the reader to fix a track expression standing inside a library
   * ([`lesson-66`](../../../../docs/lessons.md#lesson-66)). The reasoning stands here rather
   * than in the template, because a template travels to the consumer as a string and a
   * comment in it is bytes in the artefact ([`lesson-67`](../../../../docs/lessons.md#lesson-67)).
   */
  readonly options = input<readonly PctSelectOption<T>[]>([]);
  readonly label = input<string>('');
  readonly hint = input<string>('');

  /**
   * The accessible name of a select with no visible label — an INPUT rather than an
   * `aria-label` written on the tag, because the tag cannot carry one: `role="combobox"` sits
   * on the trigger inside, the host has no role at all, and an ARIA name on a roleless element
   * is ignored (`aria-label` is prohibited for the `generic` role). Without this a standalone
   * select is an **unnamed combobox** and the consumer has no way in
   * ([`req-a11y-built-in`](../../../../docs/requirements/a11y.md#req-a11y-built-in)).
   *
   * It goes to the two elements that carry a role — the trigger and the panel. Set together
   * with a visible `label` it wins over it, that being the accessible-name algorithm rather
   * than a choice of ours: the two then say different things, which is a decision for the
   * caller and not something the component can quietly repair.
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere on the page — a heading, the
   * header of the column the select sits in. It wins over `ariaLabel` and over `label`, in
   * ARIA's order and not ours.
   */
  readonly ariaLabelledby = input<string>('');
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
   * The width handed to the overlay. An empty string means "do not set it" — the content then
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

  /**
   * The keyboard walk over the list — the shared machinery from `core` rather than private
   * methods here, extracted before the second control that needs it (`lesson-21`). What the
   * select keeps is the key map: which key opens, picks and closes is a property of the
   * combobox role, not of walking a list.
   */
  private readonly nav = pctListNavigation({
    items: this.options,
    isDisabled: (option) => option.disabled === true,
    label: (option) => option.label,
  });

  /** Index of the option active by keyboard (not the same as the selected one). */
  protected readonly activeIndex = this.nav.activeIndex;

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

    // An effect and not a one-off: `options` is an input, so the list that duplicates a value
    // is often the second one — the one that arrived from the server.
    if (isDevMode()) effect(() => this.warnOnDuplicateValues());
  }

  /**
   * Two options that `compareWith` calls equal. Comparison is pairwise and therefore O(n²),
   * because the comparator belongs to the application: a key that a `Set` could hold exists
   * only for the default identity, and a scan that measures one case and not the other would
   * be worse than one that measures both. It runs under `isDevMode()` alone.
   */
  private warnOnDuplicateValues(): void {
    const options = this.options();
    const same = this.compareWith();
    const pairs: string[] = [];

    for (let i = 1; i < options.length; i++) {
      for (let j = 0; j < i; j++) {
        if (!same(options[j].value, options[i].value)) continue;
        // Reported against the first option that claims the value — the one that wins.
        pairs.push(
          `${j} ("${options[j].label}") and ${i} ("${options[i].label}")`,
        );
        break;
      }
    }
    if (pairs.length === 0) return;

    console.warn(
      `[pct-select] Options with the same value: ${pairs.join(', ')}. ` +
        `A value maps back to an option through \`compareWith\`, and the first match wins: ` +
        `the later option can never show as selected, and choosing it displays the ` +
        `earlier one's label. Give the options distinct values, or a \`compareWith\` ` +
        `that tells them apart.`,
    );
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
    if (selected >= 0) {
      this.nav.setActive(selected);
    } else {
      this.nav.first();
    }
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.nav.clear();
  }

  /**
   * Hovering an option makes it the active one, so the mouse and the keyboard point at the
   * same place. A pass-through to the walk rather than a call on the signal: `activeIndex` is
   * read-only here — the machinery that decides which entries can be reached owns the writing
   * (`lesson-21`).
   */
  protected activateAt(index: number): void {
    this.nav.setActive(index);
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
        this.nav.move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.nav.move(-1);
        break;
      case 'Home':
        event.preventDefault();
        this.nav.first();
        break;
      case 'End':
        event.preventDefault();
        this.nav.last();
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
        // Typeahead on the first letters — parity with a native `<select>`.
        if (key.length === 1) this.nav.typeahead(key);
    }
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
