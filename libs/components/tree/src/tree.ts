import {
  afterNextRender,
  Component,
  computed,
  contentChildren,
  ElementRef,
  inject,
  InjectionToken,
  input,
  isDevMode,
  model,
  Signal,
  signal,
} from '@angular/core';
import { PctIcon } from '@pacit/components/icon';

/**
 * The surface a tree needs from an item, behind a token so the two classes in this file
 * can hold each other without a cycle in a decorator — the chips' channel, both ways at
 * once: the tree collects items through it, and an item finds its parent item through it.
 */
const PCT_TREE_ITEM = new InjectionToken<PctTreeItem>('PCT_TREE_ITEM');

/**
 * A tree: a hierarchy the user walks — a file explorer, a nested outline.
 *
 * **The ARIA APG Tree View pattern, and a component that could not refuse the keys**: a tree
 * is ONE tab stop with a roving focus inside it, and the platform has no element that does
 * any of that walk. What this component adds is the walk
 * ([0056](../../../../docs/decisions/0056-a-tree-is-a-walk-the-platform-does-not-have.md));
 * everything else is refused ownership, the family line — the nodes are projected (the
 * markup IS the hierarchy, no `data` input), each branch owns its `expanded`, and the
 * tree owns exactly one thing: `selected`, the chosen item's `value`.
 *
 * Measured before it was written: custom elements carrying `treeitem` with `role="group"`
 * children and NO hand-written `aria-level` / `aria-posinset` / `aria-setsize` are clean
 * in all three engines — the DOM structure is the level, and numbers written by hand
 * would be a second copy of it that can drift. An empty `role="tree"` raises nothing
 * (`lesson-138`'s carve-out extends to `tree`), so the role is static.
 *
 * @example
 * <pct-tree [(selected)]="path" ariaLabel="Project">
 *   <pct-tree-item value="readme">README.md</pct-tree-item>
 *   <pct-tree-item value="src">
 *     src
 *     <pct-tree-item value="src/app">app.ts</pct-tree-item>
 *     <pct-tree-item value="src/main">main.ts</pct-tree-item>
 *   </pct-tree-item>
 * </pct-tree>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-tree',
  templateUrl: './tree.html',
  styleUrl: './tree.scss',
  host: {
    class: 'pct-tree',
    role: 'tree',
    '[attr.aria-label]': 'ariaLabel() || null',
    '(keydown)': 'walk($event)',
  },
})
export class PctTree {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The chosen item's `value` — the one thing the tree owns (the pagination's ownership
   * at a hierarchy). A model, because both directions are ordinary: the application
   * preselects, and Enter, Space or a click writes back. `null` is "nothing chosen".
   *
   * @since 0.1.0
   */
  readonly selected = model<string | null>(null);

  /**
   * The accessible name of the tree. Optional, the chips' reasoning: a library default
   * would have to guess what hierarchy this is, and two trees on one page are told
   * apart here.
   *
   * @since 0.1.0
   */
  readonly ariaLabel = input<string>('');

  /** Every item of the hierarchy, in document order — the map the walk moves over. */
  protected readonly items = contentChildren(PCT_TREE_ITEM, {
    descendants: true,
  });

  /** Where the roving `tabindex` last stood — may point at an item since folded away. */
  private readonly active = signal<PctTreeItem | null>(null);

  /** The items a walk may land on: every ancestor expanded, in document order. */
  protected readonly visibleItems = computed(() =>
    this.items().filter((item) => item.visible()),
  );

  /**
   * The item holding `tabindex="0"` right now. The fallback is the point: collapsing a
   * branch that held the active item must not leave the `0` on a node nobody can see,
   * so an active item that stopped being visible hands the pointer to the first visible
   * one — and an empty tree holds nobody.
   *
   * @since 0.1.0
   */
  readonly activeItem = computed(() => {
    const active = this.active();
    if (active && this.items().includes(active) && active.visible())
      return active;
    return this.visibleItems()[0] ?? null;
  });

  /**
   * A pointer press on an item: select it, and on a branch also toggle it (0056).
   *
   * @since 0.1.0
   */
  point(item: PctTreeItem): void {
    this.active.set(item);
    this.selected.set(item.value());
    if (item.branch()) item.expanded.update((expanded) => !expanded);
    item.focusHost();
  }

  /**
   * The walk (0056): Up/Down between visible items, Home/End to the ends,
   * inline-forward opens and enters, inline-back closes and leaves, Enter and Space
   * choose. The inline pair is read off the computed direction AT the keypress, so the
   * RTL swap is the platform's fact rather than a flag of ours.
   */
  protected walk(event: KeyboardEvent): void {
    const items = this.visibleItems();
    const current = this.activeItem();
    if (!current) return;
    const at = items.indexOf(current);
    const rtl = getComputedStyle(this.host.nativeElement).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';

    switch (event.key) {
      case 'ArrowDown':
        this.move(items[at + 1]);
        break;
      case 'ArrowUp':
        this.move(items[at - 1]);
        break;
      case 'Home':
        this.move(items[0]);
        break;
      case 'End':
        this.move(items[items.length - 1]);
        break;
      case forward:
        if (!current.branch()) return;
        if (current.expanded()) {
          // The next visible item after an expanded branch IS its first child — the
          // walk is document order, and the children stand directly under it.
          this.move(this.visibleItems()[at + 1]);
        } else {
          current.expanded.set(true);
        }
        break;
      case back:
        if (current.branch() && current.expanded()) {
          current.expanded.set(false);
        } else {
          this.move(current.parent ?? undefined);
        }
        break;
      case 'Enter':
      case ' ':
        this.selected.set(current.value());
        break;
      default:
        return;
    }
    // Only a handled key gets here: arrows and Space scroll the page, Home and End
    // jump it, and the walk has already answered every one of them.
    event.preventDefault();
  }

  private move(item: PctTreeItem | undefined): void {
    if (!item) return;
    this.active.set(item);
    item.focusHost();
  }
}

