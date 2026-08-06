# 0012 — Domknięcie przechodnie w bloku motywu

**Status:** przyjęta
**Realizuje:** [`req-token-closure`](../requirements/tokens.md#req-token-closure),
[`req-token-scoped`](../requirements/tokens.md#req-token-scoped)
**Dowód:** [`lesson-17`](../lessons.md#lesson-17)

## Kontekst

Model warstwowy tokenów ([`req-token-tiers`](../requirements/tokens.md#req-token-tiers))
zakłada, że nadpisanie tokenu semantycznego przethemowuje wszystko poniżej. Blok motywu
emitował więc tylko nadpisane tokeny semantyczne — co wygląda na oszczędne i poprawne.

Sonda w przeglądarce wykazała, że **jest niepoprawne**: w panelu `[data-theme="dark"]`
token semantyczny `--pct-surface` miał poprawną wartość ciemną, ale `--pct-button-bg`
i `--pct-select-panel-bg` nadal zwracały wartości jasne
([`lesson-17`](../lessons.md#lesson-17)).

Przyczyna jest w mechanice CSS, nie w buildzie: **custom properties są podstawiane
w miejscu deklaracji, nie użycia.** Token `--a: var(--b)` zadeklarowany w `:root`
dziedziczy **już rozwiniętą** wartość, więc nadpisanie `--b` w zagnieżdżonym scope go nie
zmieni.

## Decyzja

**Build emituje w bloku motywu nie tylko nadpisane tokeny semantyczne, ale wszystkie
tokeny, które od nich zależą** — bezpośrednio lub przez łańcuch referencji.

Wymaga to przejścia po grafie referencji i policzenia domknięcia przechodniego zbioru
nadpisań.

## Konsekwencje

- **Scoped theme działa na wszystkich warstwach**, nie tylko na semantycznej.
- Bramka musi porównywać **token komponentowy** w `:root` i w scope. Test na samym tokenie
  semantycznym przechodził mimo zepsutej warstwy komponentowej — i przechodził **długo**,
  bo różnica między `blue-600` a `blue-500` jest wizualnie subtelna.
- Ta sama mechanika wymusiła emisję bloku `[data-theme="light"]`: dopóki jasny motyw był
  tylko brakiem atrybutu, jasna karta wewnątrz ciemnej strony nie miała czym cofnąć
  dziedziczonych wartości
  ([`req-quality-stage`](../requirements/quality.md#req-quality-stage)).
- To samo dotyczy automatycznego trybu ciemnego
  ([`req-token-system`](../requirements/tokens.md#req-token-system)) — blok
  `prefers-color-scheme` jest zwykłym blokiem motywu i podlega tej samej regule.

## Co przez to tracimy

- **Blok motywu jest znacznie większy** niż lista faktycznych nadpisań — niesie cały
  ogon zależnych tokenów. Koszt jest w rozmiarze CSS, płacony przy każdym motywie
  i każdym scope.
- Oszczędność „emitujemy tylko to, co zmienione" jest **nieosiągalna** przy zachowaniu
  referencji jako `var()` ([`req-token-references`](../requirements/tokens.md#req-token-references)).
  To cena kaskadowości, którą świadomie płacimy.

## Rozważane alternatywy

| alternatywa                                     | dlaczego odrzucona                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Emisja samych nadpisanych tokenów semantycznych | zmierzone: warstwa komponentowa zostaje zamrożona ([`lesson-17`](../lessons.md#lesson-17)) |
| Rozwijanie referencji do wartości w buildzie    | odbiera możliwość nadpisania pojedynczej zmiennej w dowolnym scope — czyli cały mechanizm  |
| Silnik JS przeliczający tokeny w runtime        | łamie zasadę CSS-first, zero-runtime: FOUC i rozjazdy hydracji                             |
