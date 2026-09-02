import {
  ApplicationRef,
  Component,
  Provider,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';
import { PctStep, PctStepper } from './stepper';

/**
 * Five arrangements. **Host** is the journey mid-flight — four steps, the pointer a
 * signal, so every recomputation is observable. **BareHost** binds no label: nameless is
 * a legal list. **DynamicHost** draws its steps from an array, because the claim "the DOM
 * order numbers the steps, with nothing to wire" is only true if removing a step really
 * renumbers the rest. The last two are the shapes the dev-mode warning exists for.
 */
@Component({
  imports: [PctStepper, PctStep],
  template: `
    <pct-stepper [step]="step()" ariaLabel="Checkout">
      <pct-step>Cart</pct-step>
      <pct-step>Delivery</pct-step>
      <pct-step>Payment</pct-step>
      <pct-step>Review</pct-step>
    </pct-stepper>
  `,
})
class Host {
  readonly step = signal(2);
}

@Component({
  imports: [PctStepper, PctStep],
  template: `
    <pct-stepper [step]="1">
      <pct-step>Only</pct-step>
    </pct-stepper>
  `,
})
class BareHost {}

@Component({
  imports: [PctStepper, PctStep],
  template: `
    <pct-stepper [step]="1">
      @for (label of labels(); track label) {
        <pct-step>{{ label }}</pct-step>
      }
    </pct-stepper>
  `,
})
class DynamicHost {
  readonly labels = signal(['One', 'Two', 'Three']);
}

@Component({
  imports: [PctStep],
  template: `<pct-step>Solo</pct-step>`,
})
class LooseStepHost {}

@Component({
  imports: [PctStepper, PctStep],
  template: `
    <pct-stepper [step]="1">
      <div><pct-step>Boxed</pct-step></div>
    </pct-stepper>
  `,
})
class WrappedStepHost {}

async function render<T>(
  type: Type<T>,
  providers: Provider[] = [],
): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
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

const stepper = () => document.querySelector('pct-stepper') as HTMLElement;
const steps = () => [...document.querySelectorAll('pct-step')];
const states = () => steps().map((s) => s.getAttribute('data-pct-state'));
const markerOf = (step: Element) =>
  step.querySelector('[data-pct-part="marker"]') as HTMLElement;

/** A spy that keeps the dev-mode sentence out of the run's output and readable in a case. */
const warnings = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PctStepper — the list and the numbering', () => {
  it('is a list of listitems, named only when the consumer says so', async () => {
    await render(Host);

    expect(stepper().getAttribute('role')).toBe('list');
    expect(stepper().getAttribute('aria-label')).toBe('Checkout');
    expect(steps()).toHaveLength(4);
    for (const step of steps()) {
      expect(step.getAttribute('role')).toBe('listitem');
      expect(step.parentElement).toBe(stepper());
    }
  });

  it('a nameless list stays nameless — no guessed default', async () => {
    await render(BareHost);

    expect(stepper().getAttribute('aria-label')).toBeNull();
  });

  it('the DOM order numbers the steps, and the markers wear the ordinals', async () => {
    await render(Host);

    // Step 1 is done and wears the check; the rest wear their numbers.
    const [first, ...rest] = steps();
    expect(markerOf(first).querySelector('pct-icon')).not.toBeNull();
    expect(rest.map((s) => markerOf(s).textContent?.trim())).toEqual([
      '2',
      '3',
      '4',
    ]);
  });

  it('removing a step renumbers the rest, with nothing to wire', async () => {
    const fixture = await render(DynamicHost);

    fixture.componentInstance.labels.set(['One', 'Three']);
    await settle(fixture);
    expect(steps().map((s) => markerOf(s).textContent?.trim())).toEqual([
      '1',
      '2',
    ]);
  });
});

describe('PctStepper — the one number and the whole map', () => {
  it('behind the pointer done, at it current, past it upcoming', async () => {
    await render(Host);

    expect(states()).toEqual(['done', 'current', 'upcoming', 'upcoming']);
    const current = document.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain('Delivery');
  });

  it('follows the signal: the map redraws when the journey moves', async () => {
    const fixture = await render(Host);

    fixture.componentInstance.step.set(4);
    await settle(fixture);
    expect(states()).toEqual(['done', 'done', 'done', 'current']);
    expect(
      document.querySelector('[aria-current="step"]')?.textContent,
    ).toContain('Review');
  });

  it('past the end every step is done; before the start every step is upcoming', async () => {
    const fixture = await render(Host);

    fixture.componentInstance.step.set(9);
    await settle(fixture);
    expect(states()).toEqual(['done', 'done', 'done', 'done']);
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0);

    fixture.componentInstance.step.set(0);
    await settle(fixture);
    expect(states()).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0);
  });
});

describe('PctStepper — done is audible, the drawings are not', () => {
  it('every marker and connector is hidden from the tree', async () => {
    await render(Host);

    for (const part of ['marker', 'track'] as const) {
      const drawn = document.querySelectorAll(`[data-pct-part="${part}"]`);
      expect(drawn).toHaveLength(4);
      for (const el of drawn) {
        expect(el.getAttribute('aria-hidden')).toBe('true');
      }
    }
  });

  it('a done step says so after the label, and only a done step', async () => {
    await render(Host);

    const [done, current, upcoming] = steps();
    expect(done.textContent).toContain('Completed');
    // The application's word first: the suffix follows the label.
    expect(done.textContent?.indexOf('Cart')).toBeLessThan(
      done.textContent!.indexOf('Completed'),
    );
    expect(current.textContent).not.toContain('Completed');
    expect(upcoming.textContent).not.toContain('Completed');
  });

  it('the suffix is a text, swapped by providePctTexts', async () => {
    await render(Host, [providePctTexts({ stepDone: 'Behind you' })]);

    expect(steps()[0].textContent).toContain('Behind you');
    expect(steps()[0].textContent).not.toContain('Completed');
  });
});

describe('PctStepper — the shapes that warn', () => {
  it('a step with no row around it warns once, in dev mode', async () => {
    const warn = warnings();
    await render(LooseStepHost);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-step]');
    expect(warn.mock.calls[0][0]).toContain('pct-stepper');
    // The loose step still RENDERS a coherent state: the guard in the state machine is
    // what keeps a rowless step at "upcoming" instead of asking a row that is not there.
    expect(
      document.querySelector('pct-step')?.getAttribute('data-pct-state'),
    ).toBe('upcoming');
  });

  it('a step wrapped away from the list warns the same warning', async () => {
    const warn = warnings();
    await render(WrappedStepHost);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-step]');
  });

  it('the map as drawn warns nothing', async () => {
    const warn = warnings();
    await render(Host);

    expect(warn).not.toHaveBeenCalled();
  });
});
