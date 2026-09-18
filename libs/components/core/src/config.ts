import { InjectionToken, Provider } from '@angular/core';

/**
 * Sizes shared across components (req-api-signals).
 *
 * @since 0.1.0
 */
export type PctSize = 'sm' | 'md' | 'lg';

/**
 * Global library configuration, overridable per component by inputs (req-api-config).
 *
 * @since 0.1.0
 */
export interface PctConfig {
  /** Default component size. */
  defaultSize: PctSize;
}

/**
 * The configuration a page gets without asking.
 *
 * @since 0.1.0
 */
export const PCT_DEFAULT_CONFIG: PctConfig = {
  defaultSize: 'md',
};

/**
 * The token the library's configuration is read from; unprovided, it falls back to the default above.
 *
 * @since 0.1.0
 */
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
 *
 * @since 0.1.0
 */
export function providePctConfig(config: Partial<PctConfig>): Provider {
  return {
    provide: PCT_CONFIG,
    useValue: { ...PCT_DEFAULT_CONFIG, ...config },
  };
}
