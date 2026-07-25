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
    Zapisz
  </button>`,
})
class StateHost {
  variant = input<PctButtonVariant>('solid');
  size = input<PctButtonSize>('md');
  loading = input(false);
  disabled = input(false);
}

// Host bez wiązań — komponent używa własnych wartości domyślnych (m.in. z konfiguracji).
@Component({
  imports: [PctButton],
  template: `<button pctButton>Zapisz</button>`,
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
  // Komponenty muszą być zoneless-safe (wym-api-2) — testy biegną bez zone.js.
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renderuje natywny <button> z domyślnymi atrybutami stanu', async () => {
    const btn = await stableBare();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('data-pct-size')).toBe('md');
    expect(btn.getAttribute('data-pct-variant')).toBe('solid');
    expect(btn.disabled).toBe(false);
  });

  it('rzutuje treść do elementu part=label', async () => {
    const btn = await stableBare();
    const label = btn.querySelector('[data-pct-part="label"]');
    expect(label?.textContent?.trim()).toBe('Zapisz');
  });

  it('stan loading blokuje przycisk, ustawia aria-busy i pokazuje spinner', async () => {
    const { btn } = await stateHost({ loading: true });
    expect(btn.hasAttribute('data-pct-loading')).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBe(true);
    expect(btn.querySelector('[data-pct-part="spinner"]')).toBeTruthy();
  });

  it('disabled blokuje przycisk bez spinnera', async () => {
    const { btn } = await stateHost({ disabled: true });
    expect(btn.disabled).toBe(true);
    expect(btn.querySelector('[data-pct-part="spinner"]')).toBeNull();
  });

  it('odzwierciedla wariant i rozmiar jako atrybuty stanu', async () => {
    const { btn } = await stateHost({ variant: 'outline', size: 'lg' });
    expect(btn.getAttribute('data-pct-variant')).toBe('outline');
    expect(btn.getAttribute('data-pct-size')).toBe('lg');
  });

  it('respektuje domyślny rozmiar z providePctConfig', async () => {
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
