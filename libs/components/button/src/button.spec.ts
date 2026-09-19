import {
  ApplicationRef,
  Component,
  input,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctConfig, PctTone } from '@pacit/components/core';
import { PctButton } from './button';
import { PctButtonSize, PctButtonVariant } from './button.types';

// A host with a controllable state — a real <button pctButton>.
@Component({
  imports: [PctButton],
  template: `<button
    pctButton
    [variant]="variant()"
    [tone]="tone()"
    [size]="size()"
    [loading]="loading()"
    [disabled]="disabled()"
  >
    Save
  </button>`,
})
class StateHost {
  variant = input<PctButtonVariant>('solid');
  tone = input<PctTone | null>(null);
  size = input<PctButtonSize>('md');
  loading = input(false);
  disabled = input(false);
}

// A host with no bindings — the component falls back on its own defaults (the config among them).
@Component({
  imports: [PctButton],
  template: `<button pctButton>Save</button>`,
})
class BareHost {}

/**
 * The other element the face is allowed on: a real `<a href>`, with the consumer's own
 * click handler beside the library's, because what a disabled link must refuse is not only
 * the navigation but that handler too (0071).
 */
@Component({
  imports: [PctButton],
  template: `<a
    pctButton
    href="/start"
    [variant]="variant()"
    [loading]="loading()"
    [disabled]="disabled()"
    (click)="presses.set(presses() + 1)"
    >Get started</a
  >`,
})
class LinkHost {
  variant = input<PctButtonVariant>('solid');
  loading = input(false);
  disabled = input(false);
  readonly presses = signal(0);
}

// The one shape the dev-mode sentence is about: painted like a button, and nowhere to go.
@Component({
  imports: [PctButton],
  template: `<a pctButton>Get started</a>`,
})
class HrefLessHost {}

const btnOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('button') as HTMLButtonElement;

async function stableBare() {
  const fixture = TestBed.createComponent(BareHost);
  fixture.detectChanges();
  await fixture.whenStable();
  return btnOf(fixture);
}

async function stateHost(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(StateHost);
  for (const [k, v] of Object.entries(inputs))
    fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, btn: btnOf(fixture) };
}

describe('PctButton', () => {
  // Components have to be zoneless-safe (req-api-foundation) — the tests run without zone.js.
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renders a native <button> with the default state attributes', async () => {
    const btn = await stableBare();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('data-pct-size')).toBe('md');
    expect(btn.getAttribute('data-pct-variant')).toBe('solid');
    expect(btn.disabled).toBe(false);
  });

  it('projects content into the part=label element', async () => {
    const btn = await stableBare();
    const label = btn.querySelector('[data-pct-part="label"]');
    expect(label?.textContent?.trim()).toBe('Save');
  });

  it('the loading state blocks the button, sets aria-busy and shows a spinner', async () => {
    const { btn } = await stateHost({ loading: true });
    expect(btn.hasAttribute('data-pct-loading')).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBe(true);
    expect(btn.querySelector('[data-pct-part="spinner"]')).toBeTruthy();
  });

  it('outside the loading state it writes no aria-busy', async () => {
    const btn = await stableBare();
    expect(btn.hasAttribute('aria-busy')).toBe(false);
  });

  it('disabled blocks the button with no spinner', async () => {
    const { btn } = await stateHost({ disabled: true });
    expect(btn.disabled).toBe(true);
    expect(btn.querySelector('[data-pct-part="spinner"]')).toBeNull();
  });

  it('reflects variant and size as state attributes', async () => {
    const { btn } = await stateHost({ variant: 'outline', size: 'lg' });
    expect(btn.getAttribute('data-pct-variant')).toBe('outline');
    expect(btn.getAttribute('data-pct-size')).toBe('lg');
  });

  it('every face of the union reflects — the stylesheet hooks have a real value to match', async () => {
    for (const variant of [
      'solid',
      'outline',
      'ghost',
      'soft',
      'hero',
    ] as const) {
      const { btn } = await stateHost({ variant });
      expect(btn.getAttribute('data-pct-variant')).toBe(variant);
    }
  });

  it('wears no tone unless one is asked for — the absence IS the neutral', async () => {
    const btn = await stableBare();
    expect(btn.hasAttribute('data-pct-tone')).toBe(false);
  });

  it('every member of the shared union reflects, and none of them is invented here', async () => {
    // The list is written out rather than derived from the type: a case that reads the same
    // source as the component would pass the day a name silently left it (`PctTone` is a
    // type, and there is nothing at runtime to iterate).
    const tones: PctTone[] = ['success', 'warning', 'danger', 'info'];
    for (const tone of tones) {
      const { btn } = await stateHost({ tone });
      expect(btn.getAttribute('data-pct-tone')).toBe(tone);
    }
  });

  it('the tone survives the disabled state as an ATTRIBUTE — what it must not survive is the paint', async () => {
    // The grey outranking the tone is a fact about the stylesheet, and the stylesheet is read
    // where a browser resolves it: `apps/sandbox-e2e/src/button.spec.ts`. Here the contract is
    // only that the component keeps saying which tone was asked for.
    const { btn } = await stateHost({ tone: 'danger', disabled: true });
    expect(btn.getAttribute('data-pct-tone')).toBe('danger');
    expect(btn.hasAttribute('data-pct-disabled')).toBe(true);
  });

  it('the hero face takes no tone: the attribute is not written, and dev mode says why', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { btn } = await stateHost({ variant: 'hero', tone: 'danger' });
    expect(btn.getAttribute('data-pct-variant')).toBe('hero');
    expect(btn.hasAttribute('data-pct-tone')).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/tone="danger" on variant="hero" is ignored/),
    );
    warn.mockRestore();
  });

  it('a hero button with no tone says nothing — the sentence is for the combination, not the face', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await stateHost({ variant: 'hero' });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('and a toned button that is not a hero says nothing either — the other half of the same guard', async () => {
    // Both halves, because the guard is a conjunction: with `variant() !== 'hero'` forced
    // true, every toned button on a page would warn and the case above would stay green.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await stateHost({ variant: 'soft', tone: 'danger' });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('respects the default size from providePctConfig', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctConfig({ defaultSize: 'lg' }),
      ],
    });
    const btn = await stableBare();
    expect(btn.getAttribute('data-pct-size')).toBe('lg');
  });
});

