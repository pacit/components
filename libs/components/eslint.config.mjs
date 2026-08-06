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
          // Konfiguracja Vitesta dla przebiegu mutacyjnego i jej plik startowy
          // nie jadą do pakietu: nie stoją w `tsconfig.lib.json`, więc ng-packagr
          // ich nie widzi, a `check-package` pilnuje, co naprawdę w nim jest.
          // Specyfikacje wypadają z tej reguły same (wzorzec `production`), a te
          // dwa pliki nie są specyfikacjami — bez tego wpisu kazałyby konsumentowi
          // biblioteki ciągnąć Vite'a i wtyczkę Analoga jako peery.
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/mutacja.vitest.config.mts',
            '{projectRoot}/mutacja.setup.ts',
          ],
          // Schematics (`ng add`) sięgają po `@angular-devkit/schematics`
          // WYŁĄCZNIE po typy — skompilowany `schematics/ng-add/index.js` nie ma
          // ani jednego odwołania do tej paczki, bo `import type` znika przy
          // kompilacji. Runtime dostarcza Angular CLI, które te schematics
          // uruchamia. Wpisanie tego w `peerDependencies` kazałoby każdemu
          // konsumentowi biblioteki ciągnąć narzędzia budowania, a `req-project-dependencies`
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
      // — req-api-native-input). Każdy typ selektora ma własny styl zapisu.
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
