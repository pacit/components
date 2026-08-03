# 0008 — Oś ruchu w tokenach

**Status:** przyjęta
**Realizuje:** [`wym-a11y-ruch`](../wymagania/a11y.md#wym-a11y-ruch)
**Dowód:** [`lekcja-38`](../lekcje.md#lekcja-38)

## Kontekst

Standardowe podejście do `prefers-reduced-motion` to reguła `@media` w arkuszu każdego
komponentu. Ma dwie wady, obie z rodziny [`wym-os`](../00-os.md): nowy komponent **startuje
od braku** tej reguły, a jej brak nie daje żadnego sygnału.

## Decyzja

**Czas trwania ruchu jest tokenem, a redukcja — osobnym zestawem wartości tych tokenów.**

`motion.reduced.json` jest dla osi ruchu tym, czym `semantic.dark.json` dla motywu: build
emituje go w bloku `@media (prefers-reduced-motion: reduce)`.

Preferencja obowiązuje **wszystkie** komponenty z jednej reguły, a nowy komponent
dziedziczy ją **przez samo użycie tokenu**, zamiast startować od jej braku.

### Podział idzie po rodzaju ruchu, nie po prędkości

Bo redukcja robi z nimi dwie różne rzeczy:

| token                              | bez preferencji | z preferencją | dlaczego                         |
| ---------------------------------- | --------------- | ------------- | -------------------------------- |
| `--pct-motion-transition-duration` | 150 ms          | **0.01 ms**   | przejście stanu ma zniknąć       |
| `--pct-motion-loop-duration`       | 600 ms          | **1500 ms**   | wskaźnik ciągły ma tylko zwolnić |

Dwa szczegóły z powodem:

- **`0.01ms`, nie `0s`** — żeby nie zgubić zdarzenia `transitionend`.
- **Spinner zwalnia, nie staje.** Zatrzymany spinner przestałby informować, że przycisk
  pracuje. **„Mniej ruchu" nie może znaczyć „mniej informacji".**

## Konsekwencje

- Komponent, który chce respektować redukcję ruchu, nie musi o niej wiedzieć.
- Komponent, który **nie** bierze czasu z tokenu, jest wykrywalny gerpem po `@media`
  w arkuszu — to jedna z rubryk [DoD komponentu](../komponenty/_szablon.md).
- Bramka musi porównywać **parę** wartości. Sam test redukcji z asercją „czas przejścia
  jest mały" przeszedłby na wartości bazowej `150ms` interpretowanej jako „dość mało"
  i nikt nie zauważyłby, że media query nigdy się nie zapaliło
  ([`lekcja-38`](../lekcje.md#lekcja-38)).
- Emulacja idzie przez `page.emulateMedia()` w pomocniku `visit()`, a nie przez
  `test.use({ reducedMotion })` — ten drugi zapis **po cichu nie działa** w Playwrighcie
  1.61.1.

## Co przez to tracimy

- **Redukcja jest globalna, nie per komponent.** Komponent, który potrzebowałby innej
  reguły niż „przejścia znikają, pętle zwalniają", musi wyjść z osi — i to jest wtedy
  odstępstwo do uzasadnienia.
- Dwa tokeny to **modelowanie ruchu w dwóch kategoriach**. Trzeci rodzaj (np. ruch
  transportujący uwagę, jak wjazd dialogu) będzie wymagał trzeciej osi, a nie zmieści się
  w istniejących.

## Rozważane alternatywy

| alternatywa                           | dlaczego odrzucona                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@media` w arkuszu każdego komponentu | nowy komponent startuje od braku reguły, a brak nie daje sygnału                            |
| Jeden token czasu dla całego ruchu    | redukcja robi z przejściem i z pętlą **dwie różne rzeczy**; jeden token zatrzymałby spinner |
| `0s` zamiast `0.01ms`                 | gubi `transitionend`, co psuje kod czekający na koniec przejścia                            |
