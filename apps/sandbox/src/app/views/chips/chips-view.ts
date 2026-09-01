import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctChip, PctChips } from '@pacit/components/chips';
import { SbxDemo } from '../../ui/demo';

/**
 * Chips: a row of chosen values the user can take back. Two things are worth watching, and
 * the first is invisible: press a remove button with the keyboard and watch where focus
 * lands — on the next button, so Enter, Enter, Enter empties the row. The second is what
 * removal IS: an announcement the application answers by shortening its own array, which the
 * confirm demo below stretches out until you can see the seam.
 */
@Component({
  selector: 'sbx-chips-view',
  imports: [SbxDemo, PctChips, PctChip, PctButton],
  templateUrl: './chips-view.html',
  styleUrl: './chips-view.scss',
})
export class ChipsView {
  /** The working row — the whole demo is this array getting shorter. */
  protected readonly filters = signal(ALL_FILTERS);

  /** The mixed row: one value the view cannot stand without. */
  protected readonly terms = signal(ALL_TERMS);

  /** The stretched-out removal: the value whose chip asked, still standing. */
  protected readonly asked = signal<string | null>(null);
  protected readonly people = signal(ALL_PEOPLE);

  protected drop(filter: string): void {
    this.filters.update((all) => all.filter((kept) => kept !== filter));
  }

  protected dropTerm(term: string): void {
    this.terms.update((all) => all.filter((kept) => kept !== term));
  }

  protected confirm(): void {
    const leaving = this.asked();
    if (leaving === null) return;
    this.people.update((all) => all.filter((kept) => kept !== leaving));
    this.asked.set(null);
  }

  protected restore(): void {
    this.filters.set(ALL_FILTERS);
    this.terms.set(ALL_TERMS);
    this.people.set(ALL_PEOPLE);
    this.asked.set(null);
  }
}

const ALL_FILTERS = ['In stock', 'Under 50', 'Free shipping', 'New', 'Local'];
const ALL_TERMS = ['draft', 'published', 'archived'];
const ALL_PEOPLE = ['Ada', 'Grace', 'Edsger'];
