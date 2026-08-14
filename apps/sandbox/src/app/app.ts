import {
  afterNextRender,
  ApplicationRef,
  Component,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SbxControls } from './ui/controls';
import { SbxSettings } from './ui/settings';
import { SBX_VIEW_GROUPS, viewsOf } from './views';

/**
 * The sandbox shell: navigation across the views plus the global settings of the
 * cross-cutting axes (theme, skin, size).
 *
 * The theme sits on the shell host, not on `:root` — the whole page is therefore
 * the same scoped theme as any card (req-token-scoped), and `:root` stays a clean
 * point of reference for the tests.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SbxControls],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[attr.data-theme]': 'settings.scheme()',
    '[attr.data-skin]': 'settings.skin()',
    // `dir` on the shell host, not on `<html>`: direction is a cross-cutting axis
    // here exactly like the theme, so the whole page mirrors together with the
    // navigation and `:root` stays a clean point of reference. Note — this does NOT
    // reach the CDK overlays, which live as children of `body`: there the direction
    // has to be carried over explicitly, just like the theme and the type (lesson-35).
    '[attr.dir]': 'settings.dir()',
  },
})
export class App {
  protected readonly settings = inject(SbxSettings);

  protected readonly groups = SBX_VIEW_GROUPS.map((group) => ({
    ...group,
    views: viewsOf(group.id),
  }));

  constructor() {
    const appRef = inject(ApplicationRef);

    // The "the page is interactive" marker for the e2e tests. Until hydration the
    // DOM holds the HTML from the server: it can be clicked and typed into, but
    // nothing listens to that, and hydration overwrites the value with the state
    // from the model anyway. Since the views load lazily, the window between
    // "the element is visible" and "the element is wired up" lasts as long as
    // fetching a chunk — enough for a test to get in the middle of it (lesson-30).
    afterNextRender(async () => {
      await appRef.whenStable();
      document.documentElement.setAttribute('data-sbx-ready', '');
    });
  }
}
