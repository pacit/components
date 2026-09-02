import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctTheme, PctThemeName } from './theme';

/**
 * What a unit can prove about sugar: the attribute is written, follows its signal, and
 * disappears on `null`. Whether the attribute IS the theme — same tokens as a hand-written
 * `data-theme`, system preference back when it is gone — is the cascade's business and is
 * measured in the e2e suite (`theme.spec.ts`, `preferences.spec.ts`), where a real
 * stylesheet answers.
 */
@Component({
  imports: [PctTheme],
  template: `<section [pctTheme]="theme()">Panel</section>`,
})
class Host {
  readonly theme = signal<PctThemeName | null>('dark');
}

describe('PctTheme', () => {
  async function render(): Promise<ComponentFixture<Host>> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    return fixture;
  }

  async function settle(fixture: ComponentFixture<Host>): Promise<void> {
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  const panel = () => document.querySelector('section') as HTMLElement;

  it('writes the attribute the skin reads, and follows its signal', async () => {
    const fixture = await render();

    expect(panel().getAttribute('data-theme')).toBe('dark');

    fixture.componentInstance.theme.set('light');
    await settle(fixture);
    expect(panel().getAttribute('data-theme')).toBe('light');
  });

  it('null removes the attribute outright — the system preference speaks again', async () => {
    const fixture = await render();

    fixture.componentInstance.theme.set(null);
    await settle(fixture);
    expect(panel().hasAttribute('data-theme')).toBe(false);
  });

  it('writes nothing else — one attribute is the whole surface', async () => {
    await render();

    const names = panel()
      .getAttributeNames()
      .filter((n) => n !== 'data-theme');
    expect(
      names.some((n) => n.startsWith('data-') || n.startsWith('aria-')),
    ).toBe(false);
  });
});
