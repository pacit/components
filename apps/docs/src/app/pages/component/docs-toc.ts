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

  /** A section lights when it or one of its own entries is the active one. */
  protected isActive(item: TocItem): boolean {
    const active = this.active();
    return (
      active === item.id || Boolean(item.children?.some((c) => c.id === active))
    );
  }
}
