import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface TocItem {
  readonly id: string;
  readonly label: string;
  readonly children?: readonly TocItem[];
}

/**
 * The pinned table of contents (2.7.3, the reviewer's item 6): two levels, each entry a
 * fragment link the router scrolls to under the sticky bar, the active one lit by the
 * page's own scroll spy — the list is data, the page decides what is active.
 */
@Component({
  selector: 'docs-toc',
  imports: [RouterLink],
  templateUrl: './docs-toc.html',
  styleUrl: './docs-toc.scss',
})
export class DocsToc {
  readonly items = input.required<readonly TocItem[]>();
  readonly active = input<string | null>(null);
  readonly cardPath = input.required<string>();

  /**
   * Whether one of a section's OWN entries is the active one — the state the section shows
   * as lifted text and no stroke. It used to share the active class with its entry, so the
   * reading line was drawn twice, one fill stacked on another; the stroke is the entry's.
   */
  protected holdsActive(item: TocItem): boolean {
    const active = this.active();
    return Boolean(item.children?.some((c) => c.id === active));
  }
}
