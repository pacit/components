import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePctConfig } from '@pacit/components';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless (req-project-angular) — the same explicit declaration as the sandbox.
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    providePctConfig({ defaultSize: 'md' }),
    // No `providePctTexts` and no LOCALE_ID on purpose: the site is English and the
    // library's defaults are English — the docs app is the consumer that proves the
    // defaults, where the sandbox is the one that proves the overrides.
  ],
};
