import { Directive, inject, input, TemplateRef } from '@angular/core';
import { pctReportOrphanSlot } from '@pacit/components/core';
import { PctSelectItem, PctSelectOption } from './select.types';

/**
 * What the select hands an option template on every row it draws.
 *
 * `$implicit` is the option itself, so `let-option` is enough for the common case. The other
 * four are the state the built-in row paints with `data-pct-*`, given to a template that
 * replaces it — a consumer who draws their own row still has to be able to show which option
 * is active and which is chosen.
 *
 * @since 0.1.0
 */
export interface PctSelectOptionContext<T> {
  /** The option being drawn — `let-option`. */
  readonly $implicit: PctSelectOption<T>;
  /** Its position in `options`, counting from 0 — `let-index="index"`. */
  readonly index: number;
  /** The option the keyboard is pointing at (`aria-activedescendant`) — `let-a="active"`. */
  readonly active: boolean;
  /** The option the value maps back to — `let-s="selected"`. */
  readonly selected: boolean;
  /** `option.disabled`, narrowed to a boolean — `let-d="disabled"`. */
  readonly disabled: boolean;
}

/**
 * The template a consumer writes instead of the select's own option row
 * (`req-api-templates`).
 *
 * The built-in row draws `option.label` and nothing else. A list of countries with flags, of
 * users with avatars, of anything whose meaning is more than one line of text needs the row
 * itself — and the row is the only part of the panel a consumer may replace: the `role`, the
 * id, `aria-selected` and the keyboard belong to the listbox pattern and stay with the
 * component (`req-a11y-built-in`).
 *
 * **The list is bound a second time, and that is what types the template.** A directive's
 * generic has no inference site of its own, and Angular's type-check block then instantiates
 * it as `any` — so `let-option` on a slot with no input is exactly as unchecked as a bare
 * `<ng-template>` ([`lesson-84`](../../../../docs/lessons.md#lesson-84)). The binding here is
 * that inference site and is read by nothing at runtime; it is `input.required`, so a slot
 * written without it is `NG8008` rather than a silently untyped context.
 *
 * @example
 * <pct-select [options]="countries" [(value)]="country">
 *   <ng-template [pctSelectOption]="countries" let-option>
 *     <img [src]="option.value.flag" alt="" /> {{ option.label }}
 *   </ng-template>
 * </pct-select>
 *
 * @since 0.1.0
 */
@Directive({
  selector: 'ng-template[pctSelectOption]',
})
export class PctSelectOptionTemplate<T> {
  readonly template =
    inject<TemplateRef<PctSelectOptionContext<T>>>(TemplateRef);

  /**
   * The same list the select is given — groups included, because that is the list a consumer
   * has to hand. It carries `T` into the context and is never read: binding a different list
   * of the same type changes nothing but the type.
   *
   * @since 0.1.0
   */
  readonly options = input.required<readonly PctSelectItem<T>[]>({
    alias: 'pctSelectOption',
  });

  /**
   * What the select calls when its content query finds this template — the whole claim that
   * the slot is home. A slot no query reaches is claimed by nobody, and that is the report.
   */
  readonly read = pctReportOrphanSlot('pctSelectOption');

  /**
   * What tells the compiler `let-option` is an option. The body cannot be anything but
   * `true`: nothing is checked at runtime, the whole point being the signature.
   *
   * `context` appears only in the type predicate, which is what the lint rule sees and why
   * it is switched off here by name — a parameter a return type mentions is used.
   */
  static ngTemplateContextGuard<T>(
    _slot: PctSelectOptionTemplate<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is PctSelectOptionContext<T> {
    return true;
  }
}
