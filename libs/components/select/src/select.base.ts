import { NgTemplateOutlet } from '@angular/common';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  afterRenderEffect,
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
  untracked,
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
interface PctSelectRow<T> {
  readonly option: PctSelectOption<T>;
  readonly index: number;
  readonly disabled: boolean;
}

/** A heading with its rows, or — when `label` is `null` — the rows standing before any. */
interface PctSelectSection<T> {
  readonly label: string | null;
  readonly rows: readonly PctSelectRow<T>[];
}

/**
 * A section as the panel really draws it: the rows the window kept, and the height of the
 * ones it did not. `index` is the position in `sections()` and travels with the section
 * because the heading's id is built from it — a window that renumbered its sections would
 * point `aria-labelledby` at a heading standing somewhere else.
 *
 * `lead` and `tail` are that section's OWN skipped rows and are drawn by the group element.
 * A nameless section draws no element, so it carries none: what it skips folds into the
 * panel's, which is where the arithmetic below puts it.
 */
interface PctSelectPanelSection<T> {
  readonly index: number;
  readonly label: string | null;
  readonly rows: readonly PctSelectRow<T>[];
  readonly lead: number;
  readonly tail: number;
}

/** The list as the panel draws it, with the space the rows it did not draw would have taken. */
interface PctSelectPanelView<T> {
  readonly sections: readonly PctSelectPanelSection<T>[];
  readonly lead: number;
  readonly tail: number;
}

/** What the panel's own geometry says, read from the panel after it has drawn. */
interface PctSelectMetrics {
  readonly row: number;
  readonly heading: number;
  readonly viewport: number;
}

/**
 * How many rows are drawn beyond each edge of what the panel shows. A window cut exactly at
 * the edge leaves a strip of nothing on any scroll faster than one row per frame: the row
 * that has to appear is created by the very pass the scroll starts.
 */
const OVERSCAN = 4;

/**
 * The window drawn while nothing has been measured — the first frame after the panel opens,
 * and every frame where there is no layout to read at all. It is a COUNT and not a height,
 * because it has to fill a panel whose height nobody knows yet; forty rows are taller than
 * `--pct-select-panel-max-height` allows a panel to be at any type size this library ships.
 *
 * It is also what a unit run sees from end to end: `offsetHeight` is 0 in jsdom, a window
 * computed from a row of zero height is a division by zero, and a gate whose numbers came
 * out of a guessed layout would be measuring the guess.
 */
const PROBE_ROWS = 40;

/**
 * Below this, two measurements of a row are the same measurement — and without it the panel
 * never settles. Firefox reports the row as **35.600006 px** and **35.599990 px** by turns,
 * a fifteen-millionth of a pixel apart, and the two alternate because each one moves the
 * spacer that decides where the next row is laid out: measure, write, re-render, measure. The
 * loop is not slow, it is infinite — Angular gives up with NG0103 and the panel freezes where
 * it stood ([`lesson-111`](../../../../docs/lessons.md#lesson-111)).
 *
 * A sixty-fourth of a pixel is a thousand times the jitter and a two-hundredth of the
 * smallest change that can be real — the row height comes out of the type, so it moves by
 * whole points when it moves. Quantising the VALUE to that grid was the other road and it is
 * worse: engines do not share a grid (Blink lays out on 1/64 px, Gecko on 1/60), so rounding
 * to either one moves every reading of the other by tens of pixels over five thousand rows.
 * The reading stays exact; only the question "is this a different reading" is coarse.
 */
