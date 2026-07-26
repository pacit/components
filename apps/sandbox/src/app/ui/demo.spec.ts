import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SbxDemo } from './demo';
import { SbxSettings } from './settings';

@Component({
  imports: [SbxDemo],
  template: `
    <sbx-demo heading="Domyślna" data-testid="follows">
      <span class="content">treść</span>
    </sbx-demo>
    <sbx-demo heading="Stała" scheme="dark" [controls]="[]" data-testid="fixed">
      <span class="content">treść</span>
    </sbx-demo>
  `,
})
class Host {}

describe('SbxDemo (karta demonstracyjna)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const stage = (testid: string) =>
      el.querySelector(`[data-testid="${testid}"] [data-testid="demo-stage"]`);
    return { fixture, el, stage };
  }

  it('rzutuje treść na scenę', async () => {
    const { stage } = await render();
    expect(stage('follows')?.querySelector('.content')).toBeTruthy();
  });

  /** Motyw obowiązuje na scenie, nie na całej karcie — pasek jest chromem strony. */
  it('idzie za ustawieniem globalnym, dopóki nie ma własnego', async () => {
    const { fixture, stage } = await render();
    expect(stage('follows')?.getAttribute('data-theme')).toBe('light');

    TestBed.inject(SbxSettings).scheme.set('dark');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(stage('follows')?.getAttribute('data-theme')).toBe('dark');
  });

  it('własny motyw karty wygrywa z globalnym', async () => {
    const { fixture, stage } = await render();
    TestBed.inject(SbxSettings).scheme.set('light');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(stage('fixed')?.getAttribute('data-theme')).toBe('dark');
  });

  it('pusta lista przełączników chowa pasek', async () => {
    const { el } = await render();
    const fixed = el.querySelector('[data-testid="fixed"]');
    expect(fixed?.querySelector('sbx-controls')).toBeNull();
    expect(
      el.querySelector('[data-testid="follows"] sbx-controls'),
    ).toBeTruthy();
  });
});
