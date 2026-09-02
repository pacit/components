import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctTree, PctTreeItem } from './tree';

/**
 * Four arrangements. **Host** is a project tree with a collapsed branch and a nested
 * branch inside it — deep enough that every rule of the walk has something to prove.
 * **RtlHost** is the same skeleton under `dir="rtl"`, because the inline pair swaps by
 * the computed direction and only a rendered direction can say so. The last two are the
 * shapes the dev-mode warning exists for.
 */
@Component({
  imports: [PctTree, PctTreeItem],
  template: `
    <pct-tree [(selected)]="chosen" ariaLabel="Project">
      <pct-tree-item value="readme">README.md</pct-tree-item>
      <pct-tree-item value="src" [(expanded)]="srcOpen">
        src
        <pct-tree-item value="src/app">app.ts</pct-tree-item>
        <pct-tree-item value="src/deep">
          deep
          <pct-tree-item value="src/deep/x">x.ts</pct-tree-item>
        </pct-tree-item>
      </pct-tree-item>
      <pct-tree-item value="docs">
        docs
        <pct-tree-item value="docs/a">a.md</pct-tree-item>
      </pct-tree-item>
    </pct-tree>
  `,
})
class Host {
  readonly chosen = signal<string | null>(null);
  readonly srcOpen = signal(false);
}

@Component({
  imports: [PctTree, PctTreeItem],
  // The inline `direction` is jsdom's boundary, not a shortcut: this suite runs in
  // jsdom, whose getComputedStyle does not inherit `direction` down from a `dir`
  // attribute, so the walk would read `ltr` under any wrapper. What THIS case examines
  // is the swap given a direction; that the direction really reaches the component from
  // `dir="rtl"` is the RTL audit's reading, in three real engines.
  template: `
    <div dir="rtl">
      <pct-tree
        [(selected)]="chosen"
        ariaLabel="Prosjekt"
        style="direction: rtl"
      >
        <pct-tree-item value="src">
          src
          <pct-tree-item value="src/app">app.ts</pct-tree-item>
        </pct-tree-item>
      </pct-tree>
    </div>
  `,
})
class RtlHost {
  readonly chosen = signal<string | null>(null);
}

@Component({
  imports: [PctTreeItem],
  template: `<pct-tree-item value="solo">Solo</pct-tree-item>`,
})
class LooseItemHost {}

@Component({
  imports: [PctTree, PctTreeItem],
  // No ariaLabel on purpose: this is also the arrangement that proves a nameless tree
  // stays nameless — the input's own default speaking, not a bound empty string.
  template: `
    <pct-tree>
      <div><pct-tree-item value="boxed">Boxed</pct-tree-item></div>
    </pct-tree>
  `,
})
class WrappedItemHost {}

@Component({
  imports: [PctTree, PctTreeItem],
  template: `
    <pct-tree [(selected)]="chosen" ariaLabel="Shrinking">
      @for (label of labels(); track label) {
        <pct-tree-item [value]="label">{{ label }}</pct-tree-item>
      }
    </pct-tree>
  `,
})
class DynamicTreeHost {
  readonly chosen = signal<string | null>(null);
  readonly labels = signal(['One', 'Two', 'Three']);
}

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

const tree = () => document.querySelector('pct-tree') as HTMLElement;
const item = (value: string) =>
  document.querySelector(`pct-tree-item[value="${value}"]`) as HTMLElement;

/** Dispatches a key where the walk listens — the tree host, via the platform's bubbling. */
async function key(fixture: ComponentFixture<unknown>, k: string) {
  (document.activeElement ?? tree()).dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true }),
  );
  await settle(fixture);
}

