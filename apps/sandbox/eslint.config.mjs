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
          // `app` — the application shell (app-root); `sbx` — the sandbox
          // infrastructure (the card, the axis bar, the views). Kept apart so that
          // scaffolding and demonstration can be told apart at a glance.
          prefix: ['app', 'sbx'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          // `app` — the application shell (app-root); `sbx` — the sandbox
          // infrastructure (the card, the axis bar, the views). Kept apart so that
          // scaffolding and demonstration can be told apart at a glance.
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
