import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctTone } from '@pacit/components/core';
import { PctBadge } from './badge';

/**
 * Three arrangements. **Host** binds the tone through a signal — the swap is observable
 * nowhere else. **BareHost** binds nothing: the absent default is its only witness.
 * **EmptyHost** and **BlankHost** are the two shapes of the one refused state — no text at
 * all, and text that is only whitespace — and the only arrangements whose first render may
 * warn.
 */
@Component({
  imports: [PctBadge],
  template: `<pct-badge [tone]="tone()">Overdue</pct-badge>`,
})
class Host {
  readonly tone = signal<PctTone | null>('danger');
}

@Component({
  imports: [PctBadge],
  template: `<pct-badge>Draft</pct-badge>`,
})
class BareHost {}

@Component({
  imports: [PctBadge],
  template: `<pct-badge tone="danger" />`,
})
class EmptyHost {}

@Component({
  imports: [PctBadge],
  // The whitespace is an interpolation on purpose: Angular drops a whitespace-only text
  // NODE from the template (`preserveWhitespaces: false`), so a literal space here would
  // render the empty arrangement twice and never exercise the trim — measured by the
  // mutation run, which kept the trim's mutant alive over exactly that template.
  template: `<pct-badge>{{ '  ' }}</pct-badge>`,
})
class BlankHost {}

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

const badge = () => document.querySelector('pct-badge') as HTMLElement;

/** A spy that keeps the dev-mode sentence out of the run's output and readable in a case. */
const warnings = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PctBadge — a word wearing a tone', () => {
  it('projects the word and adds nothing audible to it', async () => {
    await render(BareHost);

    expect(badge().textContent?.trim()).toBe('Draft');
    expect(badge().getAttribute('role')).toBeNull();
    expect(badge().getAttribute('aria-hidden')).toBeNull();
    expect(badge().getAttribute('aria-label')).toBeNull();
  });

  it('carries no tone attribute with nothing bound — the absence is the neutral', async () => {
    await render(BareHost);

    expect(badge().hasAttribute('data-pct-tone')).toBe(false);
  });

  it('reflects every member of the shared four', async () => {
    const fixture = await render(Host);

    for (const tone of ['success', 'warning', 'danger', 'info'] as const) {
      fixture.componentInstance.tone.set(tone);
      await settle(fixture);
      expect(badge().getAttribute('data-pct-tone')).toBe(tone);
    }
  });

  it('drops the attribute again when the tone goes back to null', async () => {
    const fixture = await render(Host);

    expect(badge().getAttribute('data-pct-tone')).toBe('danger');
    fixture.componentInstance.tone.set(null);
    await settle(fixture);
    expect(badge().hasAttribute('data-pct-tone')).toBe(false);
  });

  it('holds no parts — the host is the box', async () => {
    await render(Host);

    expect(badge().querySelectorAll('[data-pct-part]')).toHaveLength(0);
  });
});

describe('PctBadge — the tone never speaks alone', () => {
  it('a badge with no text warns once, in dev mode', async () => {
    const warn = warnings();
    await render(EmptyHost);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pct-badge]');
    expect(warn.mock.calls[0][0]).toContain('colour alone');
  });

  it('whitespace is no text either', async () => {
    const warn = warnings();
    await render(BlankHost);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('a badge with a word does not', async () => {
    const warn = warnings();
    await render(Host);

    expect(warn).not.toHaveBeenCalled();
  });
});
