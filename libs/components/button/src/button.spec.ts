import {
  Component,
  input,
  provideZonelessChangeDetection,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctConfig } from '@pacit/components/core';
import { PctButton } from './button';
import { PctButtonSize, PctButtonVariant } from './button.types';

// Host ze sterowalnym stanem — realny <button pctButton>.
@Component({
  imports: [PctButton],
  template: `<button
    pctButton
    [variant]="variant()"
    [size]="size()"
    [loading]="loading()"
    [disabled]="disabled()"
  >
    Save
  </button>`,
})
class StateHost {
  variant = input<PctButtonVariant>('solid');
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
