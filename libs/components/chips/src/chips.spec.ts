import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';
import { PctChip, PctChips } from './chips';

/**
 * Six arrangements. **Host** is the working row — named, every value removable, and a
 * consumer who really shortens the array — so it is where the repair's ordinary verdicts are
 * read. **MixedHost** pins one value (`removable` off), which is the only place the repair
 * can be seen stepping over a chip with no button. **BareHost** binds nothing: the defaults
 * of `ariaLabel`, `size` and `removable` are observable nowhere else. **IgnoringHost** hears
 * `removed` and keeps the value — the announcement-not-an-act half of 0051. **LooseHost**
 * and **WrappedHost** are the two shapes of a listitem whose list is not directly above it,
 * and the only arrangements whose first render may warn.
 */
@Component({
  imports: [PctChips, PctChip],
  template: `
    <pct-chips ariaLabel="Active filters" size="sm">
      @for (item of items(); track item) {
        <pct-chip removable (removed)="drop(item)">{{ item }}</pct-chip>
      }
    </pct-chips>
    <button type="button" data-testid="outside">elsewhere</button>
  `,
})
class Host {
  readonly items = signal(['one', 'two', 'three']);
  readonly drops = signal(0);

  drop(item: string): void {
    this.drops.update((n) => n + 1);
    this.items.update((all) => all.filter((kept) => kept !== item));
  }
}

@Component({
  imports: [PctChips, PctChip],
  template: `
    <pct-chips>
      @for (item of items(); track item.name) {
        <pct-chip [removable]="item.removable" (removed)="drop(item.name)">
          {{ item.name }}
        </pct-chip>
      }
    </pct-chips>
  `,
})
class MixedHost {
  readonly items = signal([
    { name: 'one', removable: true },
    { name: 'pinned', removable: false },
    { name: 'three', removable: true },
  ]);

  drop(name: string): void {
    this.items.update((all) => all.filter((kept) => kept.name !== name));
  }
}

@Component({
  imports: [PctChips, PctChip],
  template: `<pct-chips><pct-chip>alone</pct-chip></pct-chips>`,
})
class BareHost {}

@Component({
  imports: [PctChips, PctChip],
  template: `
    <pct-chips>
      <pct-chip removable (removed)="heard.set(heard() + 1)">kept</pct-chip>
      <pct-chip removable>beside</pct-chip>
    </pct-chips>
  `,
})
class IgnoringHost {
  // The second chip is not decoration: it is the cross a WRONG repair would land on. With
  // the kept chip alone, "the repair stood down" and "the repair walked an empty map" both
  // end with focus on `<body>`, and the still-connected guard is unobservable.
  readonly heard = signal(0);
}

@Component({
  imports: [PctChip],
  template: `<pct-chip removable>loose</pct-chip>`,
})
class LooseHost {}

@Component({
  imports: [PctChips, PctChip],
  template: `
    <pct-chips>
      @if (kept()) {
        <div>
          <pct-chip removable (removed)="kept.set(false)">wrapped</pct-chip>
        </div>
      }
      <pct-chip removable>beside</pct-chip>
    </pct-chips>
  `,
})
class WrappedHost {
  readonly kept = signal(true);
}

/**
 * A rendered page, waited for through the `ApplicationRef` — the repair and the dev-mode
 * sentence both run in render hooks, and a spec that never let those run would measure a
 * focus that had not moved yet.
 */
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

const row = () => document.querySelector('pct-chips') as HTMLElement;
const chips = () => [...document.querySelectorAll<HTMLElement>('pct-chip')];
const removeButtons = () => [
  ...document.querySelectorAll<HTMLElement>('[data-pct-part="remove"]'),
];

/** The press as the platform delivers it: focus lands on the button, then it is clicked. */
async function press(
  button: HTMLElement,
  fixture: ComponentFixture<unknown>,
): Promise<void> {
  button.focus();
  button.click();
  await settle(fixture);
}

/** A spy that keeps the dev-mode sentence out of the run's output and readable in a case. */
const warnings = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

/**
 * One spy per case, restored after it — a `vi.spyOn` over an already-spied method hands back
 * the same spy, history and all, so an unrestored one would answer "was not called" about
 * every earlier case too ([`lesson-135`](../../../../docs/lessons.md#lesson-135)).
 */
afterEach(() => {
  vi.restoreAllMocks();
});

