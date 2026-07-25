import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { providePctConfig } from '@pacit/components';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless (wym-tech-3) — zone.js nie jest ładowany, detekcja zmian opiera się
    // na signals. Jawna deklaracja zamiast polegania na domyślnych ustawieniach.
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    // Globalna konfiguracja biblioteki (wym-api-8).
    providePctConfig({ defaultSize: 'md' }),
    // Pole liczbowe formatuje wg LOCALE_ID — tu widać przecinek dziesiętny
    // i wąską spację jako separator tysięcy.
    { provide: LOCALE_ID, useValue: 'pl-PL' },
  ],
};
