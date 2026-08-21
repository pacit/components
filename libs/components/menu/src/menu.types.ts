/**
 * Why a menu closed. `open` says *that* it is shut and nothing else, and the question an
 * application asks about a menu it did not close itself — was something chosen, or did the
 * user walk away — is answered by this and by nothing in the boolean.
 *
 * - `item` — an item was activated. **The one reason a menu has and a popover does not**: a
 *   menu exists to be chosen from, so the close that follows a choice is not the same event as
 *   the close that follows a dismissal, and an application that reopens on `escape` but not on
 *   `item` has no other way of telling them apart;
 * - `trigger` — the control that opened it was pressed again;
 * - `escape` — the Escape key, delivered by the closing stack
 *   ([0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md)). On a
 *   submenu it closes that submenu alone, because the stack hands the key to the top-most
 *   panel and to no other;
 * - `outside` — a press landed somewhere that is neither the menu tree nor the trigger;
 * - `away` — the keyboard walked out: Tab from anywhere in the tree
 *   ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)),
 *   or, for a submenu, the parent's active item moving off the item it hangs on;
 * - `api` — the value written from the outside, which a menu cannot tell from any other write.
 */
export type PctMenuCloseReason =
  'item' | 'trigger' | 'escape' | 'outside' | 'away' | 'api';

/**
 * Where focus lands when a panel comes up — the opening's half of `PctMenuCloseReason`.
 *
 * `none` is the one that is not obvious and the one a mouse needs: a submenu opened by the
 * pointer resting on its parent item must **not** pull focus off that item, or the highlight
 * would jump a level ahead of the user every time they crossed a row on their way somewhere
 * else. Keyboard and press open with `first`, `ArrowUp` on a trigger with `last`.
 */
export type PctMenuOpenIntent = 'first' | 'last' | 'none';
