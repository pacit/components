import { inject, Injectable } from '@angular/core';

/**
 * Licznik id trzymany w DI, a nie w module.
 *
 * Licznik modułowy nie jest bezpieczny przy SSR: serwer renderuje wiele żądań
 * w jednym procesie, więc numeracja rośnie z każdym renderem, a klient zaczyna
 * od zera. Drugie i każde kolejne żądanie dostaje HTML z innymi id niż te,
 * które policzy klient — po hydracji część atrybutów zostaje z wartościami
 * serwera, a część dostaje wartości klienta i powiązania ARIA
 * (`aria-labelledby`, `aria-describedby`, `<label for>`) wskazują w próżnię.
 *
 * Instancja `providedIn: 'root'` żyje tyle, co injector aplikacji — czyli
 * jedno żądanie po stronie serwera i jedno wczytanie strony po stronie
 * klienta. Obie strony liczą więc od zera i renderują te same id (req-project-ssr).
 */
@Injectable({ providedIn: 'root' })
export class PctIdCounter {
  private n = 0;

  next(): number {
    return ++this.n;
  }
}

/**
 * Generator stabilnych, unikalnych id do powiązań ARIA (req-a11y-built-in).
 * Wymaga kontekstu wstrzykiwania — wołaj w inicjalizatorze pola komponentu.
 */
export function nextPctId(prefix = 'pct'): string {
  return `${prefix}-${inject(PctIdCounter).next()}`;
}
