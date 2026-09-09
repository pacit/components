import { DOCUMENT } from '@angular/common';
import { Component, inject, input } from '@angular/core';
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
 *
 * It lived under `pages/component/` while a component card was the only page long enough to
 * need it. The conformance report is 8 971 px with six sections and the support policy 2 929
 * with seven, and neither had a way in (4.34) — so the rail moved up here rather than being
 * written a second time, which is the same refusal `find.ts` and `spy.ts` already are.
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
  /** The tracked file this page is rendered from — what "Edit this page" opens. */
  readonly sourcePath = input.required<string>();

  /**
   * Whether one of a section's OWN entries is the active one — the state the section shows
   * as lifted text and no stroke. It used to share the active class with its entry, so the
   * reading line was drawn twice, one fill stacked on another; the stroke is the entry's.
   */
  protected holdsActive(item: TocItem): boolean {
    const active = this.active();
    return Boolean(item.children?.some((c) => c.id === active));
  }

  private readonly document = inject(DOCUMENT);

  /**
   * The page moves; the keyboard has to move with it.
   *
   * The router scrolls to the fragment and leaves focus on the link — and this rail is the
   * LAST thing in the shell, so the next Tab walks out the rest of the contents and then out
   * of the document. A reader who navigates by the index could not then read what they had
   * navigated to, which is the whole of what an index is for.
   *
   * `tabindex="-1"` on arrival rather than in the template: a section is a place, not a
   * control, and it should be landed on without becoming a tab stop of its own — the same
   * rule the region cycle states. `preventScroll` because the scrolling is the router's, and
   * it is the one that reads `--docs-anchor-offset`; a second scroll from `focus()` would
   * fight it and win at the wrong offset.
   */
  protected onJump(id: string): void {
    const target = this.document.getElementById(id);
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}
