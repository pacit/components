import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          // `app` — powłoka aplikacji (app-root); `sbx` — infrastruktura
          // sandboxa (karta, pasek osi, widoki). Rozdzielone, żeby na pierwszy
          // rzut oka było widać, co jest rusztowaniem, a co demonstracją.
          prefix: ['app', 'sbx'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          // `app` — powłoka aplikacji (app-root); `sbx` — infrastruktura
          // sandboxa (karta, pasek osi, widoki). Rozdzielone, żeby na pierwszy
          // rzut oka było widać, co jest rusztowaniem, a co demonstracją.
          prefix: ['app', 'sbx'],
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
