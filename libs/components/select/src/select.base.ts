import { NgTemplateOutlet } from '@angular/common';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  model,
  output,
  Signal,
  signal,
  viewChild,
  contentChild,
} from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  PCT_TEXTS,
  pctDescribedBy,
  pctAttachToField,
  pctFieldMessages,
  pctListNavigation,
  pctOverlay,
  PctAnnouncer,
  PctCompareWith,
  PctFieldAppearance,
  PctFieldControl,
  PctFieldCursor,
  PctFocusStays,
  PctLabelStrategy,
  PctOverlayPanel,
  pctSameValue,
  PctSize,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import {
  PctSelectOptionContext,
  PctSelectOptionTemplate,
} from './select.template';
import {
  pctFilterByLabel,
  PctSelectFilter,
  PctSelectItem,
  PctSelectOption,
  PctSelectOptionGroup,
  PctSelectPanelAlign,
  PctSelectPanelWidth,
} from './select.types';

/**
 * What the shared template needs imported. Written once, because the two controls draw the
 * SAME file: a second list is a second chance for one of them to lose a directive and take
 * the defect to runtime, where a missing import is an attribute nobody applies.
 */
export const PCT_SELECT_IMPORTS = [
  NgTemplateOutlet,
  OverlayModule,
  PctFocusStays,
  PctIcon,
  PctOverlayPanel,
] as const;

/**
 * One drawable row of the panel: the option a consumer wrote, its position in the walk, and
 * whether it can be reached. `disabled` stands BESIDE the option instead of inside a copy of
 * it — a group's `disabled` reaches its options, and rewriting them would hand a consumer's
 * `let-option` an object their own list does not contain.
 */
export interface PctSelectRow<T> {
  readonly option: PctSelectOption<T>;
  readonly index: number;
  readonly disabled: boolean;
}

/** A heading with its rows, or — when `label` is `null` — the rows standing before any. */
export interface PctSelectSection<T> {
  readonly label: string | null;
  readonly rows: readonly PctSelectRow<T>[];
}

/**
 * A group is told from an option by the shape of what it carries, and nothing else. The
 * narrowing is written once: three copies of it are three chances to read the same list
 * differently.
 */
function isGroup<T>(item: PctSelectItem<T>): item is PctSelectOptionGroup<T> {
  return Array.isArray((item as PctSelectOptionGroup<T>).options);
}

/**
 * Everything the single-choice and the many-choice combobox have in common — which is
 * everything except the value.
 *
 * It is a base class and not a `core` function, and that is the one place this library keeps
 * for the shape 0013 pushed away: the two controls draw **one template file**, so what the
 * template calls has to be members of both classes, and Angular declares an input in exactly
 * one way — as a field. A kit object would have moved the plumbing and left the fifteen input
 * declarations behind, that is, left the part that drifts. What 0013 refused is a base class
 * under **somebody else's** template ([0034](../../../../docs/decisions/0034-multiplicity-is-a-tag.md));
 * this one is not exported from the entrypoint and sits under a template of ours.
 *
 * The subclass owns four things, and each of them is the value in another guise: what
 * `value` is, which rows it marks, what the trigger reads, and what a pick does.
 */