const warnings = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PctTree — the structure the probe measured', () => {
  it('a named tree of treeitems, branches carrying aria-expanded and leaves nothing', async () => {
    await render(Host);

    expect(tree().getAttribute('role')).toBe('tree');
    expect(tree().getAttribute('aria-label')).toBe('Project');
    expect(item('readme').getAttribute('role')).toBe('treeitem');
    expect(item('readme').getAttribute('aria-expanded')).toBeNull();
    expect(item('src').getAttribute('aria-expanded')).toBe('false');
    expect(item('docs').getAttribute('aria-expanded')).toBe('false');
  });

  it('nested items land in the branch’s group; the label slot keeps the text', async () => {
    await render(Host);

    const group = item('src').querySelector('[role="group"]');
    expect(group).not.toBeNull();
    expect(item('src/app').parentElement).toBe(group);
    expect(
      item('src').querySelector('[data-pct-part="label"]')?.textContent,
    ).toContain('src');
  });

  it('the arrow box is reserved on every row and drawn only on branches', async () => {
    await render(Host);

    expect(
      item('src').querySelector('[data-pct-part="arrow"] pct-icon'),
    ).not.toBeNull();
    const leafArrow = item('readme').querySelector('[data-pct-part="arrow"]');
    expect(leafArrow).not.toBeNull();
    expect(leafArrow?.querySelector('pct-icon')).toBeNull();
  });

  it('a folded group is hidden="until-found", an open one is not hidden at all', async () => {
    const fixture = await render(Host);

    const group = item('src').querySelector('[role="group"]');
    expect(group?.getAttribute('hidden')).toBe('until-found');
    fixture.componentInstance.srcOpen.set(true);
    await settle(fixture);
    expect(group?.hasAttribute('hidden')).toBe(false);
  });

  it('beforematch on a folded group opens the branch — found text is landed in', async () => {
    const fixture = await render(Host);

    item('src')
      .querySelector('[role="group"]')
      ?.dispatchEvent(new Event('beforematch'));
    await settle(fixture);
    expect(fixture.componentInstance.srcOpen()).toBe(true);
  });

  it('exactly one item holds tabindex 0 — the first visible, until the walk says otherwise', async () => {
    await render(Host);

    const zeros = [...document.querySelectorAll('pct-tree-item')].filter(
      (el) => el.getAttribute('tabindex') === '0',
    );
    expect(zeros).toHaveLength(1);
    expect(zeros[0]).toBe(item('readme'));
  });
});

