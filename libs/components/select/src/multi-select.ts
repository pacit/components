import { Component, computed, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { providePctTemplateHost } from '@pacit/components/core';
import { PCT_SELECT_IMPORTS, PctSelectBase } from './select.base';

/**
 * A many-choice select — the same panel, the same walk and the same file as `pct-select`, with
 * a value that is a list.
 *
 * It is a **separate tag** rather than `<pct-select multiple>`, and that is a measurement:
 * a `multiple` input is a value at runtime, so the compiler cannot let it decide what `value`
 * is. Written as one component the value has to be `T | T[] | null`, and then nothing is
 * checked any more — an array handed to a select nobody told to be multiple compiles, while
 * the single-choice consumer's own `(valueChange)` handler stops compiling. The tag is the one
 * thing in a template the compiler ties to a type
 * ([0034](../../../../docs/decisions/0034-multiplicity-is-a-tag.md)).
 *
 * What differs from the single-choice control, in full: `aria-multiselectable` on the listbox,
 * a pick that toggles and leaves the panel open, a check on the chosen rows, and a trigger that
 * reads the chosen labels.
 *
 * @example
 * <pct-multi-select label="Countries" [options]="countries" [(value)]="chosen" />
 * // protected chosen = signal<string[]>(['pl']);
 *
 * @example
 * // In a form, the field is a list — that is the whole difference on this side too.
 * <pct-multi-select [options]="tags" [formField]="form.tags" />
 */
@Component({
  selector: 'pct-multi-select',
  imports: [...PCT_SELECT_IMPORTS],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  // The slots this component reads, so one written where nothing reads it can say so.
  providers: [providePctTemplateHost('pct-multi-select', ['pctSelectOption'])],
})
export class PctMultiSelect<T = string>
  extends PctSelectBase<T>
  implements FormValueControl<T[]>
{
  constructor() {
    super('pct-multi-select');
  }

  /** The tag's whole meaning, and the one thing the template reads it for. */
  override readonly multiple = true;

  /**
   * The chosen values — the `FormValueControl` contract's one field, here a list. Empty is the
   * empty list, so there is no `emptyValue` to declare: `[]` is reachable for every `T` and
   * means the same thing in every application, which `null` did not.
   *
   * The array is **mutable in the type** (`T[]`, not `readonly T[]`) because that is how an
   * application declares such a field — `signal<string[]>([])`, `form.tags` — and a control
   * whose value type is stricter than the model it is bound to cannot be bound at all. Nothing
   * here mutates it: every change sets a NEW array.
   *
   * `NoInfer` keeps the option list the only source of `T`, exactly as in `pct-select`.
   */
  readonly value = model<NoInfer<T>[]>([]);

  /**
   * The positions of the chosen rows. A set built once per change of the value or the list,
   * rather than a comparison per row per detection pass: `compareWith` belongs to the
   * application, so the membership test is a scan and not a lookup, and doing it in the
   * template would make it a scan **per row**.
   */
  private readonly selected = computed(() => {
    const positions = new Set<number>();
    for (const row of this.rows())
      if (this.isChosen(row.option.value)) positions.add(row.index);
    return positions;
  });

  protected override isSelected(index: number): boolean {
    return this.selected().has(index);
  }

  /**
   * The chosen labels, in the order of the LIST rather than of the picking — the trigger reads
   * what the eye sees below it. A value the list cannot name adds nothing here: the text says
   * what the options say, and a value with no option is still part of the value.
   */
  /**
   * Whether a value is one of the chosen ones — the membership test written once, because it
   * is asked of the visible rows (which rows carry a mark) and of the whole list (what the
   * trigger reads, and what a pick writes back).
   */
  private isChosen(value: T): boolean {
    const same = this.compareWith();
    return this.value().some((chosen) => same(value, chosen));
  }

  protected override readonly displayText = computed(() =>
    // The WHOLE list, not the rows the panel is showing: a question narrows the panel and
    // never the value, so three letters typed into the trigger cannot take a chosen label off
    // it ([0035](../../../../docs/decisions/0035-a-filter-is-a-question-not-a-value.md)).
    this.allOptions()
      .filter((option) => this.isChosen(option.value))
      .map((option) => option.label)
      .join(this.texts().selectSeparator),
  );

  /** A list already answered opens on the first of its answers. */
  protected override initialActive(): number {
    const chosen = this.selected();
    return this.rows().find((row) => chosen.has(row.index))?.index ?? -1;
  }

  /**
   * A pick adds or removes one value and **leaves the panel open** — the question is not over
   * after one answer, and closing after each would make picking three options three journeys.
   *
   * The new value is written in the list's order, so the same set of choices is the same array
   * however it was arrived at — a form value that changes with the order of the clicks would be
   * dirty for no reason a user could see. What the list cannot order it does not touch: values
   * matching no option keep their own order and stand ahead of the rest, because dropping a
   * value the application put there would be repairing its data
   * ([`lesson-66`](../../../../docs/lessons.md#lesson-66) is the same rule for a duplicate).
   */
  protected override selectAt(index: number): void {
    const row = this.pickable(index);
    if (row === null) return;

    const same = this.compareWith();
    const options = this.allOptions();
    const picked = row.option.value;
    const adding = !this.isSelected(index);

    const unknown = this.value().filter(
      (value) => !options.some((option) => same(option.value, value)),
    );
    const chosen = options
      .filter((option) =>
        same(option.value, picked) ? adding : this.isChosen(option.value),
      )
      .map((option) => option.value);

    this.value.set([...unknown, ...chosen]);
    // The question is answered, so it goes — and the cursor stays on the row the pick landed
    // on, which the list widening underneath it would otherwise have moved.
    this.clearFilter(row.option);
  }

  /** Called by signal forms when the form is reset: no choices, and the panel shut. */
  override reset(): void {
    this.value.set([]);
    this.close();
  }
}
