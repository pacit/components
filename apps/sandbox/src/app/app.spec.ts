import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';
import { SbxSettings } from './ui/settings';
import { SBX_VIEWS } from './views';

describe('App (powłoka sandboxa)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // Testy biegną zoneless, tak jak aplikacja (wym-projekt-angular).
      providers: [provideZonelessChangeDetection(), provideRouter(appRoutes)],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('renderuje nagłówek biblioteki', async () => {
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      '@pacit/components',
    );
  });

  it('wystawia w nawigacji każdy widok z rejestru', async () => {
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.shell__nav a');
    expect(links.length).toBe(SBX_VIEWS.length);
  });

  /**
   * Motyw siedzi na hoście powłoki, nie na `:root` — cała strona jest scoped
   * theme (wym-token-scoped), a `:root` zostaje punktem odniesienia dla testów.
   */
  it('odbija globalny motyw na hoście', async () => {
    const fixture = await render();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('data-theme')).toBe('light');

    TestBed.inject(SbxSettings).scheme.set('dark');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.getAttribute('data-theme')).toBe('dark');
  });
});
