# `PctMenu` — a list of commands, walked by the keyboard and chosen from

**Summary:** A list of commands to choose from, walked by the keyboard and closed by the choice.
**Entrypoint:** `@pacit/components/menu`
**Selector:** `pct-menu` · `button[pctMenuItem]` · `[pctMenuTrigger]`
The panel is `PctMenu`, the commands on it are `PctMenuItem`, and the control that opens either
is `PctMenuTrigger` — the same directive for a menu button and for a submenu's row.
**Status:** released
**Category:** Actions & navigation
**ARIA APG pattern:** [Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) —
`role="menu"` on the panel, `role="menuitem"` on the rows, `aria-haspopup="menu"` and
`aria-expanded` on the control. A submenu is the same pattern one level down: the item that
opens one carries those same two attributes

**Focus really moves, and that is the whole difference from the select.** A listbox under a
combobox keeps focus on the trigger and points at the active option with
`aria-activedescendant` ([`lesson-18`](../lessons.md#lesson-18)); a menu gives DOM focus to the
item itself ([0032](../decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md)). Everything
else follows from it: the rows are the roving focus, the panel is focused only when it has no
row to hand focus to, and no row on a layer is ever a Tab stop — Tab closes the tree and gives
the page back its own order
([0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).

**`inline` turns the panel into a region of the page**, drawn in the host where the consumer
wrote it: a column of commands docked into a page rather than one lifted off it. It is the cut
[0047](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md) made for the
drawer, offered here per instance — the same panel is a layer in one place and a region in
another, and the consumer says which. What goes with the layer is the trigger, the positioning
and every dismissal the closing stack delivered: **an inline menu never closes itself.** What
arrives with the region is the one thing 0031 says a layer must not have — a Tab stop, because
the page's own order now runs through the commands.

## Usage

```html
<button pctButton [pctMenuTrigger]="actions">Actions</button>
<pct-menu #actions>
  <button pctMenuItem (click)="rename()">Rename</button>
</pct-menu>
```

Docked into the page instead — no trigger, and `open` written by the application alone:

```html
<pct-menu inline [open]="true" ariaLabel="Actions">
  <button pctMenuItem (click)="rename()">Rename</button>
</pct-menu>
```

## Contract

|                 |                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | none — a menu holds no value. What it holds is an open state, and that is a `model`: an application opens it, and the menu closes itself on a choice, on Escape, on a press outside, on the trigger and on Tab — all five of them a layer getting out of the page's way, so an `inline` menu does none of them and the model is the application's alone                                                                                        |
| **Inputs**      | `open` (a `model<boolean>`), `ariaLabel`, `ariaLabelledby`, `placement` (`top` \| `bottom` \| `start` \| `end`, default `bottom`), `inline` (a boolean attribute, default `false` — the panel in the host instead of on a layer); on an item: `disabled`; on the trigger: `pctMenuTrigger` (the `pct-menu` itself, from a template reference variable)                                                                                         |
| **Outputs**     | `closed: PctMenuCloseReason` — `item` \| `trigger` \| `escape` \| `outside` \| `away` \| `api`. `item` is the one a popover has no equivalent of: a menu exists to be chosen from, so the close that follows a choice is not the close that follows a dismissal. Inline the answer is always `api`: nothing but the application ever closes one                                                                                                |
| **Naming**      | the panel is named by its **trigger** unless told otherwise — the id is read where the control has one and written where it has not, which is what the APG's own example does. `ariaLabel`/`ariaLabelledby` override it. The rows need no name of their own: their text is the name                                                                                                                                                            |
| **Slots**       | the default one: the rows are the consumer's, projected as direct children of `role="menu"` — a wrapper drawn between the two breaks the parent/child relation the role rests on, and axe says so                                                                                                                                                                                                                                              |
| **Parts**       | `panel` on `PctMenu`, `item` on `PctMenuItem`                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Tokens**      | the `--pct-menu-*` prefix plus four entries in `contrast.policy.json`. The surface is the **page's own** (`pct.surface` / `pct.text`), as the popover's is: a menu is a piece of the page lifted off it for a moment                                                                                                                                                                                                                           |
| **DI contract** | `PCT_MENU_ITEM` — the channel a row announces itself on, so that the menu can query it without importing the class the class would have to import back. `pctOverlay`, `pctPlacementPositions`, `pctListNavigation` and `pctAfterTransition` from `core`                                                                                                                                                                                        |
| **Strings**     | none — everything it shows is the author's. The component draws no chrome of its own, so there is nothing to translate                                                                                                                                                                                                                                                                                                                         |
| **SSR**         | on a layer the panel is a template attached to an overlay by a browser render, so a menu left `open` at bootstrap sends no markup and hydrates no mismatch; the trigger's `aria-expanded` is the deliberate exception — it is part of the control's markup rather than of an interaction. **Inline it is the opposite and that is the point**: an open panel is ordinary content of the host, so its commands are in the HTML the server sends |

**What arrives from somewhere else, and what is written here.** The positioning is the CDK's
flexible strategy, given a list of positions by `pctPlacementPositions`; the Escape ordering and
the outside press are the CDK dispatchers'
([0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md)); the walk — the reachable
set, the edges, the typed prefix — is `pctListNavigation` in `core`, the select's machinery with
one line added for this role ([below](#the-line-core-learned-here)). Written here: the key map,
where focus goes and comes back from, and what a tree of panels does when one of them is pressed
outside of.

### The line `core` learned here

`pctListNavigation` was extracted with wrapping deliberately **left out**: one consumer cannot tell
a shared property from an accident of the only case. The menu is the second consumer and it arrives
with the opposite answer — a native `<select>` stops at its last option and every menu the platform
draws comes round — so the edge became a parameter of the walk (`wrap`) rather than a second copy of
it.

What the parameter had to be careful about is the difference between **past** the end and **at**
it: `PageDown` is `move(10)`, and a wrapping list that took a modulo of it would answer "ten rows
down" with a lap round the menu. So a movement that ends exactly one place past the edge comes
round, and one that overshoots by more stops there.

## Parts

| part    | what it is                    |
| ------- | ----------------------------- |
| `panel` | the floating list of commands |
| `item`  | one command                   |

## Theming

```css
[data-theme='brand'] {
  --pct-menu-panel-bg: #f0fdfa;
  --pct-menu-item-fg: #134e4a;
  --pct-menu-item-bg-active: #ccfbf1;
}
```

## Keyboard map

| key                                  | effect                                                                                                                                                                                                   | test                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `ArrowDown` / `ArrowUp`              | the next/previous command, skipping what is disabled, coming round at the ends                                                                                                                           | `apps/sandbox-e2e/src/menu.spec.ts`                                           |
| `Home` / `End`                       | the first/last command                                                                                                                                                                                   | `apps/sandbox-e2e/src/menu.spec.ts`                                           |
| a letter                             | the first command whose text starts with what has been typed; a second letter narrows it                                                                                                                 | `apps/sandbox-e2e/src/menu.spec.ts`                                           |
| `Enter` / `Space`                    | runs the command — **the platform's**, because a row is a `<button>`, and nothing here reads it                                                                                                          | `apps/sandbox-e2e/src/menu.spec.ts`                                           |
| `Escape`                             | closes one level, focus back to what opened it: the trigger, or the row a submenu hangs on                                                                                                               | `apps/sandbox-e2e/src/menu.spec.ts`                                           |
| `Tab` / `Shift+Tab`                  | closes the whole tree and gives focus back to the trigger, for the page's order to carry on; **inline it is left alone** — the panel is already in that order, so Tab walks out of it and closes nothing | `apps/sandbox-e2e/src/menu.spec.ts` · `libs/components/menu/src/menu.spec.ts` |
| `ArrowRight`                         | into the submenu of the active row — **logical**: in a right-to-left page it is `ArrowLeft`                                                                                                              | `apps/sandbox-e2e/src/menu.spec.ts`                                           |
| `ArrowLeft`                          | out of a submenu, back onto the row it hangs on; in a root menu the key is left alone                                                                                                                    | `libs/components/menu/src/menu.spec.ts`                                       |
| `ArrowDown`/`ArrowUp` on the trigger | opens it at the first / at the last command                                                                                                                                                              | `apps/sandbox-e2e/src/menu.spec.ts`                                           |

The panel itself is not in the Tab order (`tabindex="-1"`); it takes focus only when the menu has
no command to give it to, so that an empty menu is still somewhere Escape can be pressed.

**Inline, one command is.** A panel drawn in the page has to be reachable from the page's own
order, so exactly one row carries `tabindex="0"` — the row the walk stands on, or the first
reachable one before the first movement — and the arrows do the walking from there. It is the
roving tabindex the APG writes this pattern with, which the layer deliberately does not have
(0031), and the reason the two answers differ is the one thing the mode changes: over a layer Tab
leaves the menu, inline it leaves the row.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | `libs/components/menu/src/menu.ts` — the pattern named in the class comment, together with why focus moves here and points in the select                                                                                                                                                                                                                                                 |
| Keyboard map tested             | `apps/sandbox-e2e/src/menu.spec.ts` — every row of the table above in three engines, `Enter` and `Space` among them because "the platform does it" is a claim about browsers; `libs/components/menu/src/menu.spec.ts` for the arrow a root menu leaves alone                                                                                                                             |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/menu` view, and separately **an open menu with a submenu beside it, page and panels together**: `role="menu"` has required children and `role="menuitem"` a required parent, and a nested panel is the arrangement where either could go wrong                                                                                               |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — `menu-open`, with the submenu open: two panels of the page's own surface drawn side by side, where the edges and the shadows are all there is between them and the page                                                                                                                                                                          |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the row the user is on carries `SelectedItem`/`SelectedItemText`, the disabled row `GrayText`, the panel a `CanvasText` edge. The one state this component has is a background, and this is the mode that would flatten it                                                                                                                |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/menu.spec.ts` — the duration read from the panel is the reduced one, and the leave still ends                                                                                                                                                                                                                                                                      |
| Touch target ≥ 24×24 px         | `libs/components/menu/src/menu-item.scss` — `min-block-size: var(--pct-menu-item-target-min)` on the row, which is the target: a row runs the full width of the panel, so the pointer never has to find the text                                                                                                                                                                         |
| Size axis                       | none — deliberately: a menu row is not a control with a height. `req-api-size` is about `--pct-control-height-*`, and the row's floor is a touch target rather than a size step                                                                                                                                                                                                          |
| Density axis                    | none — gap. The same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                   |
| RTL                             | `apps/sandbox-e2e/src/menu.spec.ts` — the submenu drawn on the starting side and **the arrow keys mirrored with it**. It is the one component here where the writing direction reaches the key map, not just the layout                                                                                                                                                                  |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — the `/menu` view renders and hydrates with no `NG05xx`; a closed menu contributes no markup, and the trigger's `aria-expanded="false"` is there from the server. The inline half is measured in the unit spec instead, under `ngServerMode` — the flag Angular's own `afterNextRender` reads — because no e2e view renders an inline menu yet |
| Inline: a region, not a layer   | `libs/components/menu/src/menu.spec.ts` — the panel drawn in the host with no overlay ever created, one part in the document rather than two, the Tab stop, and one case per dropped promise: no trigger report, no dismissal, no leave. **Gap:** no e2e view, so the mode has no axe run, no screenshot and no three-engine reading of the roving `tabindex`                            |
| Forms                           | none — deliberately: a menu is not a form control. It holds no value and implements no `FormValueControl`; a command that edits one is the consumer's                                                                                                                                                                                                                                    |
| The page behind stays live      | `apps/sandbox-e2e/src/menu.spec.ts` — a control beside the panel answers a press while the menu is up, and `<html>` is not locked. The popover's promise, measured again because it is what separates both of them from the dialog                                                                                                                                                       |
| A tree of panels                | `apps/sandbox-e2e/src/menu.spec.ts` (three levels, one Escape per level, choosing anywhere closing all of it, the pointer opening a submenu without taking focus into it) + `libs/components/menu/src/menu.spec.ts` (a press inside a submenu is not a press outside its parent)                                                                                                         |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                                                                                                                                                                      |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json` — the command's text measured twice, against the panel and against the row it stands on, because a menu spends half its life with one row painted; the edge against the page; the disabled row as a warning, on the same footing as every other                                                                                                   |
| Strings through `PCT_TEXTS`     | none — deliberately: the component writes no string of its own                                                                                                                                                                                                                                                                                                                           |
| Size budget                     | `libs/components/size.snapshot.md` — the `./menu` row, with `./core` beside it                                                                                                                                                                                                                                                                                                           |
| Screen-reader log               | none — gap. The same one the dialog, the select, the tooltip and the popover have. What a reader really announces on arriving at a row of a nested menu is a question axe does not answer — axe examines structure, it does not listen                                                                                                                                                   |
| docs page                       | `/components/menu` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                                                    |

## Decisions

[0066](../decisions/0066-a-panel-is-a-layer-or-a-region-and-the-consumer-says-which.md) (why `inline` exists, and the tab stop a menu that lost its trigger had to gain),
[0032](../decisions/0032-a-menu-moves-focus-a-listbox-points-at-it.md) (the main one — why focus
moves here and points in the select, and what each road costs),
[0031](../decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md) (Tab closes the tree and
hands focus back — the popover's rule, second consumer),
[0024](../decisions/0024-the-closing-stack-is-the-dependency-s.md) (Escape and the outside press
come from the dependency's dispatchers, which is what makes one Escape one level),
[0025](../decisions/0025-a-panel-says-whether-it-takes-focus.md) (this is a panel of the kind
that takes focus), [0013](../decisions/0013-no-headless-split.md) (the inputs are ours, the
mechanisms the dependency's)

## Known limitations

- **A command is a `<button>`.** The selector says `button[pctMenuItem]` and nothing else
  matches, so a menu of links is not this component's shape. The reason is `disabled`: the
  platform's own disabled state is the only one a consumer's `(click)` on the same element
  cannot get past ([`lesson-95`](../lessons.md#lesson-95)), and a link has no such state. A
  command that navigates calls the router.
- **The rows are direct children.** `contentChildren` finds an item wherever it stands, but
  `role="menu"` requires `role="menuitem"` children — a `<div>` drawn between the panel and the
  rows breaks the relation, and the axe case above is what would catch it.
- **No `menuitemcheckbox`, no `menuitemradio`, no separators, no groups.** A menu of commands is
  what this is; a menu that carries state is a different pattern with a different keyboard, and
  it will arrive when something here needs one.
- **One trigger per menu.** Focus comes back to "the trigger", so two controls opening one panel
  would make that "whichever registered last". Reported in dev mode rather than repaired: the
  fix is a menu each, and the library cannot know which of the two the author meant.
- **The pointer opens a submenu with no delay and no safe triangle.** Crossing a row on the way
  to a submenu that is already open closes it, and the user has to go back. The alternatives —
  a timer, or the diagonal corridor a desktop menu draws — are both state that has to be right
  in three engines, and neither is worth it until somebody reports the crossing.
- **An inline menu has no leave.** The overlay owned the wait that let the panel fade out, and a
  panel the template removes takes its transition with it — so inline it fades in
  (`@starting-style`, which is the sheet's) and then goes at once, with `data-pct-leaving` never
  written on it. The alternative is a second mechanism keeping removed markup alive for the
  length of a transition, and nothing has asked for one.
- **An inline menu with a `[pctMenuTrigger]` is reported, not repaired.** The pair cannot both be
  meant: a control that says `aria-haspopup="menu"` for a panel which never pops up. Either half
  may be the one the author wanted — a menu that is a layer on a narrow screen and a region on a
  wide one drops the control with the same condition that sets the input — so the library says so
  in dev mode and changes nothing.
- **Typeahead does not type spaces.** The space is how a button is pressed, so a menu that read
  it as a letter would swallow the press of every command whose label needs a second word.
