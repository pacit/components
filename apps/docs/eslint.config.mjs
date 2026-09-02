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
          // `app` — the shell (app-root); `docs` — the site's own pieces (pages).
          // `demo` — the one deliberate exception (0062): a demo file doubles as the
          // page's published snippet, and `demo-button` is what a reader should copy,
          // not this site's internal namespace.
          prefix: ['app', 'docs', 'demo'],
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
