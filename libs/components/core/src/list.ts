import { DestroyRef, inject, linkedSignal, Signal } from '@angular/core';

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
 *
 * @since 0.1.0
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
  /**
   * Whether two entries of two readings of one list are the **same entry** — what the cursor
   * is put back on when the list is replaced under it. Absent means identity, which is the
   * answer wherever the entries themselves survive the change (a menu's items are component
   * instances); a control whose rows are rebuilt on every reading — because they are derived
   * from data — says here what makes two of them one.
   *
   * It is asked only about a list that changed on **nobody's keystroke**: a walk that moves
   * itself has already said where it stands.
   */
  readonly sameItem?: (a: T, b: T) => boolean;
  /** Life of the typed prefix, in milliseconds; `PCT_TYPEAHEAD_DELAY` unless given. */
  readonly typeaheadDelay?: number;
  /**
   * What happens at the ends: `false` (the default) stops there, `true` comes round. **It is
   * the role that decides**, and the two roles here disagree — a native `<select>` stops at
   * the last option and a menu returns to its first, both of them matching what the platform
   * does for the same pattern.
   *
   * It is a parameter and not a walk of its own for the reason `move` gives: only the EDGE
   * differs, and everything before the edge — the reachable set, the clamping of a wide
   * delta, the prefix — is the same walk in both roles.
   */
  readonly wrap?: boolean;
}

/**
 * Keyboard walk over a list: the active index and the movements that change it. The key map
 * stays with the control, because it differs by role — a select opens on `ArrowDown` and
 * picks on `Enter`, a menu closes its submenu on `ArrowLeft`, and neither of those is a
 * property of the walk. What the walk owns is what the roles share: skipping what cannot be
 * reached, the edges, and the prefix.
 *
 * @since 0.1.0
 */
export interface PctListNavigation {
  /**
   * Index of the entry active by keyboard, `-1` for none. **Not the same as the selected
   * one**: in the `aria-activedescendant` pattern focus never leaves the trigger, so the
   * active entry is where the keyboard stands, and the selected one is what the value says.
   *
   * It **follows its entry when the list is replaced**, because an index alone is a promise
   * only a list that never changes can keep: a list answered by a server arrives twice, and
   * the position a row held among three matches names a different row among thirty. Where the
   * new list cannot name the entry any more the cursor goes to the first reachable one, and a
   * walk that had no list at all — an empty one, waiting — starts at the top when it arrives.
   * A cursor deliberately put nowhere over a list that HAD entries stays nowhere: that is a
   * closed panel, and nobody is walking it.
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
   * Moves by `delta` over the reachable entries. A delta wider than what is left clamps to
   * the edge, which is what makes it the whole answer for `PageDown` as well as for
   * `ArrowDown`.
   *
   * **At the edge `wrap` decides**, and it decides for a movement that ends exactly ONE place
   * past it: `ArrowDown` from the last entry is the first, `PageDown` from anywhere is the
   * last and stays there. That is the distinction a wrapping list needs in order to keep
   * answering `PageDown` at all — a modulo would turn "ten rows down" into a lap round the
   * menu, and clamping alone would take the wrap away from the key it exists for.
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
 * Deliberately **not** here while there was one consumer, because one consumer cannot tell a
 * shared property from an accident of the only case: the key map, and scrolling the active
 * entry into view, which is DOM the walk never touches. **Wrapping at the ends was on that
 * list and has come off it** — the menu arrived with the opposite answer to the listbox's, and
 * two roles that disagree about one line of a walk make it a parameter of the walk rather than
 * a second copy of it (`wrap`, and `move` for what "at the end" means).
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
 *
 * @since 0.1.0
 */
export function pctListNavigation<T>(src: PctListSource<T>): PctListNavigation {
  const delay = src.typeaheadDelay ?? PCT_TYPEAHEAD_DELAY;

  /** Positions of the reachable entries of one reading of the list, in order. */
  const reachableIn = (items: readonly T[]): number[] => {
    const isDisabled = src.isDisabled;
    const indexes: number[] = [];
    for (let i = 0; i < items.length; i++) {
      if (!isDisabled?.(items[i])) indexes.push(i);
    }
    return indexes;
  };

  /** The domain of every movement — the reachable entries of the list as it stands now. */
  const reachable = (): number[] => reachableIn(src.items());

  /**
   * The active index is **derived from the list** and written over by the walk, which is what
   * `linkedSignal` is: every movement below sets it outright, and a new list recomputes it
   * from where the cursor stood. An effect could not do this job — it would read the index it
   * writes, which is one consumer paying an extra pass and two never finishing
   * (`lesson-94`) — and a plain signal could not do it at all: it would keep a number whose
   * row has moved, so `aria-activedescendant` would name an id no element carries and the
   * next `Enter` would pick a row nobody pointed at.
   */
  const activeIndex = linkedSignal<readonly T[], number>({
    source: src.items,
    computation: (items, previous) => {
      // Nobody has walked yet: the control decides where a walk starts (a select opens on its
      // answer), and until it does there is no active entry.
      if (previous === undefined) return -1;

      const first = (): number => {
        const list = reachableIn(items);
        return list.length > 0 ? list[0] : -1;
      };

      const before = previous.source;
      // `-1` indexes an array to `undefined` exactly as a position past its end does, and the
      // two are one fact here: there is no entry under the cursor.
      const stood = before[previous.value];
      if (stood === undefined) {
        // Nothing under the cursor, and the two reasons for that are different facts. A list
        // that was EMPTY was a list nobody could stand in — the panel of an async control
        // waiting for its rows — and its arrival is what a cursor was waiting for. A cursor
        // put nowhere over a list that had entries was put there on purpose, by the control
        // that closed its panel.
        return before.length === 0 ? first() : -1;
      }

      const same = src.sameItem ?? Object.is;
      const found = items.findIndex((item) => same(item, stood));
      // A disabled entry is not skipped here: `setActive` already lets the cursor stand on
      // one — a selected option gone disabled is still where the keyboard starts — and it is
      // the MOVEMENTS that decide what may be landed on.
      return found >= 0 ? found : first();
    },
  });

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
      const last = list.length - 1;
      const target = current + delta;
      // Off the end is not the same question as at the end. A wide delta clamps in both
      // roles — `PageDown` from the middle of a wrapping menu is its last entry, not a lap
      // round it — and the wrap is what a movement made FROM the edge does.
      let next = Math.min(Math.max(target, 0), last);
      if (src.wrap) {
        if (target === -1) next = last;
        else if (target === last + 1) next = 0;
      }
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
