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
    // Zoneless (req-project-angular) — zone.js is not loaded, change detection rests
    // on signals. An explicit declaration instead of relying on the defaults.
    provideZonelessChangeDetection(),
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    // The global configuration of the library (req-api-config).
    providePctConfig({ defaultSize: 'md' }),
    // The library texts are English (req-api-texts). The sandbox runs under a locale
    // that is not — see LOCALE_ID below — so it translates them here. This is the one
    // place where that channel is really used: were it to stop working, the first
    // screen would show it.
    providePctTexts({
      selectPlaceholder: 'Sélectionner…',
      selectEmpty: 'Aucune option',
      selectLoading: 'Chargement…',
      selectClear: 'Effacer',
      dateOpen: 'Choisir une date',
      datePreviousMonth: 'Mois précédent',
      dateNextMonth: 'Mois suivant',
      // The three letters of a format hint are WORDS: `jj/mm/aaaa` is how French writes
      // one, and a `y` there would be a letter that means nothing. The order and the
      // separators are not translated — those come from `Intl`.
      dateDayLetter: 'j',
      dateMonthLetter: 'm',
      dateYearLetter: 'a',
    }),
    // The number field formats by LOCALE_ID — here that gives a decimal comma and a
    // narrow no-break space as the thousands separator. Deliberately not English:
    // a locale whose formatting differs from the library default is what
    // req-api-texts and req-api-number are proved against.
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
