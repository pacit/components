import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctTooltip } from './tooltip';
import { PctTooltipAs } from './tooltip.types';

/** The panel renders in a CDK overlay — outside the component's tree. */
const panel = () =>
  document.querySelector('[data-pct-part="panel"]') as HTMLElement | null;

const trigger = (fixture: ComponentFixture<unknown>) =>
  fixture.nativeElement.querySelector('#trigger') as HTMLElement;

/**
 * A pointer event as jsdom can carry one: it implements no `PointerEvent` at all, so the type
 * that decides between a hover, a press and a finger is defined onto a `MouseEvent`. What is
 * being measured is which road the directive takes, and that road is chosen from
 * `pointerType` alone.
 */
function pointer(type: string, pointerType = 'mouse'): Event {
  const event = new MouseEvent(type, { bubbles: false, cancelable: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

/** The road the closing stack takes: the document, and the top-most attached overlay. */
function escape(): void {
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      keyCode: 27,
      bubbles: true,
      cancelable: true,
    }),
  );
}

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctTooltip],
  template: `<button
    id="trigger"
    [pctTooltip]="text()"
    [pctTooltipAs]="kind()"
    [pctTooltipDisabled]="off()"
    [attr.aria-describedby]="own()"
  >
    {{ label() }}
  </button>`,
})
class Host {
  readonly text = signal('Removes the project');
  readonly kind = signal<PctTooltipAs>('description');
  readonly off = signal(false);
  readonly label = signal('Delete');
  readonly own = signal<string | null>(null);
}

@Component({
  imports: [PctTooltip],
  template: `<div data-theme="dark">
    <button id="trigger" pctTooltip="Removes the project">Delete</button>
  </div>`,
})
class ThemedHost {}

@Component({
  imports: [PctTooltip],
  template: `<button
    id="trigger"
    [attr.aria-label]="name()"
    pctTooltip="What it costs"
  >
    <img src="x.png" [attr.alt]="alt()" />
  </button>`,
})
class NamedHost {
  readonly name = signal<string | null>(null);
  readonly alt = signal<string | null>(null);
}

@Component({
  imports: [PctTooltip],
  template: `<label for="trigger">Release note</label>
    <input id="trigger" pctTooltip="Markdown is allowed here" />`,
})
class LabelledHost {}

