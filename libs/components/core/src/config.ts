import { InjectionToken, Provider } from '@angular/core';

/** Rozmiary współdzielone przez komponenty (wym-api-3). */
export type PctSize = 'sm' | 'md' | 'lg';

/** Globalna konfiguracja biblioteki, nadpisywalna per-komponent inputami (wym-api-8). */
export interface PctConfig {
  /** Domyślny rozmiar komponentów. */
  defaultSize: PctSize;
}

export const PCT_DEFAULT_CONFIG: PctConfig = {
  defaultSize: 'md',
};

export const PCT_CONFIG = new InjectionToken<PctConfig>('PCT_CONFIG', {
  factory: () => PCT_DEFAULT_CONFIG,
});

/**
 * Rejestruje globalną konfigurację biblioteki (wzorzec provideX, wym-api-8).
 *
 * @example
 * bootstrapApplication(App, {
 *   providers: [providePctConfig({ defaultSize: 'lg' })],
 * });
 */
export function providePctConfig(config: Partial<PctConfig>): Provider {
  return {
    provide: PCT_CONFIG,
    useValue: { ...PCT_DEFAULT_CONFIG, ...config },
  };
}
