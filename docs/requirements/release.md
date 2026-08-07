# Wymagania — wydanie

Obszar obejmuje dawną sekcję wersjonowania oraz punkty gotowości do publikacji, które
wcześniej wisiały bez identyfikatora w tabeli „Czego jeszcze nie ma". Mapowanie starych
identyfikatorów jest w
[tabeli migracji](../README.md#migracja-identyfikatorów-2026-07-27).

> Kształt wpisu i znaczenie pól **Bramka** / **Kontrola** opisuje
> [README](../README.md#kształt-wymagania).

---

### <a id="req-release-semver"></a>`req-release-semver` — SemVer z kanałami przedwydawniczymi

**Obietnica.** Wersjonowanie zgodne z SemVer, z kanałami `beta` i `rc`. Przed 1.0 zmiana
łamiąca podbija **minor**, nie major — inaczej pierwsze `feat(api)!` wyrzuciłoby
bibliotekę do 1.0.0 i odebrało jej prawo do niestabilnego API, które
[`req-project-latest`](project.md#req-project-latest) wprost zakłada. Stała
`PCT_VERSION` jest **generowana** z manifestu, nie pisana ręcznie.

**Bramka:** `libs/components/check-package.mjs` (punkt 4: `PCT_VERSION` == `version`
z manifestu) + `tools/release.mjs` — bramka pakietu stoi **przed** commitem, tagiem
i publikacją
**Kontrola:** `stamp-version` **nie jest** zależnością `build` — gdyby był, artefakt
zawsze zgadzałby się sam ze sobą, a kontrola wersji przestałaby cokolwiek badać. Konstrukcja
jest sama w sobie kontrolą odniesienia ([`lesson-41`](../lessons.md#lesson-41))
**Lekcje:** [`lesson-41`](../lessons.md#lesson-41)

> **Otwarte:** kanały `beta`/`rc` są dostępne przez `--specifier`, ale **nie mają
> własnego przebiegu ani `dist-tag`**. Wiąże przy pierwszym wydaniu, które nie ma iść od
> razu do wszystkich.

---

### <a id="req-release-ng-add"></a>`req-release-ng-add` — `ng add` i kolekcja migracji

**Obietnica.** `ng add @pacit/components` dopina skórkę i style nakładki CDK do
konfiguracji builda — dwie rzeczy, których konsument nie zgadnie, a bez których biblioteka
wygląda na zepsutą. Kolekcja migracji `ng update` jest w pakiecie **od pierwszego
wydania**, choć pusta.

**Bramka:** `libs/components/check-package.mjs` (punkt 5) — kolekcje są w pakiecie,
a ich fabryki wskazują na **skompilowane** pliki, nie na TS sprzed builda. Do tego
`tools/check-consumer.mjs` (punkt 4) — schematic z **zainstalowanego** pakietu daje się
uruchomić prawdziwym Angular CLI i faktycznie dopina skórkę do konfiguracji builda
**Kontrola:** `tools/check-package.fixtures/brak-schematica/` — pakiet, w którym kolekcja
wskazuje fabrykę bez skompilowanego pliku (czyli zbudowany bez kroku kompilującego
schematics), musi zapalić punkt 5. Sam wpis w manifeście niczego nie gwarantuje — przy
braku pliku `ng add` wywala się u konsumenta na „Collection not found". Do tego
`tools/check-consumer.fixtures/ng-add-padl.json` i przebieg na repozytorium ze zdjętą
granicą CommonJS
**Lekcje:** [`lesson-55`](../lessons.md#lesson-55)

> Powód, dla którego pusta kolekcja jedzie od początku, nie jest kosmetyczny: `ng update`
> czyta kolekcję z wersji **zainstalowanej** u konsumenta, więc dopisanie jej dopiero przy
> pierwszej zmianie łamiącej nie pomogłoby nikomu, kto zainstalował wcześniej.

> Dwie bramki, bo to dwa różne pomiary. Statyczna pyta, czy plik fabryki **jest**;
> ta w użyciu — czy da się go **wczytać**. Różnica kosztowała wydawany artefakt wywrotkę
> przy pierwszej komendzie konsumenta ([`lesson-55`](../lessons.md#lesson-55)).

---

### <a id="req-release-metadata"></a>`req-release-metadata` — Pakiet ma komplet metadanych

**Obietnica.** Manifest niesie `repository`, a repozytorium — plik `LICENSE`.
`"license": "MIT"` bez pliku LICENSE to formalnie **niepełna licencja**, a to pierwsza
rzecz, którą sprawdza dział prawny konsumenta korporacyjnego. Bez `repository` npm odmawia
provenance.

**Bramka:** `libs/components/check-package.mjs` (punkt 6) — dwie różne surowości, bo to dwa
różne warunki. Pola manifestu: ostrzeżenie w zwykłym przebiegu, **błąd przy `--release`**,
dopóki `repository` nie ma na co wskazywać. Kontrola `licencja`: **błąd zawsze** — plik
LICENSE w artefakcie, niepusty, z nazwą licencji zgodną z polem `license` i z linią
`Copyright (c) <rok> <podmiot>`. Do tego `tools/check-consumer.mjs` (punkt 1, reguła
`brak-licencji`) — plik obecny w `dist` może wypaść z `npm pack`, a tego `check-package`
nie zobaczy z konstrukcji
**Kontrola:** `tools/check-package.fixtures/brak-repository/` — manifest bez `repository`
musi zapalić przy `--release` i **tylko ostrzec** w zwykłym przebiegu. Badane są oba
kierunki: asercja wyłącznie na „blokuje" przepuściłaby regresję, po której punkt 6 blokuje
zawsze, a wtedy repozytorium bez zdalnego nie zbudowałoby się w ogóle. Do tego
`tools/check-package.fixtures/brak-licencji/` (pakiet bez pliku) oraz
`tools/check-package.fixtures/licencja-niezgodna/` — plik nazywający Apache-2.0 przy
manifeście `MIT`. Ten drugi bada zarazem **sposób dopasowania**: tekst licencji zawiera
słowo `LIMITED`, w którym `MIT` siedzi jako podciąg, więc porównanie przez `includes`
uznałoby go za zgodny. Archiwum pilnuje
`tools/check-consumer.fixtures/tarball-bez-licencji.json`
**Decyzja:** [0015 — MIT wszędzie, prawa na podmiot, bez CLA](../decisions/0015-license-and-model.md)
**Wiąże przy:** pierwszej publikacji — plik LICENSE i jego bramka są od 2026-08-06, pole
`repository` od 2026-08-07. Wskazuje ono `github.com/pacit/components`, którego jeszcze nie
ma; provenance żąda zgodności z repozytorium, z którego leci publikacja, więc warunek domyka
się dopiero przy utworzeniu zdalnego (B2)

> Obietnica była **podwójna, a mierzona pojedynczo**: pola manifestu miały bramkę od A1,
> plik LICENSE nie miał żadnej i nie istniał, przy wymaganiu stojącym w rejestrze jako ✅.
> Domknięte w B1 — z pomiarem po obu stronach `npm pack`, bo to dwa różne filtry.

---

### <a id="req-release-support"></a>`req-release-support` — Polityka wsparcia i deprecacji

**Obietnica.** Zapisane wprost: ile wersji Angulara wstecz jest wspieranych i jak długo,
ile minorów ostrzeżenia przed usunięciem API, oraz że **pierwsza zmiana łamiąca przyjedzie
z codemodem**, a nie z akapitem w CHANGELOG-u.

**Bramka:** brak — luka: dokumentu nie ma. Kolekcja migracji istnieje
([`req-release-ng-add`](#req-release-ng-add)), ale nic nie wiąże zmiany łamiącej
z obowiązkiem dostarczenia migracji
**Kontrola:** brak — luka: commit `feat!:` bez wpisu w kolekcji migracji musi zapalić
**Wiąże przy:** pierwszym zewnętrznym konsumencie — firma nie kupuje biblioteki na
podstawie kodu, tylko na podstawie **przewidywalności**
