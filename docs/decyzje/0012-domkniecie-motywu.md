# 0012 — Domknięcie przechodnie w bloku motywu

**Status:** przyjęta
**Realizuje:** [`wym-token-domkniecie`](../wymagania/tokeny.md#wym-token-domkniecie),
[`wym-token-scoped`](../wymagania/tokeny.md#wym-token-scoped)
**Dowód:** [`lekcja-17`](../lekcje.md#lekcja-17)

## Kontekst

Model warstwowy tokenów ([`wym-token-poziomy`](../wymagania/tokeny.md#wym-token-poziomy))
zakłada, że nadpisanie tokenu semantycznego przethemowuje wszystko poniżej. Blok motywu
emitował więc tylko nadpisane tokeny semantyczne — co wygląda na oszczędne i poprawne.

Sonda w przeglądarce wykazała, że **jest niepoprawne**: w panelu `[data-theme="dark"]`
token semantyczny `--pct-surface` miał poprawną wartość ciemną, ale `--pct-button-bg`
i `--pct-select-panel-bg` nadal zwracały wartości jasne
([`lekcja-17`](../lekcje.md#lekcja-17)).

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
  ([`wym-jakosc-scena`](../wymagania/jakosc.md#wym-jakosc-scena)).
- To samo dotyczy automatycznego trybu ciemnego
  ([`wym-token-system`](../wymagania/tokeny.md#wym-token-system)) — blok
  `prefers-color-scheme` jest zwykłym blokiem motywu i podlega tej samej regule.

## Co przez to tracimy

- **Blok motywu jest znacznie większy** niż lista faktycznych nadpisań — niesie cały
  ogon zależnych tokenów. Koszt jest w rozmiarze CSS, płacony przy każdym motywie
  i każdym scope.
- Oszczędność „emitujemy tylko to, co zmienione" jest **nieosiągalna** przy zachowaniu
  referencji jako `var()` ([`wym-token-referencje`](../wymagania/tokeny.md#wym-token-referencje)).
  To cena kaskadowości, którą świadomie płacimy.

## Rozważane alternatywy

| alternatywa                                     | dlaczego odrzucona                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Emisja samych nadpisanych tokenów semantycznych | zmierzone: warstwa komponentowa zostaje zamrożona ([`lekcja-17`](../lekcje.md#lekcja-17)) |
| Rozwijanie referencji do wartości w buildzie    | odbiera możliwość nadpisania pojedynczej zmiennej w dowolnym scope — czyli cały mechanizm |
| Silnik JS przeliczający tokeny w runtime        | łamie zasadę CSS-first, zero-runtime: FOUC i rozjazdy hydracji                            |
