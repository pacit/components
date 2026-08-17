import { DestroyRef, inject, signal, Signal } from '@angular/core';

/**
 * How long a typed prefix lives before the next letter starts a new one, in milliseconds.
 * The value comes from a native `<select>`, whose typeahead this one is parity with — long
 * enough to type "sw" in "Sweden", short enough that a letter typed after a pause is a new
 * search rather than the tail of the last one.
 */
const PCT_TYPEAHEAD_DELAY = 500;

/**
 * The list a keyboard walks over, described by the control that owns it. `core` never sees the
 * item type: it asks the two questions a walk needs — may this entry be reached, and what text
 * does typeahead match against — and the control answers them for its own option shape.
 */
export interface PctListSource<T> {
  /** The list itself. Read as a signal, so an option list changing mid-walk is seen. */
  readonly items: Signal<readonly T[]>;
  /**
   * Which entries no movement may land on. Absent means every entry is reachable — a list
   * with no disabled state does not have to say so.
   */
  readonly isDisabled?: (item: T) => boolean;
  /**
   * The text typeahead matches a prefix against. **Absent switches typeahead off**: a list
   * with no text to type at (icons, colour swatches) would otherwise match every letter
   * against `undefined` and activate nothing, which is the same result reached by an
   * accident rather than by a decision.
   */
  readonly label?: (item: T) => string;
  /** Life of the typed prefix, in milliseconds; `PCT_TYPEAHEAD_DELAY` unless given. */
  readonly typeaheadDelay?: number;
}

/**
 * Keyboard walk over a list: the active index and the movements that change it. The key map
 * stays with the control, because it differs by role — a select opens on `ArrowDown` and
 * picks on `Enter`, a menu closes its submenu on `ArrowLeft`, and neither of those is a
 * property of the walk. What the walk owns is what the roles share: skipping what cannot be
 * reached, the edges, and the prefix.
 */
export interface PctListNavigation {
  /**
   * Index of the entry active by keyboard, `-1` for none. **Not the same as the selected
   * one**: in the `aria-activedescendant` pattern focus never leaves the trigger, so the
   * active entry is where the keyboard stands, and the selected one is what the value says.
   */
  readonly activeIndex: Signal<number>;
  /**
   * Sets the active index outright, with no questions asked about the entry: a control
   * opening its list activates what is **selected**, and a selected entry that has since been
   * disabled is still where the keyboard should start. Movements skip it from then on.
   */
  setActive(index: number): void;
  /** Activates the first reachable entry; `-1` when there is none. */
  first(): void;
  /** Activates the last reachable entry; `-1` when there is none. */
  last(): void;
  /**
   * Moves by `delta` over the reachable entries, **without wrapping** — a native `<select>`
   * stops at the ends and so does this. A delta wider than what is left clamps to the edge,
   * which is what makes it the whole answer for `PageDown` as well as for `ArrowDown`.
   *
   * From an index outside the reachable list (`-1`, or an entry gone disabled) it jumps to
   * the edge the movement comes from: down from nowhere is the first entry, up is the last.
   */
  move(delta: number): void;
  /**
   * Adds a letter to the prefix and activates the first reachable entry whose label starts
   * with it. A prefix that matches nothing leaves the active entry where it was — the typing
   * was a miss, not an instruction to move.
   */
  typeahead(char: string): void;
  /** Back to no active entry — what a control does when its list closes. */
  clear(): void;
}

/**
 * The list machinery as a function returning signals — the `pctFieldMessages` idiom, and the
 * mechanism decision 0013 settled on for `core`: composition, never a base class under
 * somebody else's template.
 *
 * It was extracted from `PctSelect` **before** the second consumer rather than after. The
 * denominator is `lesson-21`: the same message logic reached four controls before anybody
 * counted it, and a fix then cost four identical changes. Autocomplete, multiple selection,
 * the menu and a command palette all walk a list the same way, so the copy was going to
 * happen on a much bigger piece (req-project-core).
 *
 * Deliberately **not** here, because one consumer cannot tell a shared property from an
 * accident of the only case: wrapping at the ends (a menu wraps, a listbox does not), the key
 * map, and scrolling the active entry into view, which is DOM the walk never touches.
 *
 * Needs an injection context — the typeahead timer is released with the component that owns
 * it, so call this in a field initialiser.
 *
 * @example
 * private readonly nav = pctListNavigation({
 *   items: this.options,
 *   isDisabled: (o) => o.disabled === true,
 *   label: (o) => o.label,
 * });
 */
export function pctListNavigation<T>(src: PctListSource<T>): PctListNavigation {
  const activeIndex = signal(-1);
  const delay = src.typeaheadDelay ?? PCT_TYPEAHEAD_DELAY;

  /** Positions of the reachable entries, in list order — the domain of every movement. */
  const reachable = (): number[] => {
    const isDisabled = src.isDisabled;
    const items = src.items();
    const indexes: number[] = [];
    for (let i = 0; i < items.length; i++) {
      if (!isDisabled?.(items[i])) indexes.push(i);
    }
    return indexes;
  };

  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * The timer clearing the prefix would outlive the component: closing the list with a key
   * right after typing leaves a scheduled call which, once the control is destroyed, keeps it
   * in memory — and in tests hands work over to the next one.
   */
  inject(DestroyRef).onDestroy(() => clearTimeout(timer));

  return {
    activeIndex: activeIndex.asReadonly(),

    setActive(index: number): void {
      activeIndex.set(index);
    },

    first(): void {
      const list = reachable();
      activeIndex.set(list.length > 0 ? list[0] : -1);
    },

    last(): void {
      const list = reachable();
      activeIndex.set(list.length > 0 ? list[list.length - 1] : -1);
    },

    move(delta: number): void {
      const list = reachable();
      if (list.length === 0) return;
      const current = list.indexOf(activeIndex());
      if (current === -1) {
        activeIndex.set(delta > 0 ? list[0] : list[list.length - 1]);
        return;
      }
      const next = Math.min(Math.max(current + delta, 0), list.length - 1);
      activeIndex.set(list[next]);
    },

    typeahead(char: string): void {
      const label = src.label;
      if (!label) return;

      buffer += char.toLowerCase();
      clearTimeout(timer);
      timer = setTimeout(() => (buffer = ''), delay);

      const match = src
        .items()
        .findIndex(
          (item) =>
            !src.isDisabled?.(item) &&
            label(item).toLowerCase().startsWith(buffer),
        );
      if (match >= 0) activeIndex.set(match);
    },

    clear(): void {
      activeIndex.set(-1);
    },
  };
}
