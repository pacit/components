import { Component, input, output } from '@angular/core';
import { PctField, PctLabelAux, PctText } from '@pacit/components/field';

/**
 * The finder: one `pct-field`, and the count of what survives the typing sitting in the
 * field's own label add-on.
 *
 * The gallery got it on 2026-09-08 and it is a component the day `theming` (536 tokens) and
 * `trust` (94 requirements) want the same thing — the same field, the same place for the
 * count, the same live region, so three long pages answer typing the same way rather than
 * three ways. What is NOT here is the rule: the page owns what a match means, because a
 * token, a component and a requirement are not asked the same question
 * ([`find.ts`](./find.ts) holds the catalogue's).
 *
 * The count is `pct-field`'s label add-on — the slot its card describes as "an i icon, a
 * counter" — so it sits at the end of the label row and OUTSIDE the input's accessible name,
 * and it is polite rather than assertive: a number that changes on every keystroke is
 * something to be told once the typing stops.
 */
@Component({
  selector: 'docs-finder',
  imports: [PctField, PctLabelAux, PctText],
  templateUrl: './docs-finder.html',
  styleUrl: './docs-finder.scss',
})
export class DocsFinder {
  readonly label = input.required<string>();

  /** What the field holds, so the page stays the owner of the query it filters by. */
  readonly value = input('');

  /** How many answer the typing now, and how many there are in all. */
  readonly shown = input.required<number>();
  readonly total = input.required<number>();

  readonly testid = input<string | null>(null);
  readonly countTestid = input<string | null>(null);

  /** What the reader has typed, raw — the page folds it with `asNeedle`. */
  readonly query = output<string>();

  protected onInput(event: Event): void {
    this.query.emit((event.target as HTMLInputElement).value);
  }
}