/**
 * One node: `role="treeitem"`, its own text as the label, and any nested
 * `pct-tree-item` elements pulled into the branch's `role="group"` — the consumer
 * writes the tree as the tree, and the two-slot projection does the sorting.
 *
 * A collapsed group is `hidden="until-found"` — the tabs' answer carried whole (0045,
 * 0056): find-in-page still searches a folded branch, and `beforematch` expands it, so
 * the match is landed in rather than watched vanishing.
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-tree-item',
  imports: [PctIcon],
  templateUrl: './tree-item.html',
  styleUrl: './tree-item.scss',
  providers: [{ provide: PCT_TREE_ITEM, useExisting: PctTreeItem }],
  host: {
    class: 'pct-tree__item',
    role: 'treeitem',
    '[tabindex]': 'rovingIndex()',
    '[attr.aria-expanded]': 'expandedAttr()',
    '[attr.aria-selected]': 'selectedAttr()',
    '(click)': 'press($event)',
  },
})
export class PctTreeItem {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly tree = inject(PctTree, { optional: true });

  /**
   * The item one level up, resolved by injection — the visibility chain below is
   * signals all the way, never a DOM read.
   *
   * @since 0.1.0
   */
  readonly parent = inject(PCT_TREE_ITEM, {
    optional: true,
    skipSelf: true,
  });

  /**
   * What `selected` holds when this item is chosen.
   *
   * @since 0.1.0
   */
  readonly value = input.required<string>();

  /**
   * Whether this branch is open — the item's own state, two-way, because folding is
   * local UI the application may still want to drive (expand-to-selection, "collapse
   * all"). Meaningless on a leaf, which draws no arrow and ignores the fold keys.
   *
   * @since 0.1.0
   */
  readonly expanded = model(false);

  /** The direct children — their presence is what makes this item a branch. */
  private readonly children = contentChildren(PCT_TREE_ITEM, {
    descendants: false,
  });

  /**
   * Whether the item has children: a branch, which is what decides its marker and `aria-expanded`.
   *
   * @since 0.1.0
   */
  readonly branch = computed(() => this.children().length > 0);

  /** `aria-expanded` is a branch's fact alone — a leaf carries no attribute at all. */
  protected readonly expandedAttr = computed(() =>
    this.branch() ? `${this.expanded()}` : null,
  );

  /** Selection is asked of the tree, so every item re-answers when the model moves. */
  protected readonly selectedAttr = computed(() =>
    this.tree ? `${this.tree.selected() === this.value()}` : null,
  );

  /**
   * Visible = every ancestor open. A chain of signals, so folding anywhere re-answers it.
   *
   * @since 0.1.0
   */
  readonly visible: Signal<boolean> = computed(
    () => !this.parent || (this.parent.expanded() && this.parent.visible()),
  );

  /** Exactly one visible item carries `0` — the tree says which (`activeItem`). */
  protected readonly rovingIndex = computed(() =>
    this.tree?.activeItem() === this ? 0 : -1,
  );

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnLooseItem());
  }

  /**
   * Puts the focus on the item's own element, which is where a tree keeps it.
   *
   * @since 0.1.0
   */
  focusHost(): void {
    this.host.nativeElement.focus();
  }

  /**
   * Stopped, because a treeitem stands inside its ancestors: one press bubbling up
   * would select the whole lineage, each ancestor overwriting the child's choice.
   */
  protected press(event: Event): void {
    event.stopPropagation();
    this.tree?.point(this);
  }

  /**
   * An item outside `pct-tree`, or wrapped in something inside it, is a `treeitem`
   * whose `tree` or `group` is not directly above it, invisible to the walk — the
   * chips' warning at the fourth component, asked of the platform.
   */
  private warnOnLooseItem(): void {
    const above = this.host.nativeElement.parentElement;
    const role = above?.getAttribute('role');
    if (this.tree && (role === 'tree' || role === 'group')) return;
    // One literal on purpose — the breadcrumb's mutation-run lesson: a joined fragment
    // nothing asserts on is a surviving mutant, one string is one.
    console.warn(
      `[pct-tree-item] An item whose parent element is neither a tree nor a group. \`role="treeitem"\` needs \`role="tree"\` or \`role="group"\` directly above it, and the walk lives in the tree — make the item a child of <pct-tree> or of another <pct-tree-item>.`,
    );
  }
}