/**
 * The same component, the other element. What is measured here is only what differs — the
 * state that has no platform mechanism behind it, and the refusal written in its place
 * ([0071](../../../../docs/decisions/0071-a-link-in-button-s-clothes-is-a-link.md)). The
 * paint is the button's and is measured there.
 */
describe('PctButton — the same face on a link', () => {
  const linkOf = (f: ComponentFixture<unknown>) =>
    f.nativeElement.querySelector('a') as HTMLAnchorElement;

  /** A spy that keeps the dev-mode sentence out of the run's output and readable in a case. */
  const warnings = () =>
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  async function linkHost(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(LinkHost);
    for (const [k, v] of Object.entries(inputs))
      fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    return { fixture, link: linkOf(fixture) };
  }

  /** A click a listener can refuse — `cancelable`, as a real press is. */
  const press = (el: HTMLElement) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    return event;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is still a link: the tag, the href and no role written over it', async () => {
    const { link } = await linkHost();
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('role')).toBeNull();
    expect(link.getAttribute('href')).toBe('/start');
    expect(link.classList.contains('pct-button')).toBe(true);
    expect(link.getAttribute('data-pct-variant')).toBe('solid');
    expect(link.getAttribute('data-pct-size')).toBe('md');
  });

  it('a disabled link says so where a link can — and not with an attribute it has no use for', async () => {
    const { link } = await linkHost({ disabled: true });
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.hasAttribute('disabled')).toBe(false);
    // The stylesheet's own hook, written on both elements so the sheet needs no tag.
    expect(link.hasAttribute('data-pct-disabled')).toBe(true);
  });

  it("a click on a disabled link is refused, and so is the consumer's own handler", async () => {
    const { fixture, link } = await linkHost({ disabled: true });
    const event = press(link);
    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.presses()).toBe(0);
  });

  it('and it is refused from the label too — where a real press lands', async () => {
    const { fixture, link } = await linkHost({ disabled: true });
    const label = link.querySelector(
      '[data-pct-part="label"]',
    ) as HTMLElement | null;
    expect(label).not.toBeNull();

    const event = press(label as HTMLElement);

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.presses()).toBe(0);
  });

  it('loading refuses the navigation too, and says the link is working', async () => {
    const { fixture, link } = await linkHost({ loading: true });
    expect(link.getAttribute('aria-busy')).toBe('true');
    expect(link.querySelector('[data-pct-part="spinner"]')).toBeTruthy();
    expect(press(link).defaultPrevented).toBe(true);
    expect(fixture.componentInstance.presses()).toBe(0);
  });

  it("an enabled link is left alone — the navigation is the platform's", async () => {
    const { fixture, link } = await linkHost();
    expect(press(link).defaultPrevented).toBe(false);
    expect(fixture.componentInstance.presses()).toBe(1);
    expect(link.getAttribute('aria-disabled')).toBeNull();
  });

  it('a link with nowhere to go is reported once, in dev mode', async () => {
    const warn = warnings();
    const fixture = TestBed.createComponent(HrefLessHost);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('[pctButton]');
    expect(warn.mock.calls[0][0]).toContain('no href');
  });

  it('a link that has somewhere to go is not', async () => {
    const warn = warnings();
    await linkHost();
    expect(warn).not.toHaveBeenCalled();
  });
});