describe('PctChips — what it is', () => {
  it('is a list of listitems, named by the consumer', async () => {
    await render(Host);

    expect(row().getAttribute('role')).toBe('list');
    expect(row().getAttribute('aria-label')).toBe('Active filters');
    expect(chips()).toHaveLength(3);
    for (const chip of chips())
      expect(chip.getAttribute('role')).toBe('listitem');
  });

  it('is nameless with nothing bound — a list may be, and a default would guess', async () => {
    await render(BareHost);

    expect(row().getAttribute('aria-label')).toBeNull();
  });

  it('sizes the row, not a chip: one attribute on the host', async () => {
    await render(Host);

    expect(row().getAttribute('data-pct-size')).toBe('sm');
    for (const chip of chips())
      expect(chip.getAttribute('data-pct-size')).toBeNull();
  });

  it('stands at the configured default size with nothing bound', async () => {
    await render(BareHost);

    expect(row().getAttribute('data-pct-size')).toBe('md');
  });

  it('keeps the role on an emptied row — measured as no violation, so no machinery', async () => {
    const fixture = await render(Host);

    fixture.componentInstance.items.set([]);
    await settle(fixture);

    expect(row().getAttribute('role')).toBe('list');
    expect(chips()).toHaveLength(0);
  });
});

describe('PctChip — the remove control', () => {
  it('draws a real button only where removable says so', async () => {
    await render(MixedHost);

    const buttons = removeButtons();
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
    }
    expect(chips()[1].querySelector('[data-pct-part="remove"]')).toBeNull();
  });

  it('is absent by default: a chip that must stay has no struck-through control', async () => {
    await render(BareHost);

    expect(removeButtons()).toHaveLength(0);
  });

  /**
   * The name a reader really hears is the browser's to compute, and jsdom does not — so
   * what is asked here is the two halves and their order; the composed string itself is
   * read off three real engines in `apps/sandbox-e2e/src/chips.spec.ts`.
   */
  const nameParts = (button: Element) =>
    (button.getAttribute('aria-labelledby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent?.trim());

  it('is named by texts().chipRemove AND by what it removes', async () => {
    await render(Host);

    // `aria-label` is gone from this button: it cannot hold both halves, and holding one
    // was the defect — three readers said `Remove` at all five chips and named none of
    // them (`lesson-218`).
    for (const button of removeButtons())
      expect(button.getAttribute('aria-label')).toBeNull();
    expect(removeButtons().map(nameParts)).toEqual([
      ['Remove', 'one'],
      ['Remove', 'two'],
      ['Remove', 'three'],
    ]);
  });

  it('providePctTexts swaps the verb, and the label stays the consumer’s', async () => {
    TestBed.configureTestingModule({
      providers: [providePctTexts({ chipRemove: 'Take back' })],
    });
    await render(Host);

    expect(nameParts(removeButtons()[0])).toEqual(['Take back', 'one']);
  });

  it('every chip mints its own pair of ids — five crosses, five names', async () => {
    await render(Host);

    const ids = removeButtons().flatMap((button) =>
      (button.getAttribute('aria-labelledby') ?? '').split(' '),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries the label as a part beside it', async () => {
    await render(Host);

    const label = chips()[0].querySelector('[data-pct-part="label"]');
    expect(label?.textContent).toContain('one');
  });

  it('announces once per press, and the collection is the consumer’s to shorten', async () => {
    const fixture = await render(Host);

    await press(removeButtons()[0], fixture);

    expect(fixture.componentInstance.drops()).toBe(1);
    expect(fixture.componentInstance.items()).toEqual(['two', 'three']);
    expect(chips()).toHaveLength(2);
  });
});

describe('PctChips — the focus repair', () => {
  it('lands focus on the next chip’s button when the pressed one leaves', async () => {
    const fixture = await render(Host);

    await press(removeButtons()[1], fixture);

    expect(fixture.componentInstance.items()).toEqual(['one', 'three']);
    expect(document.activeElement).toBe(removeButtons()[1]);
    expect(document.activeElement?.closest('pct-chip')?.textContent).toContain(
      'three',
    );
  });

  it('falls back to the previous button when the last chip goes', async () => {
    const fixture = await render(Host);

    await press(removeButtons()[2], fixture);

    expect(document.activeElement?.closest('pct-chip')?.textContent).toContain(
      'two',
    );
  });

  it('steps over a chip with no button', async () => {
    const fixture = await render(MixedHost);

    await press(removeButtons()[0], fixture);

    // The nearest survivor is the pinned chip, which has nothing to focus — the repair walks
    // on to the third.
    expect(document.activeElement?.closest('pct-chip')?.textContent).toContain(
      'three',
    );
  });

  it('does nothing when the row empties — the consumer knows what stands beside the list', async () => {
    // The error spy is the other half of the reading: with no survivor to focus the repair
    // must stand down CLEANLY — a `.focus()` reached on an empty walk would surface here as
    // the error handler's line, not as a red assertion.
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const fixture = await render(Host);

    fixture.componentInstance.items.set(['one']);
    await settle(fixture);
    await press(removeButtons()[0], fixture);

    expect(chips()).toHaveLength(0);
    expect(document.activeElement).toBe(document.body);
    expect(errors).not.toHaveBeenCalled();
  });

  it('skips a neighbour that left in the same render', async () => {
    // One press, two departures: the handler takes the pressed value AND its right
    // neighbour, the way "remove X and everything under it" does. The nearest candidate is
    // then a chip that no longer stands in the document — but whose detached subtree still
    // answers `querySelector` — and the repair may only land on a button somebody can press.
    const fixture = await render(Host);
    fixture.componentInstance.drop = function (this: Host, item: string) {
      this.items.update((all) =>
        all.filter((kept) => kept !== item && kept !== 'three'),
      );
    };

    await press(removeButtons()[1], fixture);

    expect(fixture.componentInstance.items()).toEqual(['one']);
    expect(document.activeElement?.closest('pct-chip')?.textContent).toContain(
      'one',
    );
  });

  it('does nothing when the consumer keeps the value', async () => {
    const fixture = await render(IgnoringHost);

    await press(removeButtons()[0], fixture);

    expect(fixture.componentInstance.heard()).toBe(1);
    expect(chips()).toHaveLength(2);
    expect(document.activeElement).toBe(removeButtons()[0]);
  });

  it('stands down when the consumer keeps the value and focus has wandered off', async () => {
    // The kept-value case with the safari shape of the press: the button was clicked but
    // `activeElement` sits on `<body>`. "The chip is still connected" has to be enough on
    // its own — a repair that fired here would yank focus onto the NEIGHBOUR's cross while
    // the pressed chip stands untouched, on every confirmation flow that opens a dialog.
    const fixture = await render(IgnoringHost);

    const button = removeButtons()[0];
    button.click();
    (document.activeElement as HTMLElement | null)?.blur?.();
    await settle(fixture);

    expect(chips()).toHaveLength(2);
    expect(document.activeElement).toBe(document.body);
  });

  it('does not fight an application that moved focus on purpose', async () => {
    const fixture = await render(Host);
    const elsewhere = document.querySelector(
      '[data-testid="outside"]',
    ) as HTMLElement;

    const second = removeButtons()[1];
    second.focus();
    second.click();
    // The consumer's handler has run; before the render the repair reads, the application
    // parks focus somewhere real.
    elsewhere.focus();
    await settle(fixture);

    expect(document.activeElement).toBe(elsewhere);
  });

  it('does not move focus for a removal no press asked for', async () => {
    const fixture = await render(Host);
    const elsewhere = document.querySelector(
      '[data-testid="outside"]',
    ) as HTMLElement;
    elsewhere.focus();

    fixture.componentInstance.items.update((all) => all.slice(1));
    await settle(fixture);

    expect(chips()).toHaveLength(2);
    expect(document.activeElement).toBe(elsewhere);
  });
});

describe('PctChip — outside a row', () => {
  it('a chip with no list warns once, in dev mode, and the sentence carries its whole advice', async () => {
    const warn = warnings();
    await render(LooseHost);

    expect(warn).toHaveBeenCalledTimes(1);
    // The promise is not "a warning fired" but what it SAYS: the broken contract by name,
    // where the list has to stand, and both ways out. Each anchor pins one clause — a
    // sentence that lost any of them names the problem without the repair, or the repair
    // without the problem.
    const sentence = warn.mock.calls[0][0] as string;
    expect(sentence).toContain('[pct-chip]');
    expect(sentence).toContain('role="listitem"');
    expect(sentence).toContain('directly above');
    expect(sentence).toContain('direct child');
    expect(sentence).toContain('lone label');
  });

  it('a loose chip still announces — the missing row costs the repair, not the press', async () => {
    // The warning is advice, not a fuse: the button keeps working, the event keeps firing,
    // and no error crosses the handler — only the focus repair is gone, there being no row
    // to hold the map.
    warnings();
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const fixture = await render(LooseHost);
    const heard = vi.fn();
    fixture.debugElement.children[0].componentInstance.removed.subscribe(heard);

    await press(removeButtons()[0], fixture);

    expect(heard).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
  });

  it('a chip wrapped inside the row warns too — the listitem needs the list DIRECTLY above', async () => {
    const warn = warnings();
    await render(WrappedHost);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('a wrapped chip is outside the repair’s map, and its removal repairs nothing', async () => {
    warnings();
    const fixture = await render(WrappedHost);

    await press(removeButtons()[0], fixture);

    // The row holds only its own children, so the wrapped chip was never in the map — the
    // press removes it and focus is left where the platform dropped it, exactly as the
    // warning above said it would be.
    expect(chips()).toHaveLength(1);
    expect(document.activeElement).toBe(document.body);
  });

  it('a chip standing where it should does not', async () => {
    const warn = warnings();
    await render(Host);

    expect(warn).not.toHaveBeenCalled();
  });
});
