/**
 * The blocks of a view that a Tab walk from its top never reaches: the walk takes twelve stops
 * of a view's own (`CAP` in `walk.ts`), and a view of twenty demos is read for its first one
 * or two. The data table's view is that view — its card asked what a reader says in the grid,
 * in a column's filter and in a row's menu, and the record had never been there.
 *
 * Each block is entered at its own first stop, the keys a PERSON presses there are pressed by
 * the reader, and its Tab stops are read while the focus stays inside it. The record gives it
 * a heading of its own, `/view#block`.
 *
 * **Keys, not a script.** A block names the few keys that show its pattern — a grid's arrows,
 * a menu's opening and its Escape — and `owner` CITES the end-to-end case that owns the
 * gesture instead of restating what it does, as `at/acts.ts` does
 * ([0017](../../../docs/decisions/0017-one-home-per-fact.md)).
 */
export interface Section {
  /** The demo's `data-testid`. */
  readonly block: string;
  /** What is read there. It names the heading's note and nothing else. */
  readonly what: string;
  /** The block's first stop, inside it, in the sandbox's own markup. */
  readonly on: string;
  /**
   * The keys, in order. `activate` is the focused control's default action, which the reader
   * is asked for rather than handed a key (`Reader.activate`).
   */
  readonly keys: readonly string[];
  /** The end-to-end case that owns the gesture — cited, never restated. */
  readonly owner: string;
}

export const SECTIONS: Readonly<Record<string, readonly Section[]>> = {
  '/datatable': [
    {
      block: 'demo-filters',
      what: "a column's filter",
      on: '[data-pct-part="filter"]',
      keys: ['activate', 'Escape'],
      owner:
        'datatable.spec.ts › a header’s button opens its filter, a text keeps the rows it is found in, and Escape goes back to the button',
    },
    {
      block: 'demo-grid',
      what: 'the grid',
      on: '[role="grid"] [tabindex="0"]',
      keys: ['ArrowRight', 'ArrowDown', 'End'],
      owner:
        'datatable.spec.ts › the arrows move cell to cell, Home and End along the row, Ctrl with them to the ends',
    },
    {
      block: 'demo-row-menu',
      what: "a row's menu",
      on: '[data-pct-part="actions"]',
      keys: ['activate', 'ArrowDown', 'Escape'],
      owner:
        'datatable.spec.ts › Shift+F10 opens a row’s menu at its first item, and Escape gives the focus back to the row’s button',
    },
  ],
};
