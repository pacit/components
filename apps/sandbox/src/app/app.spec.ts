import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { providePctRegions } from '@pacit/components/regions';
import { App } from './app';
import { appRoutes } from './app.routes';
import { SbxSettings } from './ui/settings';
import { SBX_VIEWS } from './views';

describe('App (the sandbox shell)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // The tests run zoneless, just like the application (req-project-angular).
      // The regions provider is here because the shell's own template asks for it:
      // `app.html` carries `pctRegionKey` and three `pctRegion`s, and the directive
      // injects `PCT_REGIONS` with a non-null assertion. A TestBed that renders the shell
      // without it is not a lighter setup, it is a crash — which is what this file did for
      // three days (`lesson-191`).
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(appRoutes),
        providePctRegions(),
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('renders the library heading', async () => {
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      '@pacit/components',
    );
  });

  it('exposes every view from the registry in the navigation', async () => {
    const fixture = await render();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.shell__nav a');
    expect(links.length).toBe(SBX_VIEWS.length);
  });

  /**
   * The theme sits on the shell host, not on `:root` — the whole page is a scoped
   * theme (req-token-scoped) and `:root` stays the point of reference for the tests.
   */
  it('mirrors the global theme on the host', async () => {
    const fixture = await render();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('data-theme')).toBe('light');

    TestBed.inject(SbxSettings).scheme.set('dark');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.getAttribute('data-theme')).toBe('dark');
  });
});
