/// <reference types='vitest' />
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vite';

/**
 * Konfiguracja Vitest UŻYWANA WYŁĄCZNIE PRZEZ PRZEBIEG MUTACYJNY (`nx run components:mutacja`).
 *
 * Dlaczego osobny plik, skoro biblioteka ma już target `test`. Bo tamten idzie przez
 * `@nx/angular:unit-test`, czyli przez builder `@angular/build`, który kompiluje
 * specyfikacje esbuildem do plików wirtualnych i dopiero wynik podaje Vitestowi. Stryker
 * potrzebuje czegoś innego: PLIKU KONFIGURACYJNEGO, który sam poda swojemu runnerowi
 * (`@stryker-mutator/vitest-runner`) — a builder Angulara takiego pliku nie ma i mieć
 * nie może, bo składa konfigurację w pamięci.
 *
 * Nazwa nie jest `vitest.config.mts` celowo: `@nx/vite/plugin` i `@nx/vitest` inferują
 * targety z DOKŁADNIE tych nazw (`vite.config.*`, `vitest.config.*`), więc plik o nazwie
 * kanonicznej dołożyłby bibliotece drugi target testowy, biegnący w CI obok `test`
 * i mierzący to samo dwa razy.
 *
 * Cena tego rozwiązania jest jedna i zapisana wprost: to DRUGI sposób uruchomienia tych
 * samych specyfikacji, więc potrafi się z pierwszym rozjechać. Pilnuje tego bramka
 * `check-mutation.mjs` (punkt 2): zbiór plików, które przebieg mutacyjny NAPRAWDĘ
 * uruchomił, musi się zgadzać ze zbiorem specyfikacji biblioteki z indeksu gita — czyli
 * z tym samym mianownikiem, po którym chodzi target `test`. Plik dopisany do biblioteki
 * i niewidziany tutaj byłby inaczej testem, którego mutanty nie mają kto zabić.
 */
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/components-mutacja',
  plugins: [angular({ jit: false }), nxViteTsPaths()],
  test: {
    name: 'components-mutacja',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['**/*.spec.ts'],
    setupFiles: ['./mutacja.setup.ts'],
    reporters: ['default'],
  },
}));
