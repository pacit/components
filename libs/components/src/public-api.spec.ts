import * as button from '@pacit/components/button';
import * as checkbox from '@pacit/components/checkbox';
import * as core from '@pacit/components/core';
import * as field from '@pacit/components/field';
import * as radio from '@pacit/components/radio';
import * as select from '@pacit/components/select';
import * as primary from './index';

/**
 * Ten plik istnieje po to, żeby raport pokrycia obejmował CAŁĄ bibliotekę, a nie
 * tylko tę jej część, którą ktoś już przetestował.
 *
 * Bez niego pomiar liczy się na próbce dobranej przez samego mierzonego: v8 widzi
 * wyłącznie moduły, które faktycznie weszły do przebiegu, a `coverageInclude`
 * dokłada resztę tylko wtedy, gdy potrafi je sparsować — a nie potrafi, gdy plik
 * używa `import type` / `export type` (lesson-45). Efekt jest odwrotny do
 * intuicji: usunięcie testu potrafiło PODNIEŚĆ pokrycie, bo razem z testem
 * z raportu znikał cały nietestowany plik.
 *
 * Import każdej bramki wprowadza jej moduły do przebiegu, więc plik bez testu
 * trafia do raportu z pokryciem bliskim zeru zamiast wypaść z mianownika.
 * Dodanie entrypointu bez dopisania go tutaj zapala `check-coverage` (punkt 2),
 * więc nie jest to reguła, którą trzeba pamiętać.
 *
 * Przy okazji jest to test dymny publicznej powierzchni: każda bramka musi dać
 * się załadować i coś eksportować.
 */
describe('publiczna powierzchnia pakietu', () => {
  const bramki = { primary, core, button, checkbox, field, radio, select };

  for (const [nazwa, modul] of Object.entries(bramki))
    it(`entrypoint ${nazwa} ładuje się i coś eksportuje`, () => {
      expect(Object.keys(modul).length).toBeGreaterThan(0);
    });
});
