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
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
          // Schematics (`ng add`) sięgają po `@angular-devkit/schematics`
          // WYŁĄCZNIE po typy — skompilowany `schematics/ng-add/index.js` nie ma
          // ani jednego odwołania do tej paczki, bo `import type` znika przy
          // kompilacji. Runtime dostarcza Angular CLI, które te schematics
          // uruchamia. Wpisanie tego w `peerDependencies` kazałoby każdemu
          // konsumentowi biblioteki ciągnąć narzędzia budowania, a `wym-proj-3`
          // dopuszcza jedną zależność runtime i jest nią CDK.
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
      // Komponenty występują w dwóch postaciach: własny element (`pct-field`)
      // oraz komponent na natywnym elemencie (`input[pctText]`, `button[pctButton]`
      // — wym-api-15). Każdy typ selektora ma własny styl zapisu.
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