describe('PctTooltip', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * The hover has a wait in front of it, so every case that opens by pointer runs the clock
   * forward. Fake timers rather than a real pause: the directive's whole state machine is
   * timers, and a suite that slept through them would take longer than the rest put together.
   */
  async function hover(fixture: ComponentFixture<unknown>): Promise<void> {
    trigger(fixture).dispatchEvent(pointer('pointerenter'));
    vi.advanceTimersByTime(200);
  }

  async function leave(fixture: ComponentFixture<unknown>): Promise<void> {
    trigger(fixture).dispatchEvent(pointer('pointerleave'));
    vi.advanceTimersByTime(200);
  }

  describe('what the panel is', () => {
    it('opens on a hover, with the text and the tooltip role', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();

      expect(panel()).toBeNull();
      await hover(fixture);

      expect(panel()?.getAttribute('role')).toBe('tooltip');
      expect(panel()?.textContent?.trim()).toBe('Removes the project');
    });

    it('the wait in front of the hover is real — a pointer passing over opens nothing', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();

      trigger(fixture).dispatchEvent(pointer('pointerenter'));
      vi.advanceTimersByTime(100);
      expect(panel()).toBeNull();

      trigger(fixture).dispatchEvent(pointer('pointerleave'));
      vi.advanceTimersByTime(500);
      expect(panel()).toBeNull();
    });

    it('carries over what the tree stops handing an overlay', async () => {
      const fixture = await render(ThemedHost);
      vi.useFakeTimers();
      await hover(fixture);

      // `pctOverlayPanel` — the theme is read from the control's nearest themed ancestor at
      // the opening and written onto the panel, because a panel under `body` inherits
      // nothing from the tree the control stands in (`lesson-35`, `req-token-scoped`).
      expect(panel()?.getAttribute('data-theme')).toBe('dark');
    });

    it('an open panel follows the text it was given', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);
      expect(panel()?.textContent?.trim()).toBe('Removes the project');

      vi.useRealTimers();
      fixture.componentInstance.text.set('Removes it and everything in it');
      await fixture.whenStable();

      expect(panel()?.textContent?.trim()).toBe(
        'Removes it and everything in it',
      );
    });

    it('an empty text opens nothing at all', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.text.set('   ');
      await fixture.whenStable();
      vi.useFakeTimers();

      await hover(fixture);
      expect(panel()).toBeNull();
    });
  });

  describe('the panel while it is up', () => {
    it('a second ask does not attach a second panel', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);

      // The pointer arriving again, and focus landing on a control already hovered, are the
      // ordinary way this happens — both ask for a tooltip that is already there.
      trigger(fixture).dispatchEvent(pointer('pointerenter'));
      vi.advanceTimersByTime(200);

      expect(document.querySelectorAll('[data-pct-part="panel"]').length).toBe(
        1,
      );
    });

    /**
     * "Hoverable", the second thing WCAG 1.4.13 asks of content shown on hover. The panel
     * stands a gap away from the control, so the pointer reaching it has left the control —
     * and what keeps the text there is the panel answering for itself.
     */
    it('the pointer on the panel keeps it, and leaving it takes it away', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);
      const pane = panel()?.closest('.cdk-overlay-pane') as HTMLElement;

      trigger(fixture).dispatchEvent(pointer('pointerleave'));
      pane.dispatchEvent(pointer('pointerenter'));
      vi.advanceTimersByTime(1000);
      expect(panel()).not.toBeNull();

      pane.dispatchEvent(pointer('pointerleave'));
      vi.advanceTimersByTime(200);
      expect(panel()).toBeNull();
    });

    it('nothing is left ticking after the control is gone', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      trigger(fixture).dispatchEvent(pointer('pointerenter'));

      fixture.destroy();
      vi.advanceTimersByTime(3000);

      // A hover still on the clock when the control goes would otherwise open a panel over a
      // page that has moved on — with nothing left in the tree to close it again.
      expect(panel()).toBeNull();
    });

    it('a mouse lifting off the control schedules nothing', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);

      trigger(fixture).dispatchEvent(pointer('pointerup'));
      vi.advanceTimersByTime(3000);
      // The finger's road is the one with a timer on the way up; a mouse press has already
      // taken the panel away on the way down.
      expect(panel()).not.toBeNull();
    });
  });

  describe('describes or names', () => {
    it('a description is pointed at while it is up, and only then', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();

      expect(trigger(fixture).getAttribute('aria-describedby')).toBeNull();
      await hover(fixture);

      const id = trigger(fixture).getAttribute('aria-describedby');
      expect(id).toBe(panel()?.id);

      await leave(fixture);
      expect(trigger(fixture).getAttribute('aria-describedby')).toBeNull();
    });

    /**
     * `aria-describedby` is a LIST, and a control inside the field chrome already points at
     * its hint through it. A tooltip that SET the attribute would take the hint away for as
     * long as it was open — and give it back looking as if nothing had happened.
     */
    it('adds itself to a description the control already had, and leaves it behind', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.own.set('field-hint');
      await fixture.whenStable();
      vi.useFakeTimers();

      await hover(fixture);
      expect(trigger(fixture).getAttribute('aria-describedby')).toBe(
        `field-hint ${panel()?.id}`,
      );

      await leave(fixture);
      expect(trigger(fixture).getAttribute('aria-describedby')).toBe(
        'field-hint',
      );
    });

    it('a name is written at once and stands whether anything is open', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.kind.set('name');
      fixture.componentInstance.label.set('');
      await fixture.whenStable();

      expect(trigger(fixture).getAttribute('aria-label')).toBe(
        'Removes the project',
      );

      vi.useFakeTimers();
      await hover(fixture);
      // A name is not a description: the panel is a second rendering of the same string, and
      // pointing at it as well would have a screen reader say it twice.
      expect(trigger(fixture).getAttribute('aria-describedby')).toBeNull();
      expect(trigger(fixture).getAttribute('aria-label')).toBe(
        'Removes the project',
      );
    });

    it('a name follows the text, and goes when the tooltip is switched off', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.kind.set('name');
      fixture.componentInstance.label.set('');
      fixture.componentInstance.text.set('Close');
      await fixture.whenStable();
      expect(trigger(fixture).getAttribute('aria-label')).toBe('Close');

      fixture.componentInstance.off.set(true);
      await fixture.whenStable();
      expect(trigger(fixture).getAttribute('aria-label')).toBeNull();
    });
  });

  describe('the ways out', () => {
    it('Escape dismisses it, from the closing stack', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);
      expect(panel()).not.toBeNull();

      escape();
      vi.advanceTimersByTime(500);
      expect(panel()).toBeNull();
    });

    it('the pointer leaving takes it away — but not at once', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);

      trigger(fixture).dispatchEvent(pointer('pointerleave'));
      // The grace WCAG 1.4.13 asks for: the panel stands `8px` from the control, so a pointer
      // travelling onto it has left the control for a moment and must not lose it.
      vi.advanceTimersByTime(100);
      expect(panel()).not.toBeNull();

      vi.advanceTimersByTime(200);
      expect(panel()).toBeNull();
    });

    it('a press on the control takes it away at once', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);

      trigger(fixture).dispatchEvent(pointer('pointerdown'));
      vi.advanceTimersByTime(0);
      expect(panel()).toBeNull();
    });

    it('the text taken away closes what it was describing', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);
      expect(panel()).not.toBeNull();

      vi.useRealTimers();
      fixture.componentInstance.off.set(true);
      await fixture.whenStable();

      expect(panel()).toBeNull();
      expect(trigger(fixture).getAttribute('aria-describedby')).toBeNull();
    });

    it('destroyed while open, it leaves neither a panel nor a reference behind', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.own.set('field-hint');
      await fixture.whenStable();
      vi.useFakeTimers();
      await hover(fixture);
      const host = trigger(fixture);

      vi.useRealTimers();
      fixture.destroy();

      expect(panel()).toBeNull();
      expect(host.getAttribute('aria-describedby')).toBe('field-hint');
    });
  });

  describe('the finger', () => {
    it('a tap opens nothing, a long press does', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();

      trigger(fixture).dispatchEvent(pointer('pointerenter', 'touch'));
      trigger(fixture).dispatchEvent(pointer('pointerdown', 'touch'));
      vi.advanceTimersByTime(200);
      trigger(fixture).dispatchEvent(pointer('pointerup', 'touch'));
      vi.advanceTimersByTime(2000);
      expect(panel()).toBeNull();

      trigger(fixture).dispatchEvent(pointer('pointerdown', 'touch'));
      vi.advanceTimersByTime(600);
      expect(panel()).not.toBeNull();
    });

    it('what a long press opened stays long enough to be read', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();

      trigger(fixture).dispatchEvent(pointer('pointerdown', 'touch'));
      vi.advanceTimersByTime(600);
      trigger(fixture).dispatchEvent(pointer('pointerup', 'touch'));

      vi.advanceTimersByTime(1000);
      expect(panel()).not.toBeNull();

      vi.advanceTimersByTime(1000);
      expect(panel()).toBeNull();
    });
  });

  describe('the keyboard', () => {
    /**
     * The focus half is measured in a browser and not here, and that is the honest place for
     * it: whether a focus is one the user should be shown something for is `:focus-visible`,
     * and jsdom answers `false` to it for every element, focused or not. What this file can
     * say is the half that answer decides — a focus that is not visible opens nothing —
     * and `apps/sandbox-e2e/src/tooltip.spec.ts` says the other half in three engines.
     */
    it('a focus the platform does not call visible opens nothing', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();

      trigger(fixture).dispatchEvent(
        new FocusEvent('focusin', { bubbles: true }),
      );
      vi.advanceTimersByTime(500);

      expect(panel()).toBeNull();
    });

    /**
     * The other side of the same read. An engine that does not know the selector throws on
     * `matches`, and the honest fallback is to show: the failure that costs something is the
     * keyboard user who never gets the text.
     */
    it('an engine with no opinion about `:focus-visible` is taken as a keyboard focus', async () => {
      const fixture = await render(Host);
      const host = trigger(fixture);
      vi.spyOn(host, 'matches').mockImplementation(() => {
        throw new Error('unknown pseudo-class');
      });
      vi.useFakeTimers();

      host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      vi.advanceTimersByTime(50);

      expect(panel()).not.toBeNull();
    });

    it('a keyboard focus opens it with no wait at all', async () => {
      const fixture = await render(Host);
      const host = trigger(fixture);
      vi.spyOn(host, 'matches').mockReturnValue(true);
      vi.useFakeTimers();

      host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      // Not one tick: the keyboard user arrived deliberately, and a delay would sit on the
      // only road they have to the text.
      expect(panel()).not.toBeNull();
    });

    it('focus leaving closes what was open', async () => {
      const fixture = await render(Host);
      vi.useFakeTimers();
      await hover(fixture);

      trigger(fixture).dispatchEvent(
        new FocusEvent('focusout', { bubbles: true }),
      );
      vi.advanceTimersByTime(500);
      expect(panel()).toBeNull();
    });
  });

  describe('what the author is told', () => {
    it('a description on a control with no name of its own is reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.label.set('');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('has no name of its own'),
      );
    });

    /**
     * The roads a control can be named by, each one on its own. The check has to be free of
     * false alarms — a warning nobody believes is a channel nobody reads
     * ([`lesson-91`](../../../../docs/lessons.md#lesson-91)) — so every road it knows is
     * measured rather than the one the first fixture happened to take.
     */
    it.each([
      ['an `aria-label`', { name: 'Publish', alt: null }],
      ['the `alt` of an image inside it', { name: null, alt: 'Publish' }],
    ])('a control named by %s is not reported', async (_, given) => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const fixture = TestBed.createComponent(NamedHost);
      fixture.componentInstance.name.set(given.name);
      fixture.componentInstance.alt.set(given.alt);
      fixture.detectChanges();
      await fixture.whenStable();

      const about = warn.mock.calls
        .map((call) => String(call[0]))
        .filter((message) => message.includes('What it costs'));
      expect(about).toEqual([]);
    });

    it('a control with none of them is reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const fixture = TestBed.createComponent(NamedHost);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('What it costs'),
      );
    });

    /**
     * The false alarm the first version of this really printed: the name of a native control
     * comes from a `<label for>` standing somewhere else entirely, and the control itself
     * carries not one attribute saying so ([`lesson-91`](../../../../docs/lessons.md#lesson-91)).
     */
    it('a control named by a label somewhere else is not reported', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      await render(LabelledHost);

      // The message this tooltip would have produced, and nobody else's: a fixture from
      // another case in this file can still be flushing its own render hooks here.
      const about = warn.mock.calls
        .map((call) => String(call[0]))
        .filter((message) => message.includes('Markdown is allowed here'));
      expect(about).toEqual([]);
    });

    it('a name that does not contain what the control says is reported (WCAG 2.5.3)', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.kind.set('name');
      fixture.componentInstance.text.set('Remove');
      fixture.componentInstance.label.set('Delete');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('WCAG 2.5.3'));
    });
  });
});
