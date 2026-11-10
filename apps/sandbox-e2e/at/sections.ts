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
    {
      block: 'demo-tree-picks',
      what: "a branch's mixed checkbox",
      // The kettle, a device of the kitchen: picked, it leaves its room half picked above it.
      // Space and not `activate`, which is Enter on two readers, and Enter does not check a box.
      on: 'tr[data-pct-index="2"] input[type="checkbox"]',
      keys: ['Space', 'Shift+Tab', 'Shift+Tab'],
      owner:
        'datatable.spec.ts › a device half picks its room and floor, a room picks its devices, and a floor all it holds',
    },
    {
      block: 'demo-col-span',
      what: 'a cell over its neighbours',
      on: '[role="grid"] [tabindex="0"]',
      keys: ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown'],
      owner:
        'datatable.spec.ts › the arrows step over the cell as one, and come back to the column they left',
    },
  ],
  // The chart's view holds thirty-four demos, and the walk from the top reads the first chart's
  // range and legend; the arrows were never pressed on any of them.
  '/chart': [
    {
      block: 'demo-pattern',
      what: 'the cursor moved by the arrows',
      on: '[data-pct-part="range"]',
      keys: ['ArrowRight', 'ArrowRight', 'End'],
      owner:
        'chart.spec.ts › the arrows walk the cursor from reading to reading, Home and End go to the ends',
    },
    {
      block: 'demo-bars',
      what: "a bar's band picked at the cursor",
      on: '[data-pct-part="range"]',
      keys: ['ArrowRight', 'ArrowRight', 'Enter'],
      owner:
        "chart.spec.ts › a press selects a bar's band, and Enter at the cursor does the same",
    },
    {
      block: 'demo-pie',
      what: 'the slices of a pie',
      on: '[data-pct-part="range"]',
      keys: ['ArrowRight', 'End'],
      owner:
        'chart.spec.ts › the range is the one stop: the arrow keys walk the slices and read each, the legend hides one and the turn is shared among the rest',
    },
    {
      block: 'demo-brush',
      what: "an edge of a navigator's selection",
      on: '[data-pct-part="handle"]',
      keys: ['ArrowRight', 'PageDown'],
      owner:
        'chart.spec.ts › the keys move an edge of the navigator, and the window above follows',
    },
    {
      block: 'demo-live',
      what: 'a reading added to a live chart',
      on: '[data-testid="live-add"]',
      keys: ['activate'],
      owner:
        'chart.spec.ts › a reading added at the end is drawn, and the window follows the meter',
    },
  ],
  // A wheel's listbox is a Tab stop the walk does reach — and all it hears there is the
  // arrival. What a reader says when the LINE moves is the component, so the keys are pressed.
  '/wheel': [
    {
      block: 'demo-list',
      what: 'the row a key brings to the line',
      on: '[role="listbox"]',
      keys: ['ArrowDown', 'ArrowDown', 'End'],
      owner:
        'wheel.spec.ts › a key moves the line, the row becomes the value, and the scroll follows',
    },
    {
      block: 'demo-ring',
      what: 'a ring coming round at its ends',
      on: '[role="listbox"]',
      keys: ['Home', 'ArrowUp'],
      owner:
        'wheel.spec.ts › the keys come round at the ends, and the scroll is put back on the middle turn',
    },
  ],
};