@Directive({
  host: {
    class: 'pct-select',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-open]': 'open() ? "" : null',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    // The one state a consumer's stylesheet cannot derive from the parts: both controls draw
    // the same DOM, so the tag is what tells them apart, and a tag is not a selector the
    // parts contract exposes (`req-api-attributes`).
    '[attr.data-pct-multiple]': 'multiple ? "" : null',
    // Not "there is a cross standing" but "this control has one": the space it takes is
    // reserved by the input alone, so a trigger's text does not reflow the moment an answer
    // appears under it.
    '[attr.data-pct-clearable]': 'clearable() ? "" : null',
    // Inside the chrome `pct-field` draws the border and the label — the control hands
    // them over.
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export abstract class PctSelectBase<T> implements PctFieldControl {
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);

  // --- what the value is, and nothing else (the subclass) ---

  /**
   * Whether the control carries a list of values. A **constant of the class** rather than an
   * input: an input is a value at runtime and the compiler relates no input to the type of
   * another, so a `multiple` a consumer could write would leave `value` typed as both shapes
   * at once and check neither ([0034](../../../../docs/decisions/0034-multiplicity-is-a-tag.md)).
   */
  abstract readonly multiple: boolean;

  /** What the trigger shows when there is a choice — one label, or the chosen ones. */
  protected abstract readonly displayText: Signal<string>;

  /** Whether the row at this position is part of the value. */
  protected abstract isSelected(index: number): boolean;

  /**
   * Back to no answer at all. The subclass owns it because the empty state is the value's
   * shape: `emptyValue` on one side, the empty list on the other.
   */
  protected abstract clearValue(): void;

  /** What a click or `Enter` on a row does — the one behaviour the two do not share. */
  protected abstract selectAt(index: number): void;

  /**
   * The row the walk starts on when the panel opens, or `-1` for "the first reachable one".
   * A list already answered is opened where the answer is.
   */
  protected abstract initialActive(): number;

  /**
   * Called by signal forms when the form is reset — the same two things a clear does, plus
   * the panel: a form put back to its start has no open list hanging off it. Written once
   * here rather than twice below, because "what the empty state is" is the subclass's
   * (`clearValue`) and "what a reset means" is not.
   */
  reset(): void {
    this.clearValue();
    this.close();
  }

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
   * back to an option (the first match wins), so of two options sharing one value only the
   * earlier is ever reachable — picking the later one shows the earlier one's label and leaves
   * `aria-selected` on it. Which option an equal value denotes is not the component's to
   * decide, so it does not repair the list quietly: in dev mode it says so.
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
   *
   * An entry may also be a **group** — a heading and options of its own
   * (`PctSelectOptionGroup`), which is what a native `<optgroup>` draws. Groups and bare
   * options mix in one list, in the order they are written. Everything below reads the list
   * through `rows()`, the flat walk the panel draws: the uniqueness above is a promise about
   * the whole control and not about one heading, and an index that meant a different thing
   * inside a group would put `aria-activedescendant` and the keyboard on different rows.
   */
  readonly options = input<readonly PctSelectItem<T>[]>([]);
  readonly label = input<string>('');
  readonly hint = input<string>('');

  /**
   * The accessible name of a control with no visible label — an INPUT rather than an
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
   * header of the column the control sits in. It wins over `ariaLabel` and over `label`, in
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
   * Whether the trigger is a **text field** and the list narrows to what is typed into it.
   *
   * It is an input and not a third tag, and the line between the two is the one
   * [0034](../../../../docs/decisions/0034-multiplicity-is-a-tag.md) drew: a tag is what the
   * **type** cannot say otherwise, and filtering changes no type — `value` is `T | null` here
   * and `T[]` there, filter or no filter. As a tag it would have multiplied the family instead
   * of extending it (`pct-filter-select`, `pct-multi-filter-select`), which is four tags for
   * two questions ([0035](../../../../docs/decisions/0035-a-filter-is-a-question-not-a-value.md)).
   *
   * What it changes is the ELEMENT the trigger is: a select-only combobox is a `<button>`, a
   * filtering one an `<input>`, because that is what each role needs — and the key map splits
   * with it, the caret taking the letters, `Home`/`End` and the space bar.
   */
  readonly filterable = input(false, { transform: booleanAttribute });

  /**
   * What has been typed into the trigger. A `model`, so an application filtering on a server
   * can read the question and answer it with another `options` list — and the control still
   * owns the clearing, because the question belongs to the panel: it is set to `''` when the
   * panel closes and when a pick answers it. It is **not** the value and never becomes one.
   */
  readonly filterText = model<string>('');

  /**
   * What counts as a match. The default folds case on the label and asks for `includes`;
   * anything more than that — a second field, a code beside the label, an idea of which
   * letters are the same letter — is the application's, because it is the application that
   * knows the language (`pctFilterByLabel`, and `lesson-101` for why).
   */
  readonly filterWith = input<PctSelectFilter<T>>(pctFilterByLabel);

  /**
   * Whether the control draws a cross that takes back what the trigger is showing — the
   * answer, or the question being typed while the panel is up
   * ([0036](../../../../docs/decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)).
   *
   * An input on both tags, by 0034's rule read the same way `filterable` was: clearing changes
   * no type — an emptied `pct-select` is `emptyValue` and an emptied `pct-multi-select` is
   * `[]`, both of them states the value could already reach.
   *
   * Off by default, because a cross is a promise the application has to want: a required
   * field whose answer can be taken back in one press is a form that can be left invalid by
   * accident, and only its author knows whether that is a road worth having.
   */
  readonly clearable = input(false, { transform: booleanAttribute });

  /**
   * Width of the dropdown panel — equal to the control by default (`'field'`). The panel then
   * comes out exactly from its edge, so the list reads as an extension of the field. `'auto'`
   * fits the width to the longest option (without narrowing the panel below the control), and
   * a CSS length sets it outright.
   */
  readonly panelWidth = input<PctSelectPanelWidth>('field');

  /** Alignment of the panel to the control when it is wider or narrower than it. */
  readonly panelAlign = input<PctSelectPanelAlign>('start');

  // A `<button>` or an `<input>`, whichever branch of the template is standing — one of them
  // always is, which is what keeps the query `required`.
  protected readonly trigger =
    viewChild.required<ElementRef<HTMLElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  // --- templates (req-api-templates) ---

  /**
   * The consumer's option row, if they wrote one. Queried by the slot's class rather than by
   * a token, because the class is what carries the context type.
   */
  protected readonly optionTemplate = contentChild(PctSelectOptionTemplate);

  // --- a11y ---

  private readonly uid: string;
  protected readonly triggerId: string;
  protected readonly labelId: string;
  protected readonly listboxId: string;
  protected readonly hintId: string;
  protected readonly errorId: string;

  // --- working with the chrome (req-api-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });

  /** Whether the control is inside the chrome — it then hands over label and messages. */
  protected readonly inField = this.fieldApi !== null;

  /** A `<button>` is a labelable element, so `<label for>` works. */
  readonly controlId: string;
  readonly labelStrategy: PctLabelStrategy = 'for';
  readonly fieldAppearance: PctFieldAppearance = 'boxed';
  /**
   * A getter and not a field, because the answer changes with an input: over a filtering
   * control a click places the caret, over a select-only one it opens the list. The chrome
   * reads this inside a `computed`, so a getter that reads a signal is itself a signal to
   * whoever reads it there — the same reactivity as a field, without widening the contract
   * every other control implements.
   */
  get fieldCursor(): PctFieldCursor {
    return this.filterable() ? 'text' : 'pointer';
  }

  /**
   * A click on the border outside the trigger opens the list — as a click on the trigger, and
   * with the trigger's own rule about what a second click does.
   */
  activate(): void {
    this.press();
  }

  /** Set by the chrome when one is present. */
  private readonly fieldDescribedBy = signal<string | null>(null);

  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  /**
   * The panel's anchor point: inside the chrome `pct-field` draws the border, so the panel
   * lines up with **it** rather than with the trigger, which stands in a column inset by
   * padding and decorations. A standalone control is its own border.
   */
  protected readonly anchor = computed(() => this.fieldApi?.surface() ?? null);

  /**
   * The overlay half of the control, from `core`: the open state, the anchor's width and the
   * properties a panel outside the host tree stops inheriting — theme, typeface, size and
   * writing direction (`lesson-35`). Three of the four were found here one at a time, each by
   * a measurement in the browser, which is why the reading is no longer this component's to
   * remember: `show()` **is** the read, so there is no way to open a panel and carry nothing.
   */
  private readonly panelOverlay = pctOverlay({
    from: () => this.trigger().nativeElement,
    anchor: () => this.anchor(),
  });

  protected readonly open = this.panelOverlay.open;

  /** What the panel is given explicitly, because the DOM tree hands it nothing. */
  protected readonly inherited = this.panelOverlay.inherited;

  /**
   * The width handed to the overlay. An empty string means "do not set it" — the content then
   * decides the width, and `overlayMinWidth` guards the lower bound so that the panel is never
   * narrower than the control.
   */
  protected readonly overlayWidth = computed(() => {
    const width = this.panelWidth();
    if (width === 'auto') return '';
    return width === 'field' ? this.panelOverlay.anchorWidth() : width;
  });

  protected readonly overlayMinWidth = computed(() =>
    this.panelWidth() === 'auto' ? this.panelOverlay.anchorWidth() : '',
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
   * The question, as the list sees it: what was typed, or nothing at all when the control
   * takes no questions. A control that is not `filterable` is one whose `filterText` nobody
   * can have changed — but the input exists on both, so the state is read through the flag
   * rather than through the string, and a `[filterText]` bound on a plain select narrows
   * nothing.
   */
  protected readonly query = computed(() =>
    this.filterable() ? this.filterText() : '',
  );

  /**
   * The predicate the list is walked with — the consumer's over a real question, and one that
   * lets everything through when there is none. Built once per change of the question rather
   * than per option: `filterWith` is the application's function, so calling it is the
   * expensive part and deciding whether to call it at all is not.
   */
  private readonly matches = computed<(option: PctSelectOption<T>) => boolean>(
    () => {
      const query = this.query();
      if (query === '') return () => true;
      const test = this.filterWith();
      return (option) => test(option, query);
    },
  );

  /**
   * Every option the list holds, flat, in the order they were written — **before** the
   * question. This is what the VALUE is read against, and the two are kept apart on purpose:
   * a filter narrows the panel and never the value, so a chosen option the question hides is
   * still the one the trigger names, and a many-choice pick still writes the list's order and
   * not the visible list's ([0035](../../../../docs/decisions/0035-a-filter-is-a-question-not-a-value.md)).
   */
  protected readonly allOptions = computed<readonly PctSelectOption<T>[]>(() =>
    this.options().flatMap((item) => (isGroup(item) ? item.options : [item])),
  );

  /**
   * The list as the panel draws it: sections in the order they were written, each with the
   * rows below its heading. An **empty group is dropped here** rather than hidden by the
   * template — a heading over nothing is noise on the screen and an empty `role="group"` in
   * the tree, and dropping it in one place keeps the section list and the row list agreeing
   * about what exists.
   *
   * The index a row carries is its position in the WHOLE list, handed out while walking:
   * it is what the keyboard moves over, what `aria-activedescendant` names and what an option
   * id is built from, so it cannot restart inside a heading.
   */
  protected readonly sections = computed<readonly PctSelectSection<T>[]>(() => {
    const sections: { label: string | null; rows: PctSelectRow<T>[] }[] = [];
    const keep = this.matches();
    let index = 0;

    for (const item of this.options()) {
      if (isGroup(item)) {
        const rows = item.options.filter(keep).map((option) => ({
          option,
          index: index++,
          // A disabled group disables what stands under it — `<optgroup disabled>`.
          disabled: option.disabled === true || item.disabled === true,
        }));
        // A heading whose options the question has all taken away goes with them: it is the
        // same rule as an empty group written empty, arrived at from the other side.
        if (rows.length > 0) sections.push({ label: item.label, rows });
        continue;
      }
      if (!keep(item)) continue;

      // Bare options following one another belong to ONE nameless section. What keeps them
      // out of a wrapper the listbox would have to own is the missing label, not the merging
      // — `role="option"` inside a plain `<div>` inside `role="listbox"` is an option with
      // no owner, and a nameless section draws no element at all.
      //
      // So the merging is INVISIBLE to every behavioural test, and the mutation run says so:
      // both mutants here survive, because a flat list drawn as one section and as n sections
      // is the same DOM. What it buys is the view count — a hundred bare options are one
      // embedded view with a hundred rows instead of a hundred views with one row each — and
      // that is the reason it stays.
      let last = sections[sections.length - 1];
      if (last === undefined || last.label !== null) {
        last = { label: null, rows: [] };
        sections.push(last);
      }
      last.rows.push({
        option: item,
        index: index++,
        disabled: item.disabled === true,
      });
    }
    return sections;
  });

  /**
   * The same rows, flat. Every reading of the list below goes through here — the walk, the
   * selection, the duplicate report, the empty panel — because a group is a way of drawing
   * the list and not a second list.
   */
  protected readonly rows = computed<readonly PctSelectRow<T>[]>(() =>
    this.sections().flatMap((section) => section.rows),
  );

  /**
   * The keyboard walk over the list — the shared machinery from `core` rather than private
   * methods here, extracted before the second control that needs it (`lesson-21`). What the
   * control keeps is the key map: which key opens, picks and closes is a property of the
   * combobox role, not of walking a list.
   */
  private readonly nav = pctListNavigation({
    items: this.rows,
    isDisabled: (row) => row.disabled,
    label: (row) => row.option.label,
  });

  /** Index of the option active by keyboard (not the same as a selected one). */
  protected readonly activeIndex = this.nav.activeIndex;

  /** A library string read at render time — see `placeholder`. */
  protected readonly placeholderText = computed(
    () => this.placeholder() ?? this.texts().selectPlaceholder,
  );

  /**
   * What the **text** trigger holds. While the panel is up it is the question, always: one
   * source, one direction, and no second state that could disagree with the letters on the
   * screen. While it is down it is the answer — the same string the button branch draws.
   */
  protected readonly triggerText = computed(() =>
    this.open() ? this.filterText() : this.displayText(),
  );

  /**
   * …and what stands behind it while it is empty. An open panel moves the chosen label here,
   * so the answer is still readable while the question is being typed — as a **placeholder**
   * and not as the field's text, because a placeholder is nobody's value: a reader announces
   * it as the field's hint and never as what the field holds.
   */
  protected readonly triggerPlaceholder = computed(() => {
    const chosen = this.displayText();
    return this.open() && chosen !== '' ? chosen : this.placeholderText();
  });

  /**
   * Whether the trigger is holding the question rather than the answer — the one state in
   * which a filtering control's text is not its value. The cross reads the same signal the
   * text does, so what it takes back is what the eye can see and never the other one
   * ([0036](../../../../docs/decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)).
   */
  private readonly showsQuestion = computed(
    () => this.filterable() && this.open(),
  );

  /**
   * Whether there is an answer to take back — read off the **text the trigger draws** and not
   * off the value, because that is the same rule once more. A value no option carries shows
   * nothing on the trigger, and a cross over a control that looks empty would be offering to
   * undo something the user cannot see; a value equal to `emptyValue` draws nothing either,
   * which is what keeps `0` and `''` answers wherever an application declared them to be.
   */
  private readonly hasChoice = computed(() => this.displayText() !== '');

  /**
   * Whether the cross is standing. Not `clearable()` alone: a control that shows one over
   * nothing is a button that does nothing, and one that shows it over a value nobody may
   * change is a button that lies — so the state it clears has to be there, and the control
   * has to be one a user can still write to.
   */
  protected readonly showClear = computed(
    () =>
      this.clearable() &&
      this.interactive &&
      (this.showsQuestion() ? this.query() !== '' : this.hasChoice()),
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
          [this.errorId, this.showError()],
          [this.hintId, !this.showError() && this.hint() !== ''],
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

  /** What a group's heading is called, so `aria-labelledby` on the group can point at it. */
  protected groupId(index: number): string {
    return `${this.uid}-group-${index}`;
  }

  /**
   * The rows of one section, by its position. The panel's row markup is declared once and
   * drawn through `ngTemplateOutlet`, and an inline `<ng-template>`'s `let-` variable is
   * typed `any` — a context guard needs an inference site and a local template has none
   * ([`lesson-84`](../../../../docs/lessons.md#lesson-84)). So what travels through the
   * context is the index alone, and the rows come back through here with their type: an
   * `any` that reaches one number instead of every binding of the row.
   */
  protected sectionRows(index: number): readonly PctSelectRow<T>[] {
    return this.sections()[index]?.rows ?? [];
  }

  /**
   * What an open panel with nothing in it says, and to whom. The sentence inside the panel is
   * drawn for the eye: focus stays on the trigger, so a screen reader is pointed at no part of
   * an empty listbox — `aria-activedescendant` has no option to name and nothing describes the
   * panel. The same sentence therefore goes to the shared polite channel, where the reader is
   * (`req-a11y-built-in`, [0026](../../../../docs/decisions/0026-one-channel-per-politeness.md)).
   *
   * It is withdrawn as the panel closes, and again when the control is destroyed while open —
   * a channel holding a sentence nobody can see any more is a channel that will not repeat it.
   */
  private readonly announcer = inject(PctAnnouncer);

  /**
   * Which of the two sentences an empty panel carries. They are two facts and not one phrasing
   * of one: "there is nothing to choose from" is the list's state, "nothing here answers what
   * you typed" is the question's, and a user three letters into a question is owed the second.
   */
  protected readonly emptyText = computed(() =>
    this.query() === ''
      ? this.texts().selectEmpty
      : this.texts().selectNoMatches,
  );

  private readonly emptyMessage = computed(() =>
    this.open() && this.rows().length === 0 ? this.emptyText() : '',
  );

  /**
   * The id prefix is the tag, so an id in the tree names the control it belongs to. It comes
   * through `super()` rather than from an abstract field: a subclass's field initialisers run
   * AFTER the base's, and the ids are read while the base is still being built.
   */
  constructor(idPrefix: string) {
    this.uid = nextPctId(idPrefix);
    this.triggerId = `${this.uid}-trigger`;
    this.labelId = `${this.uid}-label`;
    this.listboxId = `${this.uid}-listbox`;
    this.hintId = `${this.uid}-hint`;
    this.errorId = `${this.uid}-error`;
    this.controlId = this.triggerId;

    pctAttachToField(this.fieldApi, this);

    effect(() => {
      const message = this.emptyMessage();
      if (message !== '') this.announcer.announce(message);
      else {
        // Both, because the question dies WITH the panel: by the time this runs the query is
        // already `''`, so the sentence to withdraw is no longer the one `emptyText()` names.
        // `retract` takes off only what is still there, which is what makes asking twice free.
        this.announcer.retract(this.texts().selectEmpty);
        this.announcer.retract(this.texts().selectNoMatches);
      }
    });

    inject(DestroyRef).onDestroy(() =>
      this.announcer.retract(this.emptyMessage()),
    );

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
   * What an option template is handed for one row. Built here rather than as a literal in the
   * template: a template travels to the consumer as a string, so its bytes are the artefact's
   * ([`lesson-67`](../../../../docs/lessons.md#lesson-67)).
   */
  protected optionContext(row: PctSelectRow<T>): PctSelectOptionContext<T> {
    return {
      $implicit: row.option,
      index: row.index,
      active: row.index === this.activeIndex(),
      selected: this.isSelected(row.index),
      // The row's flag and not the option's: a group carries the state its options do not.
      disabled: row.disabled,
    };
  }

  /**
   * Two options that `compareWith` calls equal. Comparison is pairwise and therefore O(n²),
   * because the comparator belongs to the application: a key that a `Set` could hold exists
   * only for the default identity, and a scan that measures one case and not the other would
   * be worse than one that measures both. It runs under `isDevMode()` alone.
   */
  private warnOnDuplicateValues(): void {
    // The WHOLE list, not the one the panel is showing: a duplicate a question happens to
    // hide is still a duplicate, and the positions in the message are the ones the consumer
    // wrote rather than the ones three typed letters left standing.
    const options = this.allOptions();
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
      `[${this.tag}] Options with the same value: ${pairs.join(', ')}. ` +
        `A value maps back to an option through \`compareWith\`, and the first match wins: ` +
        `the later option can never show as selected, and choosing it displays the ` +
        `earlier one's label. Give the options distinct values, or a \`compareWith\` ` +
        `that tells them apart.`,
    );
  }

  /** The tag, for a message a consumer reads in their console. */
  private get tag(): string {
    return this.multiple ? 'pct-multi-select' : 'pct-select';
  }

  // --- interaction ---

  protected get interactive(): boolean {
    return !this.disabled() && !this.readonly();
  }

  /**
   * What a press on the trigger does — and the two triggers answer differently, which is the
   * one thing about the mouse this step changes. A press on a `<button>` toggles: it is a
   * switch, and pressing a switch that is on turns it off. A press on a **text field** is a
   * caret being placed — a user clicking between two letters of what they have typed is
   * aiming at a position, not asking for the list to go away — so it opens and never closes.
   *
   * What closes the filtering panel is therefore Escape, Tab, a pick, or a click outside it;
   * the CDK's outside click never fires here, because it excludes the overlay's own origin.
   */
  protected press(): void {
    // No guard of its own on `disabled`/`readonly`: `openPanel()` carries one, and a control
    // that went readonly with its panel up should still shut it. A second guard here was a
    // line no test could ever fail on — the mutation run said so before it was deleted.
    if (this.open() && !this.filterable()) this.close();
    else if (!this.open()) this.openPanel();
  }

  protected openPanel(): void {
    if (!this.interactive) return;
    this.panelOverlay.show();
    // The answer already given becomes the active row, or the first available one when there
    // is none.
    const start = this.initialActive();
    if (start >= 0) {
      this.nav.setActive(start);
    } else {
      this.nav.first();
    }
  }

  protected close(): void {
    if (!this.open()) return;
    this.panelOverlay.hide();
    this.nav.clear();
    // The question does not outlive the panel: a trigger that reopened onto three letters
    // typed a minute ago would be showing a list narrowed by something the user cannot see.
    this.filterText.set('');
  }

  /**
   * Takes the question back while the panel stays up — what a pick does on a many-choice
   * list. The cursor is put back on the row the pick landed on, **by identity**: the list has
   * just widened underneath it, so the position that row had among three matches names a
   * different option among thirty.
   */
  protected clearFilter(landed: PctSelectOption<T>): void {
    // The guard is for the CONSUMER's signal, not for the work: with no question standing,
    // clearing writes `''` into a `[(filterText)]` somebody may have bound and the cursor
    // lands where it already was. A mutation run cannot see the difference — nothing in this
    // repository binds the question on a control that takes none — and the write is real, so
    // the guard stays and the reason stands here rather than in a case that cannot be written.
    if (this.query() === '') return;
    this.filterText.set('');
    const index = this.rows().findIndex((row) => row.option === landed);
    this.nav.setActive(index);
  }

  /**
   * The cross. It takes back **what the trigger is showing**: the question while the panel is
   * up on a filtering control, the answer in every other state
   * ([0036](../../../../docs/decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)).
   * The panel is left exactly as it was found — clearing is not an opening and not a closing,
   * and a list that vanished under the press would take the next choice with it.
   *
   * No guard of its own on "is there anything to take back": `showClear()` is what draws the
   * button and what lets Escape through, so a second reading here would be a line no test
   * could ever fail on.
   */
  protected clear(): void {
    if (this.showsQuestion()) {
      this.filterText.set('');
      // The list has just widened, so the row under the cursor is a different option — the
      // walk starts again from the top, as it does after every keystroke that narrows it.
      this.nav.first();
      return;
    }
    this.clearValue();
  }

  /**
   * Why the press on the cross is answered on `mousedown` and not only on `click`: the button
   * disappears the moment it works — there is nothing left to clear — and a focused element
   * removed from the tree leaves focus on `body`, which is the end of the key map. Refusing
   * the default keeps focus where it already was, on the trigger, so nothing has to be put
   * back afterwards.
   */
  protected onClearPress(event: Event): void {
    event.preventDefault();
  }

  /**
   * A letter typed into the trigger. The field's own text IS the question — there is no
   * second state to keep in step with it — and the first letter of a question is also what
   * opens the panel, because a list nobody can see cannot be narrowed usefully.
   *
   * The active row goes to the first one still standing: the list under the cursor has
   * changed, so a cursor left where it was would be pointing at a row that has moved, and
   * `aria-activedescendant` would name an id that is no longer in the tree.
   */
  protected onFilterInput(event: Event): void {
    if (!this.interactive) return;
    this.filterText.set((event.target as HTMLInputElement).value);
    // `show()` on an open panel is not free: it re-reads the computed style of the anchor and
    // writes a NEW `inherited` object, so every keystroke would repaint what an overlay severs.
    // Nothing observable changes, so the mutant that drops this guard survives — the cost is
    // the reason, and it is written here.
    if (!this.open()) this.panelOverlay.show();
    this.nav.first();
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

  /** The row a pick lands on, or `null` when it can take none. */
  protected pickable(index: number): PctSelectRow<T> | null {
    const row = this.rows()[index];
    return !row || row.disabled || !this.interactive ? null : row;
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive) return;
    const key = event.key;

    if (!this.open()) {
      // Opening: the arrows, Enter, space or Alt+ArrowDown — and where the trigger is a text
      // field the last two are not ours to take. A space is a character of the question and
      // Enter is the form's submit; a control that answered them here would be taking back
      // what the platform gives an `<input>` for free (`req-api-platform`). Typing opens the
      // panel on the other channel, the one a text field has and a button has not: `input`.
      const opens =
        key === 'ArrowDown' ||
        key === 'ArrowUp' ||
        (!this.filterable() && (key === 'Enter' || key === ' '));
      if (opens) {
        event.preventDefault();
        this.openPanel();
        return;
      }
      // Escape over a shut panel takes the answer back — the keyboard's half of the cross,
      // and the platform's own answer where the platform has one: the clear control of an
      // `<input type="search">` is in no engine's tab order, and Escape is what empties it
      // ([0036](../../../../docs/decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)).
      //
      // The key is spent ONLY when it did something. A control with nothing to clear leaves
      // the event alone, so it travels on to whatever this select is standing inside — a
      // dialog, above all, which is the one place where swallowing it would be a defect the
      // user reads as "Escape stopped working".
      if (key === 'Escape' && this.showClear()) {
        event.preventDefault();
        this.clear();
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
        // In a text field the ends belong to the caret: a user with a question typed in front
        // of them presses Home to reach its first letter, and a list that jumped to its first
        // row instead would have answered a key it was not sent.
        if (this.filterable()) break;
        event.preventDefault();
        this.nav.first();
        break;
      case 'End':
        if (this.filterable()) break;
        event.preventDefault();
        this.nav.last();
        break;
      case 'Enter':
        event.preventDefault();
        this.selectAt(this.activeIndex());
        break;
      case ' ':
        // A space picks on a button and is a character in a text field — "New Zealand" is two
        // words, and a list that closed on the space between them could never be filtered by
        // the second.
        if (this.filterable()) break;
        event.preventDefault();
        this.selectAt(this.activeIndex());
        break;
      case 'Escape':
        // The single owner of this key, since the panel's overlay is told not to answer it
        // (`cdkConnectedOverlayDisableClose`). `preventDefault` is the part that needs an
        // author: it is what tells whatever the control is standing inside — a dialog, above
        // all — that the key has been spent here, and the CDK's own handler could close the
        // panel but could never promise that.
        event.preventDefault();
        this.close();
        break;
      case 'Tab':
        // Tab closes the list and lets focus leave the control.
        this.close();
        break;
      default:
        // Typeahead on the first letters — parity with a native `<select>`. A filtering
        // control has no use for it: the letters are already going somewhere, and a walk that
        // jumped to a prefix WITHIN the list the same letters had just narrowed would be two
        // answers to one keystroke.
        if (!this.filterable() && key.length === 1) this.nav.typeahead(key);
    }
  }

  /** Called by signal forms (`focusBoundControl()`, for instance). */
  focus(options?: FocusOptions): void {
    this.trigger().nativeElement.focus(options);
  }
}
