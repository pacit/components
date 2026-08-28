import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PctAccordion } from './accordion';
import { PctAccordionItem } from './accordion-item';
import { PctAccordionHeadingLevel } from './accordion.types';

/**
 * Three arrangements, and the last two are not decoration.
 *
 * The **group** holds two sections with every input bound, which is what most cases ask
 * questions of. The **lone** item stands outside any group with nothing bound but its label:
 * it is where `groupName` and `headingLevel` fall back, and it is the only place the defaults
 * of `disabled`, `ariaLabel` and `ariaLabelledby` are ever observed — a host that binds an
 * input is a host that cannot see what happens without it. The **bare** group is the same
 * argument one level up, for `exclusive`.
 */
@Component({
  imports: [PctAccordion, PctAccordionItem],
  template: `
    <pct-accordion [exclusive]="exclusive()" [headingLevel]="level()">
      @for (item of items(); track item.label) {
        <pct-accordion-item
          [label]="item.label"
          [disabled]="item.disabled"
          [open]="item.open"
          [ariaLabel]="ariaLabel()"
          [ariaLabelledby]="ariaLabelledby()"
        >
          <p>{{ item.label }} content</p>
        </pct-accordion-item>
      }
    </pct-accordion>

    <pct-accordion-item label="Alone">
      <p>alone content</p>
    </pct-accordion-item>

    <pct-accordion>
      <pct-accordion-item label="Bare" [(open)]="bareOpen">
        <p>bare content</p>
      </pct-accordion-item>
    </pct-accordion>
  `,
})
class Host {
  readonly exclusive = signal(false);
  readonly level = signal<PctAccordionHeadingLevel>(3);
  readonly ariaLabel = signal('');
  readonly ariaLabelledby = signal('');
  readonly bareOpen = signal(false);
  readonly items = signal([
    { label: 'One', disabled: false, open: false },
    { label: 'Two', disabled: false, open: false },
  ]);
}

async function boot() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

/** In document order: the group's two, the lone item, the bare group's one. */
const details = () =>
  Array.from(
    document.querySelectorAll<HTMLDetailsElement>(
      '[data-pct-part="item"] details',
    ),
  );

const headings = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-pct-part="heading"]'),
  );

const titles = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.pct-accordion__title'));

const LONE = 2;
const BARE = 3;

/**
 * A press delivered the way a browser delivers one — cancelable, because the whole of what
 * `disabled` does here is cancel it. `Enter` on a `<summary>` arrives as a click too, which
 * is why there is no second helper for the keyboard.
 */
const press = (heading: HTMLElement) => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  heading.dispatchEvent(event);
  return event;
};

/**
 * What the platform does when a section is opened or closed: the element's own `open` moves
 * first and the event says so afterwards. The component is told rather than deciding, so a
 * spec that only set the property would be testing nothing.
 */
const toggleTo = (element: HTMLDetailsElement, open: boolean) => {
  element.open = open;
  element.dispatchEvent(new Event('toggle'));
};

const settle = async (fixture: { detectChanges(): void }) => {
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
};