describe('PctTree — the walk', () => {
  it('Down and Up move over VISIBLE items, stepping past folded branches', async () => {
    const fixture = await render(Host);

    item('readme').focus();
    await key(fixture, 'ArrowDown');
    expect(document.activeElement).toBe(item('src'));
    await key(fixture, 'ArrowDown');
    expect(document.activeElement).toBe(item('docs'));
    await key(fixture, 'ArrowUp');
    expect(document.activeElement).toBe(item('src'));
  });

  it('Home and End jump to the ends of the visible walk', async () => {
    const fixture = await render(Host);

    item('readme').focus();
    await key(fixture, 'End');
    expect(document.activeElement).toBe(item('docs'));
    await key(fixture, 'Home');
    expect(document.activeElement).toBe(item('readme'));
  });

  it('forward opens a closed branch, then steps into it', async () => {
    const fixture = await render(Host);

    item('readme').focus();
    await key(fixture, 'ArrowDown');
    await key(fixture, 'ArrowRight');
    expect(item('src').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(item('src'));
    await key(fixture, 'ArrowRight');
    expect(document.activeElement).toBe(item('src/app'));
  });

  it('back closes an open branch; on a leaf it climbs to the parent', async () => {
    const fixture = await render(Host);

    item('readme').focus();
    await key(fixture, 'ArrowDown');
    await key(fixture, 'ArrowRight');
    await key(fixture, 'ArrowRight');
    expect(document.activeElement).toBe(item('src/app'));
    await key(fixture, 'ArrowLeft');
    expect(document.activeElement).toBe(item('src'));
    await key(fixture, 'ArrowLeft');
    expect(item('src').getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(item('src'));
  });

  it('back on a CLOSED branch climbs — closing is only for the open one', async () => {
    const fixture = await render(Host);

    // Open src, walk down to `deep` — a branch that is itself still closed — and press
    // back: the honest answer is the parent, not a no-op "close" of what is not open.
    item('readme').focus();
    await key(fixture, 'ArrowDown');
    await key(fixture, 'ArrowRight');
    await key(fixture, 'ArrowDown');
    await key(fixture, 'ArrowDown');
    expect(document.activeElement).toBe(item('src/deep'));
    await key(fixture, 'ArrowLeft');
    expect(document.activeElement).toBe(item('src'));
  });

  it('a walk past either end moves nothing — the pointer stays put', async () => {
    const fixture = await render(Host);

    item('readme').focus();
    await key(fixture, 'End');
    expect(document.activeElement).toBe(item('docs'));
    await key(fixture, 'ArrowDown');
    // Past the end: the focus AND the roving tabindex both stay on the last item — a
    // guard that let the pointer fall off would hand the 0 back to the first row.
    expect(document.activeElement).toBe(item('docs'));
    expect(item('docs').getAttribute('tabindex')).toBe('0');
    expect(item('readme').getAttribute('tabindex')).toBe('-1');
  });

  it('removing the active item hands the roving tabindex to the first visible one', async () => {
    const fixture = await render(DynamicTreeHost);

    // By index, not by attribute: a BOUND `[value]` input writes no DOM attribute.
    const nodes = () =>
      [...document.querySelectorAll('pct-tree-item')] as HTMLElement[];
    nodes()[1].click();
    await settle(fixture);
    expect(nodes()[1].getAttribute('tabindex')).toBe('0');

    fixture.componentInstance.labels.set(['One', 'Three']);
    await settle(fixture);
    // The active item left the tree entirely; the map must not keep pointing at a node
    // that is no longer anybody's child.
    expect(nodes()).toHaveLength(2);
    expect(nodes()[0].getAttribute('tabindex')).toBe('0');
    expect(nodes()[1].getAttribute('tabindex')).toBe('-1');
  });

  it('under RTL the inline pair swaps, read off the rendered direction', async () => {
    const fixture = await render(RtlHost);

    item('src').focus();
    await key(fixture, 'ArrowLeft');
    expect(item('src').getAttribute('aria-expanded')).toBe('true');
    await key(fixture, 'ArrowRight');
    expect(item('src').getAttribute('aria-expanded')).toBe('false');
  });

  it('folding away the active item hands the tabindex to the first visible one', async () => {
    const fixture = await render(Host);

    fixture.componentInstance.srcOpen.set(true);
    await settle(fixture);
    item('readme').focus();
    await key(fixture, 'ArrowDown');
    await key(fixture, 'ArrowDown');
    expect(document.activeElement).toBe(item('src/app'));

    fixture.componentInstance.srcOpen.set(false);
    await settle(fixture);
    expect(item('src/app').getAttribute('tabindex')).toBe('-1');
    expect(item('readme').getAttribute('tabindex')).toBe('0');
  });
});

describe('PctTree — one selection, owned by the tree', () => {
  it('Enter and Space choose the item under focus, and the model says so', async () => {
    const fixture = await render(Host);

    item('readme').focus();
    await key(fixture, 'Enter');
    expect(fixture.componentInstance.chosen()).toBe('readme');
    expect(item('readme').getAttribute('aria-selected')).toBe('true');

    await key(fixture, 'ArrowDown');
    await key(fixture, ' ');
    expect(fixture.componentInstance.chosen()).toBe('src');
    expect(item('readme').getAttribute('aria-selected')).toBe('false');
  });

  it('a click chooses; on a branch it also toggles; a child’s click never climbs', async () => {
    const fixture = await render(Host);

    item('src').click();
    await settle(fixture);
    expect(fixture.componentInstance.chosen()).toBe('src');
    expect(fixture.componentInstance.srcOpen()).toBe(true);

    item('src/app').click();
    await settle(fixture);
    expect(fixture.componentInstance.chosen()).toBe('src/app');
    // The press stopped at the child: the branch neither re-toggled nor re-chose.
    expect(fixture.componentInstance.srcOpen()).toBe(true);
  });

  it('the application’s hand writes the same model the keys do', async () => {
    const fixture = await render(Host);

    fixture.componentInstance.chosen.set('docs');
    await settle(fixture);
    expect(item('docs').getAttribute('aria-selected')).toBe('true');
  });
});

describe('PctTree — the shapes that warn', () => {
  it('an item with no tree around it warns once, in dev mode', async () => {
    const warn = warnings();
    await render(LooseItemHost);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-tree-item]');
    expect(warn.mock.calls[0][0]).toContain('pct-tree');
  });

  it('an item wrapped away from the tree warns the same warning', async () => {
    const warn = warnings();
    await render(WrappedItemHost);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-tree-item]');
    // The same arrangement proves a nameless tree stays nameless — no guessed default.
    expect(tree().getAttribute('aria-label')).toBeNull();
  });

  it('the tree as drawn warns nothing', async () => {
    const warn = warnings();
    await render(Host);

    expect(warn).not.toHaveBeenCalled();
  });
});
