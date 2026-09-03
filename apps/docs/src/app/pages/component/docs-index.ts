import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctField, PctText } from '@pacit/components/field';
import { DOCS_CARDS, DOCS_CATEGORIES } from '../../../generated/content';

/**
 * The component index (2.7.3, layout B): every card under the category its own header
 * files it in, a filter on top, the current one lit. It sits on the page's left rail where
 * the rail fits and inside the shell's drawer where it does not — one component, two
 * seats, so the two lists cannot disagree.
 */
@Component({
  selector: 'docs-index',
  imports: [RouterLink, PctField, PctText],
  templateUrl: './docs-index.html',
  styleUrl: './docs-index.scss',
})
export class DocsIndex {
  readonly current = input<string | null>(null);
  /** A link was followed — the drawer closes on it, the rail does not care. */
  readonly navigate = output<string>();

  protected readonly filter = signal('');

  protected readonly groups = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    return DOCS_CATEGORIES.map((name) => ({
      name,
      cards: DOCS_CARDS.filter(
        (card) =>
          card.category === name &&
          (!needle ||
            card.id.includes(needle) ||
            card.classes.some((c) => c.toLowerCase().includes(needle))),
      ),
    })).filter((group) => group.cards.length);
  });

  protected onFilter(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }
}