describe('PctAccordion', () => {
  describe('what it renders', () => {
    it('draws a details, a summary and the consumer content, with the parts named', async () => {
      await boot();

      expect(details()).toHaveLength(4);
      expect(headings()).toHaveLength(4);
      expect(titles().map((t) => t.textContent?.trim())).toEqual([
        'One',
        'Two',
        'Alone',
        'Bare',
      ]);

      const [first] = details();
      expect(first.querySelector('[data-pct-part="marker"]')).not.toBeNull();
      expect(
        first.querySelector('[data-pct-part="panel"]')?.textContent?.trim(),
      ).toBe('One content');
    });

    it('closes every section to begin with, and writes no state of its own', async () => {
      await boot();

      expect(details().map((d) => d.open)).toEqual([
        false,
        false,
        false,
        false,
      ]);
      // The disclosure state is the element's. Writing it a second time is what 0039 forbids,
      // so the absence of the attribute is the assertion.
      expect(headings().map((h) => h.getAttribute('aria-expanded'))).toEqual([
        null,
        null,
        null,
        null,
      ]);
      expect(headings().map((h) => h.getAttribute('role'))).toEqual([
        null,
        null,
        null,
        null,
      ]);
    });
  });

  describe('the heading', () => {
    it('is an h3 unless the group says otherwise', async () => {
      await boot();

      expect(titles().map((t) => t.tagName)).toEqual(['H3', 'H3', 'H3', 'H3']);
    });

    it('follows the group, and a section outside one keeps the default', async () => {
      const fixture = await boot();

      for (const [level, tag] of [
        [2, 'H2'],
        [4, 'H4'],
        [5, 'H5'],
        [6, 'H6'],
      ] as const) {
        fixture.componentInstance.level.set(level);
        await settle(fixture);

        expect(titles().map((t) => t.tagName)).toEqual([tag, tag, 'H3', 'H3']);
      }
    });
  });

  describe('the group', () => {
    it('leaves the sections independent unless it is exclusive', async () => {
      await boot();

      expect(details().map((d) => d.getAttribute('name'))).toEqual([
        null,
        null,
        null,
        null,
      ]);
    });

    it('gives its sections one name, and the others none', async () => {
      const fixture = await boot();

      fixture.componentInstance.exclusive.set(true);
      await settle(fixture);

      const [one, two, alone, bare] = details().map((d) =>
        d.getAttribute('name'),
      );
      expect(two).toBe(one);
      // The name is generated, and its shape is the whole of what makes two accordions on one
      // page two groups. A blank one would put every section in the document into a single
      // group, which is a defect nothing else here would see.
      expect(one).toMatch(/^pct-accordion-\d+$/);
      expect(alone).toBeNull();
      // The bare group is not exclusive, because nothing asked it to be — the platform's own
      // default, and the only place this one is observed.
      expect(bare).toBeNull();
    });
  });

  describe('the open state', () => {
    it('follows the element rather than leading it', async () => {
      const fixture = await boot();
      const [first] = details();

      toggleTo(first, true);
      await settle(fixture);
      expect(first.open).toBe(true);

      toggleTo(first, false);
      await settle(fixture);
      expect(first.open).toBe(false);
    });

    it('reports the change back through the two-way binding', async () => {
      const fixture = await boot();
      const host = fixture.componentInstance;
      expect(host.bareOpen()).toBe(false);

      toggleTo(details()[BARE], true);
      await settle(fixture);
      expect(host.bareOpen()).toBe(true);

      // and the other way, which is the direction an exclusive group closes a section in
      toggleTo(details()[BARE], false);
      await settle(fixture);
      expect(host.bareOpen()).toBe(false);
    });

    it('opens a section the consumer asks for', async () => {
      const fixture = await boot();

      fixture.componentInstance.items.update((items) =>
        items.map((item, index) => ({ ...item, open: index === 1 })),
      );
      await settle(fixture);

      expect(details().map((d) => d.open)).toEqual([false, true, false, false]);
    });
  });

  describe('disabled', () => {
    it('lets an ordinary press through', async () => {
      await boot();

      expect(press(headings()[0]).defaultPrevented).toBe(false);
      expect(headings()[0].getAttribute('aria-disabled')).toBeNull();
      expect(headings()[0].hasAttribute('data-pct-disabled')).toBe(false);
    });

    it('is off in a section that never mentions it', async () => {
      await boot();

      // The lone item binds nothing but its label, which is the only arrangement in which the
      // input's own default is what answers.
      expect(press(headings()[LONE]).defaultPrevented).toBe(false);
      expect(headings()[LONE].getAttribute('aria-disabled')).toBeNull();
    });

    it('refuses the press and says so', async () => {
      const fixture = await boot();

      fixture.componentInstance.items.update((items) =>
        items.map((item, index) => ({ ...item, disabled: index === 0 })),
      );
      await settle(fixture);

      expect(press(headings()[0]).defaultPrevented).toBe(true);
      expect(headings()[0].getAttribute('aria-disabled')).toBe('true');
      expect(headings()[0].hasAttribute('data-pct-disabled')).toBe(true);
      // The section keeps its place in the tab order — a disabled heading is a signpost as
      // much as a control, so it is still reachable and still announces its state.
      expect(headings()[0].getAttribute('tabindex')).toBeNull();
      // and the one beside it is untouched
      expect(press(headings()[1]).defaultPrevented).toBe(false);
    });
  });

  describe('the name', () => {
    it('writes neither attribute while the inputs are empty', async () => {
      await boot();

      for (const index of [0, LONE]) {
        expect(headings()[index].getAttribute('aria-label')).toBeNull();
        expect(headings()[index].getAttribute('aria-labelledby')).toBeNull();
      }
    });

    it('lands on the summary, which is the element with the role', async () => {
      const fixture = await boot();

      fixture.componentInstance.ariaLabel.set('Shipping and returns');
      fixture.componentInstance.ariaLabelledby.set('elsewhere');
      await settle(fixture);

      expect(headings()[0].getAttribute('aria-label')).toBe(
        'Shipping and returns',
      );
      expect(headings()[0].getAttribute('aria-labelledby')).toBe('elsewhere');
      // never on the host, which carries no role at all
      const host = document.querySelector('[data-pct-part="item"]');
      expect(host?.getAttribute('aria-label')).toBeNull();
    });
  });
});
