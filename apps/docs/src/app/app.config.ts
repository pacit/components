import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { providePctConfig } from '@pacit/components';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless (req-project-angular) — the same explicit declaration as the sandbox.
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    // Input binding hands `/components/:id` to the page as a plain `input()`; the
    // scrolling option restores the reader's place on back and jumps to `#anchors` —
    // /trust is one long register, and a link into it must land where it points.
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    providePctConfig({ defaultSize: 'md' }),
    // No `providePctTexts` and no LOCALE_ID on purpose: the site is English and the
    // library's defaults are English — the docs app is the consumer that proves the
    // defaults, where the sandbox is the one that proves the overrides.
  ],
};
