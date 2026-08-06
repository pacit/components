# Kontrola odniesienia bramki dokumentacji

Celowo wadliwe wymagania. `tools/check-docs.mjs` uruchamia na każdym z nich swoje
kontrole i **wymaga, żeby każde zostało odrzucone**. Fixture, który przechodzi, jest
błędem — znaczy, że bramka przestała cokolwiek badać.

Powód istnienia jest ten sam co przy każdej innej bramce w tym repozytorium
(`req-quality-negative-control`): **nowa bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy
pokazano, że potrafi nie przejść.** Dwa udokumentowane przebiegi, z których wzięła się ta
reguła, to `lesson-38` (emulacja po cichu nie działała, a test przechodził na wartościach
domyślnych) i `lesson-39` (test wizualny mógł urodzić się martwy na dwa niezależne
sposoby, oba wyglądające jak działający test).

Ten katalog **nie podlega** kontroli cytowań — identyfikatory w nim są fikcyjne z założenia.

| plik                                                 | co łamie                                | która kontrola ma zapalić |
| ---------------------------------------------------- | --------------------------------------- | ------------------------- |
| [`bez-bramki.md`](bez-bramki.md)                     | obietnica bez pola **Bramka**           | 1 — kompletność           |
| [`brak-bez-powodu.md`](brak-bez-powodu.md)           | „brak" bez formy `świadomie:` / `luka:` | 1 — kompletność           |
| [`luka-bez-terminu.md`](luka-bez-terminu.md)         | `luka` bez pola **Wiąże przy**          | 1 — kompletność           |
| [`sciezka-nie-istnieje.md`](sciezka-nie-istnieje.md) | bramka wskazuje plik, którego nie ma    | 2 — istnienie             |

## Dodanie nowej kontroli do bramki

Nowa kontrola w `check-docs.mjs` przychodzi **razem z fixturem**, który ją zapala.
Kontrola bez fixture'a jest dokładnie tym, czego zakazuje `req-axis`: obietnicą bez maszyny
potrafiącej na niej zapalić, tylko piętro wyżej.
