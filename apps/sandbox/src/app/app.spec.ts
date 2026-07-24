import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // Testy biegną zoneless, tak jak aplikacja (wym-tech-3).
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renderuje nagłówek biblioteki', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      '@pacit/components',
    );
  });

  it('renderuje przyciski PctButton', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelectorAll('button[pct-button]').length,
    ).toBeGreaterThan(0);
  });
});
