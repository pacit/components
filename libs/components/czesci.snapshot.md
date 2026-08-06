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
./button PctButton label
./button PctButton spinner
./checkbox PctCheckbox box
./checkbox PctCheckbox control
./checkbox PctCheckbox error
./checkbox PctCheckbox hint
./checkbox PctCheckbox label
./checkbox PctCheckbox mark
./field PctField field-control
./field PctField field-error
./field PctField field-footer
./field PctField field-header
./field PctField field-hint
./field PctField field-label
./field PctField field-label-aux
./field PctField field-message-aux
./field PctField field-prefix
./field PctField field-row
./field PctField field-suffix
./field PctLabelAux field-label-aux-item
./field PctMessageAux field-message-aux-item
./field PctPrefix field-prefix-item
./field PctSuffix field-suffix-item
./radio PctRadio circle
./radio PctRadio control
./radio PctRadio dot
./radio PctRadio label
./radio PctRadioGroup group-error
./radio PctRadioGroup group-hint
./radio PctRadioGroup group-label
./radio PctRadioGroup options
./select PctSelect arrow
./select PctSelect empty
./select PctSelect error
./select PctSelect hint
./select PctSelect label
./select PctSelect option
./select PctSelect panel
./select PctSelect placeholder
./select PctSelect trigger
./select PctSelect value
```
