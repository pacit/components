# Snapshot rozmiaru i izolacji entrypointów

> **Ten plik jest generowany.** Nie edytuj go ręcznie —
> `node tools/check-bundle.mjs --write`. Bramka `check-bundle` odrzuca rozjazd.

„Komponenty importuje się przez secondary entrypoints, co wymusza tree-shaking"
jest obietnicą sprzedażową ([`wym-projekt-tree-shaking`](../../docs/wymagania/projekt.md#wym-projekt-tree-shaking))
— tą, dla której ktoś tę bibliotekę wybiera. Jej złamanie nie daje ani jednego
czerwonego testu: import z sąsiedniego entrypointu kompiluje się, przechodzi testy
i dokłada konsumentowi kilkadziesiąt kilobajtów, o których dowie się z własnego
raportu bundla, jeśli go ma.

Ten plik jest listą, wobec której mierzy się zmianę. Rozjazd nie znaczy „błąd" —
znaczy „konsument zaczął płacić za coś innego niż wczoraj, i ma to być widoczne
w review".

Kolumny: entrypoint · rozmiar w bajtach · wniesione inne entrypointy · zależności
zewnętrzne. Rozmiar jest surowym rozmiarem zminifikowanego bundla aplikacji, która
importuje **wyłącznie** ten jeden entrypoint, z Angularem jako zależnością
zewnętrzną — mierzy więc wkład **tej biblioteki**, a nie wagę cudzego frameworka.
Budżet: ±5% albo ±256 B, co większe.

```
. 1183 ./core @angular/core
./button 7888 ./core @angular/core
./checkbox 16105 ./core @angular/core
./core 1705 - @angular/core
./field 38848 ./core @angular/core,@angular/forms,@angular/forms/signals
./radio 18439 ./core @angular/core
./select 30598 ./core @angular/cdk/overlay,@angular/core
```