const HAIR = 1 / 64;

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

  /**
   * Blocks the control and greys it — the native `disabled`, so it leaves the tab order as well. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract.
   *
   * @since 0.1.0
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Holds the value and keeps the panel closed while the control stays focusable; `aria-readonly` says so.
   *
   * @since 0.1.0
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * The form's verdict; shown only once `touched`, so an empty form does not open red.
   *
   * @since 0.1.0
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /**
   * Whether the user has left the field once; with `invalid` it gates the error face.
   *
   * @since 0.1.0
   */
  readonly touched = input(false, { transform: booleanAttribute });

  /**
   * Marks the label with the required sign; with `[formField]` it follows the schema's `required()`.
   *
   * @since 0.1.0
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The form's validation errors; the first one's `message` takes the hint's place once the field is touched.
   *
   * @since 0.1.0
   */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /**
   * The native `name` — what a form submission calls the value.
   *
   * @since 0.1.0
   */
  readonly name = input<string>('');

  /**
   * Emitted on blur — lets the form mark the field as touched.
   *
   * @since 0.1.0
   */
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
   *
   * @since 0.1.0
   */
  readonly options = input<readonly PctSelectItem<T>[]>([]);

  /**
   * The visible label, rendered by the control itself when it stands outside a `pct-field`; inside one, the field's label is the name.
   *
   * @since 0.1.0
   */
  readonly label = input<string>('');

  /**
   * A line of help under the control, outside a `pct-field`; the first error message takes its place while the field is invalid and touched.
   *
   * @since 0.1.0
   */
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
   *
   * @since 0.1.0
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere on the page — a heading, the
   * header of the column the control sits in. It wins over `ariaLabel` and over `label`, in
   * ARIA's order and not ours.
   *
   * @since 0.1.0
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * The placeholder. With no value it comes from `PCT_TEXTS` — and it comes **at render time**,
   * not at construction: an input's default value is produced once, so an application
   * switching language at runtime would be left with the string from before the change
   * ([0014](../../../../docs/decisions/0014-texts-as-signal.md)). `placeholder=""` stays an
   * empty placeholder rather than a return to the default — absent and empty mean different
   * things.
   *
   * @since 0.1.0
   */
  readonly placeholder = input<string>();

  /**
   * Height 28 / 36 / 44 px — the axis every field shares; from `providePctConfig` by default (req-api-config).
   *
   * @since 0.1.0
   */
  readonly size = input<PctSize>(this.config.defaultSize);

  /**
   * Value equality. Identity by default, which for strings and numbers is the same as `===`.
   * Entities need comparison by key — an instance from the server is not the same reference as
   * an option on the list, so without this the selected item would not highlight after the
   * form loads.
   *
   * @since 0.1.0
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
   *
   * @since 0.1.0
   */
  readonly filterable = input(false, { transform: booleanAttribute });

  /**
   * What has been typed into the trigger. A `model`, so an application filtering on a server
   * can read the question and answer it with another `options` list — and the control still
   * owns the clearing, because the question belongs to the panel: it is set to `''` when the
   * panel closes and when a pick answers it. It is **not** the value and never becomes one.
   *
   * @since 0.1.0
   */
  readonly filterText = model<string>('');

  /**
   * What counts as a match. The default folds case on the label and asks for `includes`;
   * anything more than that — a second field, a code beside the label, an idea of which
   * letters are the same letter — is the application's, because it is the application that
   * knows the language (`pctFilterByLabel`, and `lesson-101` for why).
   *
   * A list a **server** narrowed is already the answer, so narrowing it again here would take
   * out the rows it matched on something other than the label: that control says `pctKeepAll`
   * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
   *
   * @since 0.1.0
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
   *
   * @since 0.1.0
   */
  readonly clearable = input(false, { transform: booleanAttribute });

  /**
   * The list is on its way. A fact about the **list**, not about the control
   * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)): it takes
   * nothing away — not the focus, not the answer already given, not the rows still on the
   * screen — and says two things instead. The panel carries `aria-busy`, so a reader knows
   * that what it is reading may not be the last word, and an empty one says "loading" where
   * it would otherwise have said "no options": that sentence is a **conclusion**, and a list
   * still coming has reached none.
   *
   * Deliberately NOT `disabled`, which is where it parts company with `pctButton`'s input of
   * the same name. There the loading is the button's own action in flight and a second press
   * would send it twice; here the control is in perfect working order and its list is late —
   * the user can type the very question that fetches it. Disabling would take the focus with
   * it (a disabled element drops it on `body`), which is the end of the key map.
   *
   * @since 0.1.0
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * Draw only the rows the panel can show. It is a promise about **how many rows exist**, and
   * that is why it is the control's to make: the panel builds its own rows, so it is the one
   * thing here that can decide not to
   * ([0033](../../../../docs/decisions/0033-an-option-is-a-row-of-data.md)).
   *
   * An input rather than a tag, by 0034's own rule: a tag is what the TYPE cannot say
   * otherwise, and a window changes no type — the list, the value and every one of them
   * stay what they were.
   *
   * Opt-in rather than a length the library decides for itself, and the reason is a thing the
   * user has and the library cannot see: **find-in-page**. A row that is not in the DOM is not
   * found by `Ctrl+F`, and a list that quietly stopped being searchable at the four hundredth
   * option would be a defect nobody could report against a promise nobody made.
   *
   * What it asks of the list in return is one thing, and the library cannot check it: **every
   * row is the same height.** The window is arithmetic over one measured row, so a label that
   * wraps onto a second line or a `pctSelectOption` template drawing two lines moves every row
   * below it. Dev mode says so — see `warnOnUnevenRows`.
   *
   * @since 0.1.0
   */
  readonly virtual = input(false, { transform: booleanAttribute });

  /**
   * Width of the dropdown panel — equal to the control by default (`'field'`). The panel then
   * comes out exactly from its edge, so the list reads as an extension of the field. `'auto'`
   * fits the width to the longest option (without narrowing the panel below the control), and
   * a CSS length sets it outright.
   *
   * @since 0.1.0
   */
  readonly panelWidth = input<PctSelectPanelWidth>('field');

  /**
   * Alignment of the panel to the control when it is wider or narrower than it.
   *
   * @since 0.1.0
   */
  readonly panelAlign = input<PctSelectPanelAlign>('start');

  // A `<button>` or an `<input>`, whichever branch of the template is standing — one of them
  // always is, which is what keeps the query `required`.
  protected readonly trigger =
    viewChild.required<ElementRef<HTMLElement>>('trigger');
  // The list — the listbox, and the element that scrolls (0069); the panel around it is a
  // surface and the geometry below never asks it anything.
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

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

  // --- the window (`virtual`) ---

  /**
   * Where the panel is scrolled to. Written by a listener added to the panel rather than by a
   * template binding, and that is a cost rather than a style: an `(scroll)` in the template
   * runs change detection on every scroll frame of every panel, including the ones drawn
   * whole — a pass over five thousand rows for a window nobody asked for.
   */
  private readonly scrolled = signal(0);

  /**
   * The panel's own geometry, MEASURED rather than declared, and that is the measurement this
   * whole feature turns on: a row here is **35.59 px** — `line-height: 1.4` on a 14 px type
   * plus the padding — and there is no token for it, because the height falls out of the type
   * rather than being chosen. A number a consumer typed by hand would be wrong by a fraction
   * of a pixel per row, which over five thousand rows is two thousand pixels of scrollbar
   * telling the user something that is not true. `size` moves it again, per instance.
   *
   * Compared field by field, so a measurement that says what the last one said is not a
   * change: this signal is written from an after-render hook that reads what it draws.
   */
  private readonly metrics = signal<PctSelectMetrics | null>(null, {
    equal: (a, b) =>
      a === b ||
      (a !== null &&
        b !== null &&
        Math.abs(a.row - b.row) < HAIR &&
        Math.abs(a.heading - b.heading) < HAIR &&
        a.viewport === b.viewport),
  });

  /**
   * Where every section starts and how tall the whole list would be if it were all drawn.
   * A computed and not a walk per scroll frame: the list changes when the options or the
   * question do, and a scroll changes neither.
   */
  private readonly geometry = computed(() => {
    const metrics = this.metrics();
    if (metrics === null) return null;
    const tops: number[] = [];
    let y = 0;
    for (const section of this.sections()) {
      tops.push(y);
      y +=
        (section.label === null ? 0 : metrics.heading) +
        section.rows.length * metrics.row;
    }
    return { tops, total: y };
  });

  /**
   * The list as the panel draws it. Without `virtual` that is every section with every row
   * and no spacer anywhere — one shape for both, so the template has one row in it and the
   * two modes cannot drift apart.
   *
   * With it, the window is the rows the panel shows plus `OVERSCAN` at each end, and the
   * space the rest would have taken is a **pseudo-element** rather than a spacer, a wrapper
   * or padding. All three were measured
   * ([0038](../../../../docs/decisions/0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)):
   * padding does not scroll — it is inside the padding box, so it makes the panel taller
   * instead of its content; a wrapper that scrolls is no longer the combobox's own popup, and
   * axe reports a scrollable region with nothing focusable in it; and `::before` / `::after`
   * are boxes with no node, so the listbox keeps exactly its options and its groups as
   * children.
   */
  protected readonly panelView = computed<PctSelectPanelView<T>>(() => {
    const sections = this.sections();
    if (!this.virtual())
      return {
        sections: sections.map((section, index) => ({
          index,
          label: section.label,
          rows: section.rows,
          lead: 0,
          tail: 0,
        })),
        lead: 0,
        tail: 0,
      };

    const metrics = this.metrics();
    const geometry = this.geometry();
    const count = this.rows().length;

    let first: number;
    let last: number;
    if (metrics === null || geometry === null) {
      // Nothing measured yet. The window starts at the cursor — the row the answer already
      // names is the one the panel is about to be scrolled to, and drawing the first forty
      // rows of a five-thousand-row list would be drawing the wrong end of it. It is the ONE
      // place the cursor decides the window: once there are metrics the scrollbar does, and
      // the cursor reaches its row by moving the scrollbar rather than by bending the window
      // (`scrollToActive`).
      first = Math.min(
        Math.max(this.activeIndex(), 0),
        Math.max(count - PROBE_ROWS, 0),
      );
      last = first + PROBE_ROWS - 1;
    } else {
      const rowAt = (y: number): number => {
        let index = 0;
        for (const [i, section] of sections.entries()) {
          const body =
            geometry.tops[i] + (section.label === null ? 0 : metrics.heading);
          if (y < body + section.rows.length * metrics.row)
            return index + Math.max(Math.floor((y - body) / metrics.row), 0);
          index += section.rows.length;
        }
        return index - 1;
      };
      const top = this.scrolled();
      first = rowAt(top) - OVERSCAN;
      last = rowAt(top + metrics.viewport) + OVERSCAN;
    }
    first = Math.max(first, 0);
    last = Math.min(last, count - 1);

    const drawn: PctSelectPanelSection<T>[] = [];
    let top = 0;
    let bottom = 0;
    let index = 0;
    for (const [i, section] of sections.entries()) {
      const start = index;
      index += section.rows.length;
      if (index <= first || start > last) continue;

      const from = Math.max(first - start, 0);
      const to = Math.min(last - start, section.rows.length - 1);
      const named = section.label !== null;
      const head =
        (geometry?.tops[i] ?? 0) + (named ? (metrics?.heading ?? 0) : 0);
      const row = metrics?.row ?? 0;

      // A named section is an element, so it carries its own skipped rows and stands at its
      // own top whatever the window kept of it. A nameless one draws nothing at all, so what
      // it skips is the panel's — which it can only ever be at an edge of the window, because
      // a section in the middle of one is drawn whole.
      if (drawn.length === 0)
        top = named ? (geometry?.tops[i] ?? 0) : head + from * row;
      bottom = named ? head + section.rows.length * row : head + (to + 1) * row;

      drawn.push({
        index: i,
        label: section.label,
        rows: section.rows.slice(from, to + 1),
        lead: named ? from * row : 0,
        tail: named ? (section.rows.length - 1 - to) * row : 0,
      });
    }

    return {
      sections: drawn,
      lead: Math.max(top, 0),
      tail: Math.max((geometry?.total ?? 0) - bottom, 0),
    };
  });

  /**
   * The size of the set an option stands in, and `null` wherever the DOM holds the whole list.
   *
   * This pair is the one thing a window OWES the reader, and no gate here can ask for it:
   * `aria-setsize` and `aria-posinset` exist for exactly the case where the elements of a set
   * are not all present, and axe has no rule about them — a windowed listbox with neither is
   * green in the audit and lies to the user about how long the list is. So the promise is a
   * test's, and it is written down beside the ones a gate makes
   * ([0038](../../../../docs/decisions/0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)).
   *
   * The numbering is the FLAT one — the list's, not the group's. It is what the walk, the ids
   * and `aria-activedescendant` already count in, and "row 4,201 of 5,000" is the sentence the
   * user of a long list needs; "2 of 3" inside a heading is not.
   */
  protected readonly setSize = computed(() =>
    this.virtual() ? this.rows().length : null,
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
    // A row is rebuilt on every reading of the list, so identity would say that no two lists
    // share an entry. What makes two rows one is what makes two values one — the application's
    // own `compareWith`, which is already the answer to "does this option carry the value":
    // a list fetched twice brings back another instance of the same option, and the cursor
    // names an option exactly as the value does
    // ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
    sameItem: (a, b) => this.compareWith()(a.option.value, b.option.value),
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
    if (!this.open() || i < 0) return null;
    // A name may point only at something that is there. The cursor and the scrollbar are two
    // ways of pointing at one list and they can come apart — a drag of the scrollbar moves no
    // cursor — so a windowed panel can be showing the four thousandth row while the cursor
    // stands on the first. `aria-activedescendant` naming a row nobody drew is a reference to
    // nothing, which is worse than no reference: the attribute is optional, and the next
    // arrow press brings both back together.
    const drawn = this.panelView().sections;
    if (drawn.length > 0) {
      const rows = drawn[drawn.length - 1].rows;
      const from = drawn[0].rows[0].index;
      const to = rows[rows.length - 1].index;
      if (i < from || i > to) return null;
    }
    return this.optionId(i);
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
   *
   * The index is a position in what the panel DRAWS rather than in `sections()`: with a
   * window the two differ, and the section carries its own `index` for the one thing that
   * must not move with the window — the heading's id.
   */
  protected sectionRows(index: number): readonly PctSelectRow<T>[] {
    return this.panelView().sections[index]?.rows ?? [];
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
   * Which of the three sentences an empty panel carries. They are three facts and not one
   * phrasing of one: "there is nothing to choose from" is the list's state, "nothing here
   * answers what you typed" is the question's, and a user three letters into a question is
   * owed the second.
   *
   * **A list still coming takes both of them off the screen**, because both are conclusions
   * and a request in flight has reached neither: a panel that says "no matches" while the
   * server is still answering is telling the user something that is not yet true, and the
   * user's next act — deleting the letters, giving up on the list — is decided by it.
   */
  protected readonly emptyText = computed(() => {
    if (this.loading()) return this.texts().selectLoading;
    return this.query() === ''
      ? this.texts().selectEmpty
      : this.texts().selectNoMatches;
  });

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

    // What the channel is holding on this control's behalf. It is kept rather than derived,
    // because the sentence to WITHDRAW is never the one the state now names: the question
    // dies with the panel, so by the time the panel is shut `emptyText()` already says
    // something else — and since a list can stop loading while it is still empty, one
    // sentence can replace another with the panel never closing. Three sentences retracted
    // blindly would be three, and the next one is a `retract` nobody remembered to add.
    //
    // Neither call is guarded, and that is the announcer's contract rather than an oversight:
    // it says nothing when handed nothing, and it withdraws only what is still there — so
    // `say('')` on a control that never spoke touches neither the channel nor another
    // control's sentence. The guards this began with were that contract written twice, and
    // the mutation run said so: every one of them survived.
    let announced = '';
    const say = (message: string): void => {
      this.announcer.retract(announced);
      this.announcer.announce(message);
      announced = message;
    };

    effect(() => say(this.emptyMessage()));

    inject(DestroyRef).onDestroy(() => say(''));

    // The active option has to be visible in a scrolling list.
    //
    // `afterRenderEffect` and not `effect`: with a window the row the cursor names is created
    // by the very pass that moved the cursor, so a hook running before the panel is drawn
    // would be looking for an element that does not exist yet.
    //
    // The row is found by its id and not by its position among the drawn ones, which is the
    // first thing the window broke here: `querySelectorAll(...)[i]` was right only while
    // every row stood in the DOM, and it is a reading that says nothing about its own
    // assumption — the wrong row scrolls into view and nothing reports it. The ids are
    // compared rather than selected on, so no `CSS.escape` is needed (absent in jsdom).
    afterRenderEffect(() => {
      const i = this.activeIndex();
      if (!this.open() || i < 0) return;
      // Everything below is read UNTRACKED, and that is the whole correctness of it: this
      // hook exists to follow the CURSOR, so the cursor and the panel being open are the only
      // two things that may wake it. Tracked, it woke on the geometry as well — and Firefox
      // remeasures a row by a fraction of a pixel at some scroll offsets — so a scroll to the
      // middle of a long list was pulled straight back to wherever the cursor stood, in one
      // engine and not the other ([`lesson-110`](../../../../docs/lessons.md#lesson-110)).
      untracked(() => this.keepInView(i));
    });

    // The panel's own geometry, read back from what it drew. It runs after every render of an
    // open panel and writes a value compared field by field, so the pass it causes by writing
    // is the last one: the second reading says what the first did and the signal does not
    // move ([`lesson-94`](../../../../docs/lessons.md#lesson-94) is the shape this avoids).
    afterRenderEffect(() => {
      if (!this.virtual()) return;
      // Read, so a window that moved is measured again — the list's own height changes with
      // the rows in it while the list is short.
      this.panelView();
      const list = this.list()?.nativeElement;
      if (list) this.measure(list);
    });

    // The scroll listener, added rather than bound in the template. An `(scroll)` binding runs
    // change detection on every scroll frame of every panel — including the ones drawn whole,
    // which is a pass over the entire list for a window nobody asked for.
    effect((onCleanup) => {
      const list = this.list()?.nativeElement;
      if (!list || !this.virtual()) return;
      const onScroll = (): void => {
        this.scrolled.set(list.scrollTop);
        this.measure(list);
      };
      list.addEventListener('scroll', onScroll, { passive: true });
      onCleanup(() => list.removeEventListener('scroll', onScroll));
    });

    if (isDevMode()) afterRenderEffect(() => this.warnOnUnevenRows());

    // The slot cannot tell where it stands: an `<ng-template>` in a component's content is
    // never inserted into the document, so it has no parent to read and no provider to
    // resolve that a bundler would let go of
    // ([`lesson-176`](../../../../docs/lessons.md#lesson-176)). What knows is this query —
    // finding the template IS the statement that it will be rendered.
    if (isDevMode()) effect(() => this.optionTemplate()?.read());

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

  /**
   * The three numbers the window is arithmetic over, read from the panel that drew the last
   * one. Nothing here is declared: there is no token for a row's height, because the height
   * falls out of the type — `line-height: 1.4` on the panel's font plus the row's padding —
   * and `size` moves it per instance.
   *
   * `getBoundingClientRect().height` and not `offsetHeight`, which is the first thing the
   * browser said that this file had guessed wrong: **`offsetHeight` is an integer.** A row
   * here is 35.59 px, `offsetHeight` calls it 36, and over five thousand rows that rounding
   * is 2,027 px of scrollbar describing a list nobody has — the very drift a hand-typed
   * number was refused for ([`lesson-108`](../../../../docs/lessons.md#lesson-108)).
   *
   * A row of no height is refused rather than stored, and that is what keeps a run with no
   * layout honest: jsdom answers 0 to every measurement, and a window computed from it would
   * divide by zero. With no metrics the panel draws `PROBE_ROWS` and the count promise is
   * still measurable, which is exactly what the unit gate measures.
   *
   * The heading falls back to the last one seen: a window standing entirely among bare rows
   * has no heading to read, and forgetting the one measured a scroll ago would move every
   * section below it.
   */
  /**
   * The row the cursor names, brought into view — `block: 'nearest'` written out.
   */
  private keepInView(i: number): void {
    const list = this.list()?.nativeElement;
    if (!list) return;

    // With a window the row may not be there to scroll to, and that is not a detail: a
    // cursor put on the four thousandth row by `End` would wait for a scroll that waits for
    // the row. So the list is scrolled by ARITHMETIC — the geometry knows where the row
    // stands whether or not anything drew it — and the window follows the scrollbar it
    // moved. `block: 'nearest'` written out: a row already in view is left alone.
    const top = this.rowTop(i);
    if (top !== null) {
      const height = this.metrics()?.row ?? 0;
      const view = list.clientHeight;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (top + height > list.scrollTop + view)
        list.scrollTop = top + height - view;
      // The listener is what tells the window; setting `scrollTop` fires no event of its own
      // in every engine, so the reading is taken here as well.
      this.scrolled.set(list.scrollTop);
      return;
    }

    const wanted = this.optionId(i);
    const rows = list.querySelectorAll<HTMLElement>('[data-pct-part="option"]');
    for (const row of rows)
      if (row.id === wanted) {
        row.scrollIntoView?.({ block: 'nearest' });
        return;
      }
  }

  /**
   * Where a row stands in the list, in pixels — `null` wherever the arithmetic has no numbers
   * to run on, which is every panel drawn whole and the first frame of every windowed one.
   */
  private rowTop(index: number): number | null {
    const metrics = this.metrics();
    const geometry = this.geometry();
    if (!this.virtual() || metrics === null || geometry === null) return null;
    let seen = 0;
    for (const [i, section] of this.sections().entries()) {
      if (index < seen + section.rows.length)
        return (
          geometry.tops[i] +
          (section.label === null ? 0 : metrics.heading) +
          (index - seen) * metrics.row
        );
      seen += section.rows.length;
    }
    return null;
  }

  private measure(list: HTMLElement): void {
    const row = list.querySelector<HTMLElement>('[data-pct-part="option"]');
    const height = row?.getBoundingClientRect().height ?? 0;
    if (height <= 0) return;
    const heading = list.querySelector<HTMLElement>(
      '[data-pct-part="group-label"]',
    );
    this.metrics.set({
      row: height,
      heading:
        heading?.getBoundingClientRect().height ??
        this.metrics()?.heading ??
        height,
      viewport: list.clientHeight,
    });
  }

  /**
   * The one thing a window asks of the list and cannot check for itself: that every row is
   * the same height. Reported and not repaired, like a duplicated value — which of two heights
   * is the right one is the application's question, and a library that answered it would be
   * cropping somebody's second line.
   *
   * The rows drawn are what it reads, so a list of five thousand costs a walk over the forty
   * on the screen. Under `isDevMode()` alone.
   */
  private warnOnUnevenRows(): void {
    if (!this.virtual() || !this.open()) return;
    const rows = this.list()?.nativeElement.querySelectorAll<HTMLElement>(
      '[data-pct-part="option"]',
    );
    if (!rows || rows.length < 2) return;
    // `offsetHeight` here and a rect above, on purpose: the arithmetic needs the fraction and
    // a comparison of two fractions would fire on a rounding. What this is looking for is a
    // row twenty pixels taller, not half a one.
    const first = rows[0].offsetHeight;
    if (first <= 0) return;
    for (const row of rows) {
      if (row.offsetHeight === first) continue;
      console.warn(
        `[${this.tag}] A windowed panel draws rows of two heights ` +
          `(${first}px and ${row.offsetHeight}px). The window is arithmetic over one row, ` +
          `so the scrollbar and every row below the taller one are off by the difference. ` +
          `Give the rows one height — a label that wraps and an option template drawing two ` +
          `lines are the usual causes — or drop \`virtual\`.`,
      );
      return;
    }
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
    // A shut panel forgets its geometry and its scroll: the next one is a new element at the
    // top of the list, and both readings belong to the panel that was measured, not to the
    // control. A `size` changed between two openings is picked up for the same reason.
    this.metrics.set(null);
    this.scrolled.set(0);
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
