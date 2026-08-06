# 0004 — Wysokość wprost, nie z paddingu

**Status:** przyjęta
**Realizuje:** [`req-api-size`](../requirements/api.md#req-api-size)
**Dowód:** [`lesson-29`](../lessons.md#lesson-29), [`lesson-34`](../lessons.md#lesson-34)

## Kontekst

Przycisk i pole tej samej wielkości muszą mieć **dokładnie** tę samą wysokość — inaczej
formularz z przyciskiem obok pola wygląda na złożony z dwóch bibliotek.

Pierwsze podejście sterowało pionem przez `padding-y` z tokenu odstępu. Oba komponenty
używały tego samego tokenu (`space.3`) i mimo to różniły się o **7 px**: przycisk mierzył
`padding-y` + wysokość linii etykiety (≈34,8 px), a pole `padding-y` + gwarantowany obszar
dotyku kolumny kontrolki (42 px) ([`lesson-29`](../lessons.md#lesson-29)).

## Decyzja

**Wysokość jest osobnym tokenem podanym wprost** (`--pct-control-height-{sm|md|lg}`),
a padding pionowy przestaje sterować pionem.

Cztery szczegóły, każdy z powodem:

1. **`min-height`, nie `height`** — żeby wyższa zawartość (etykieta łamana na dwie linie,
   `textarea`, przycisk w slocie) wciąż rozpychała kontrolkę zamiast się przycinać.
2. **Wariant rozmiaru podmienia tokeny bazowe**
   (`--pct-button-height: var(--pct-button-height-lg)`), zamiast powtarzać reguły wyglądu.
3. **Wielkość `md` nie nadpisuje niczego** — dzięki czemu nadpisanie tokenu bazowego
   w motywie nadal działa ([`req-token-override`](../requirements/tokens.md#req-token-override)).
4. **Wielkość skaluje razem z wysokością rozmiar tekstu i padding poziomy** — inaczej
   większe pole miałoby tekst mniejszego.

Skala `28 / 36 / 44 px` została dobrana tak, by **najmniejsza wielkość nadal mieściła
próg dotyku SC 2.5.8 z zapasem** — nie z estetyki.

### Wariant `bare` wysokości nie wyrównuje

Checkbox i grupa radiów bez ramki nie mają czego zgrywać z przyciskiem, a wymuszona
wysokość dokładałaby im pustego miejsca. Obszar dotyku pilnuje tam kolumna kontrolki
([`req-api-frame`](../requirements/api.md#req-api-frame)).

## Konsekwencje

- Nowy komponent zaczyna od **czytania tokenu**, nie od zgadywania paddingu.
- Wyrównanie jest weryfikowalne pomiarem w przeglądarce, a nie „wygląda dobrze".
- Bramka musi sprawdzać **równość wysokości i jej konkretną wartość** — przy samej
  równości oba komponenty mogłyby spaść do wysokości linii tekstu i nadal przechodzić.
- W obudowie wielkość należy do obudowy ([0003](0003-wrapper-and-control.md)).

## Co przez to tracimy

- **Wysokość przestaje wynikać z treści.** Komponent o nietypowej zawartości musi albo
  zmieścić się w skali, albo świadomie z niej wyjść — a to jest odstępstwo do
  uzasadnienia, nie swoboda.
- **Trzy stopnie to za mało dla dekoracji wspawanych w pole.** Przycisk `inset` musi być
  o stopień mniejszy od pola; w wielkości `sm` nie ma już stopnia niżej, więc przycisk
  wypełnia tam wysokość i rozpycha wiersz o grubość ramki. To **wniosek z tej decyzji**,
  nie wada dopasowania ([`lesson-34`](../lessons.md#lesson-34)).
- Dekoracja `fill` musi dostać `min-height: 0`, bo inaczej wnosi własną wysokość
  minimalną równą wysokości pola — i pole z przyciskiem jest o 2 px wyższe od pola bez
  niego.

## Rozważane alternatywy

| alternatywa                           | dlaczego odrzucona                                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Wspólny token `padding-y`             | zmierzone: ten sam token daje 7 px różnicy, bo składniki wysokości są różne ([`lesson-29`](../lessons.md#lesson-29))        |
| Dobranie paddingów tak, żeby pasowały | wyrównanie fałszywe — zależne od `line-height`, kroju pisma i zawartości slotów; każdy nowy komponent zaczyna od zgadywania |
| `height` zamiast `min-height`         | przycina etykietę łamaną na dwie linie i `textarea`                                                                         |
