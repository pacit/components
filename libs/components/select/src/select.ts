import { Component, computed, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { PCT_SELECT_IMPORTS, PctSelectBase } from './select.base';

/**
 * A single-choice select with a panel of its own (not a native `<select>`).
 *
 * It implements the ARIA "select-only combobox" pattern: the trigger has `role="combobox"`, the
 * panel `role="listbox"`, and focus **never leaves the trigger** — the active option is pointed
 * at by `aria-activedescendant`. That last part is a promise the browser breaks by default, so
 * the panel carries `pctFocusStays`: a press on it moves focus nowhere, and the key map keeps
 * the element it is bound to.
 *
 * Panel positioning stands on CDK Overlay (`req-project-dependencies`) — the only runtime
 * dependency allowed. The keyboard handling is ours, because a custom listbox has no native
 * counterpart (`req-api-platform`).
 *
 * The value is of any type `T` (a string by default) — see `PctSelectOption`. The absence of a
 * choice is `emptyValue`, `null` by default, and `clearable` is what gives the user a way back
 * to it ([0036](../../../../docs/decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)).
 * **Many choices are another tag**, `pct-multi-select`
 * ([0034](../../../../docs/decisions/0034-multiplicity-is-a-tag.md)): everything else about the
 * two is the same file.
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
  imports: [...PCT_SELECT_IMPORTS],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class PctSelect<T = string>
  extends PctSelectBase<T>
  implements FormValueControl<T | null>
{
  constructor() {
    super('pct-select');
  }

  /** One answer, so one row of the list ever carries it. */
  override readonly multiple = false;

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

  /**
   * The value standing for no choice — set when the form is reset. `null` by default, but an
   * application with a non-nullable field (`plan: string`) supplies its own (`emptyValue=""`),
   * so that a reset does not write `null` into the model against its type.
   */
  readonly emptyValue = input<NoInfer<T> | null>(null);

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
    return this.rows().findIndex((row) => same(row.option.value, current));
  });

  /**
   * The chosen option, looked up in the WHOLE list rather than in the rows the panel is
   * showing. The two part company the moment a filter is on: an option a question hides is
   * still the answer, and a trigger that went blank while the user typed would be reporting a
   * value nobody had cleared
   * ([0035](../../../../docs/decisions/0035-a-filter-is-a-question-not-a-value.md)).
   */
  protected readonly selectedOption = computed(() => {
    const current = this.value();
    if (current === null || current === undefined) return null;
    const same = this.compareWith();
    return (
      this.allOptions().find((option) => same(option.value, current)) ?? null
    );
  });

  protected override readonly displayText = computed(
    () => this.selectedOption()?.label ?? '',
  );

  protected override isSelected(index: number): boolean {
    return index === this.selectedIndex();
  }

  /** An answered list opens on its answer. */
  protected override initialActive(): number {
    return this.selectedIndex();
  }

  /** One choice replaces the previous one, and the question is then over: the panel closes. */
  protected override selectAt(index: number): void {
    const row = this.pickable(index);
    if (row === null) return;
    this.value.set(row.option.value);
    this.close();
  }

  /** Nothing chosen is whatever the application said it is — `null` unless it said otherwise. */
  protected override clearValue(): void {
    this.value.set(this.emptyValue());
  }
}
