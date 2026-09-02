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
          // `app` — the shell (app-root); `docs` — the site's own pieces (pages,
          // the future demo frames). The same split the sandbox draws with `sbx`.
          prefix: ['app', 'docs'],
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          // `app` — the shell (app-root); `docs` — the site's own pieces (pages,
          // the future demo frames). The same split the sandbox draws with `sbx`.
          prefix: ['app', 'docs'],
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    rules: {},
  },
];
