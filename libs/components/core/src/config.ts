import { InjectionToken, Provider } from '@angular/core';

/** Sizes shared across components (req-api-signals). */
export type PctSize = 'sm' | 'md' | 'lg';

/** Global library configuration, overridable per component by inputs (req-api-config). */
export interface PctConfig {
  /** Default component size. */
  defaultSize: PctSize;
}

export const PCT_DEFAULT_CONFIG: PctConfig = {
  defaultSize: 'md',
};

export const PCT_CONFIG = new InjectionToken<PctConfig>('PCT_CONFIG', {
  factory: () => PCT_DEFAULT_CONFIG,
});

/**
 * Registers the global library configuration (the provideX pattern, req-api-config).
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
