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
import { providePctConfig, providePctTexts } from '@pacit/components';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless (wym-projekt-angular) — zone.js nie jest ładowany, detekcja zmian opiera się
    // na signals. Jawna deklaracja zamiast polegania na domyślnych ustawieniach.
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    // Globalna konfiguracja biblioteki (wym-api-konfiguracja).
    providePctConfig({ defaultSize: 'md' }),
    // Napisy biblioteki są angielskie (wym-api-teksty) — sandbox jest po polsku,
    // więc tłumaczy je u siebie. To zarazem jedyne miejsce, w którym ten kanał
    // jest realnie użyty: gdyby przestał działać, widać to na pierwszym ekranie.
    providePctTexts({
      selectPlaceholder: 'Wybierz…',
      selectEmpty: 'Brak opcji',
    }),
    // Pole liczbowe formatuje wg LOCALE_ID — tu widać przecinek dziesiętny
    // i wąską spację jako separator tysięcy.
    { provide: LOCALE_ID, useValue: 'pl-PL' },
  ],
};
