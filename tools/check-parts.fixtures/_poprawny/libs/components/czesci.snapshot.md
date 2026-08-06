# Snapshot inwentarza części

> **Ten plik jest generowany.** Nie edytuj go ręcznie —
> `node tools/check-parts.mjs --write`. Bramka `check-parts` odrzuca rozjazd.

Atrybut `data-pct-part` jest publicznym API stylowania — jedyną drogą, jaką ta
biblioteka zostawia do wnętrza komponentu ([decyzja 0013](../../docs/decisions/0013-no-headless-split.md)).
Jego zmiana nie daje ani jednego czerwonego testu, bo szablon i arkusz zmieniają się
razem; psuje się wyłącznie u kogoś, kto tę nazwę wpisał u siebie.

Ten plik jest listą, wobec której mierzy się zmianę. Rozjazd nie znaczy „błąd" —
znaczy „zmiana publicznego API, która ma być widoczna w review".

Kolumny: entrypoint · klasa wystawiająca część · nazwa części. Lista powstaje
z **zbudowanego pakietu** (`ɵcmp.consts` i `ɵdir.hostAttrs` po zlinkowaniu), czyli
z tego, co naprawdę dostaje przeglądarka.

```
./widget PctMarker widget-marker
./widget PctWidget label
./widget PctWidget value
```
