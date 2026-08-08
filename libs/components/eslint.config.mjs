import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          // The Vitest configuration for the mutation run and its setup file do not travel to
          // the package: they stand in no `tsconfig.lib.json`, so ng-packagr does not see
          // them, and `check-package` watches what really is in it. Specs fall out of this
          // rule by themselves (the `production` pattern), and these two files are not specs
          // — without this entry they would make a consumer of the library pull in Vite and
          // the Analog plugin as peers.
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/mutacja.vitest.config.mts',
            '{projectRoot}/mutacja.setup.ts',
          ],
          // The schematics (`ng add`) reach for `@angular-devkit/schematics` FOR TYPES ONLY —
          // the compiled `schematics/ng-add/index.js` has not a single reference to that
          // package, because `import type` disappears at compile time. The runtime is supplied
          // by the Angular CLI that runs the schematics. Putting it in `peerDependencies`
          // would make every consumer of the library pull in build tooling, and
          // `req-project-dependencies` allows one runtime dependency, which is CDK.
          ignoredDependencies: ['@angular-devkit/schematics'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'pct',
          style: 'camelCase',
        },
      ],
      // Components come in two forms: an element of their own (`pct-field`) and a component
      // on a native element (`input[pctText]`, `button[pctButton]` — req-api-native-input).
      // Each selector type has its own spelling style.
      '@angular-eslint/component-selector': [
        'error',
        [
          {
            type: 'element',
            prefix: 'pct',
            style: 'kebab-case',
          },
          {
            type: 'attribute',
            prefix: 'pct',
            style: 'camelCase',
          },
        ],
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
