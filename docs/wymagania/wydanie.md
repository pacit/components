# Wymagania — wydanie

Obszar obejmuje dawną sekcję wersjonowania oraz punkty gotowości do publikacji, które
wcześniej wisiały bez identyfikatora w tabeli „Czego jeszcze nie ma". Mapowanie starych
identyfikatorów jest w
[tabeli migracji](../README.md#migracja-identyfikatorów-2026-07-27).

> Kształt wpisu i znaczenie pól **Bramka** / **Kontrola** opisuje
> [README](../README.md#kształt-wymagania).

---

### <a id="wym-wydanie-semver"></a>`wym-wydanie-semver` — SemVer z kanałami przedwydawniczymi

**Obietnica.** Wersjonowanie zgodne z SemVer, z kanałami `beta` i `rc`. Przed 1.0 zmiana
łamiąca podbija **minor**, nie major — inaczej pierwsze `feat(api)!` wyrzuciłoby
bibliotekę do 1.0.0 i odebrało jej prawo do niestabilnego API, które
[`wym-projekt-najnowsze`](projekt.md#wym-projekt-najnowsze) wprost zakłada. Stała
`PCT_VERSION` jest **generowana** z manifestu, nie pisana ręcznie.

**Bramka:** `libs/components/check-package.mjs` (punkt 4: `PCT_VERSION` == `version`
z manifestu) + `tools/release.mjs` — bramka pakietu stoi **przed** commitem, tagiem
i publikacją
**Kontrola:** `stamp-version` **nie jest** zależnością `build` — gdyby był, artefakt
zawsze zgadzałby się sam ze sobą, a kontrola wersji przestałaby cokolwiek badać. Konstrukcja
jest sama w sobie kontrolą odniesienia ([`lekcja-41`](../lekcje.md#lekcja-41))
**Lekcje:** [`lekcja-41`](../lekcje.md#lekcja-41)

> **Otwarte:** kanały `beta`/`rc` są dostępne przez `--specifier`, ale **nie mają
> własnego przebiegu ani `dist-tag`**. Wiąże przy pierwszym wydaniu, które nie ma iść od
> razu do wszystkich.

---

### <a id="wym-wydanie-ng-add"></a>`wym-wydanie-ng-add` — `ng add` i kolekcja migracji

**Obietnica.** `ng add @pacit/components` dopina skórkę i style nakładki CDK do
konfiguracji builda — dwie rzeczy, których konsument nie zgadnie, a bez których biblioteka
wygląda na zepsutą. Kolekcja migracji `ng update` jest w pakiecie **od pierwszego
wydania**, choć pusta.

**Bramka:** `libs/components/check-package.mjs` (punkt 5) — kolekcje są w pakiecie,
a ich fabryki wskazują na **skompilowane** pliki, nie na TS sprzed builda
**Kontrola:** `tools/check-package.fixtures/brak-schematica/` — pakiet, w którym kolekcja
wskazuje fabrykę bez skompilowanego pliku (czyli zbudowany bez kroku kompilującego
schematics), musi zapalić punkt 5. Sam wpis w manifeście niczego nie gwarantuje — przy
braku pliku `ng add` wywala się u konsumenta na „Collection not found"

> Powód, dla którego pusta kolekcja jedzie od początku, nie jest kosmetyczny: `ng update`
> czyta kolekcję z wersji **zainstalowanej** u konsumenta, więc dopisanie jej dopiero przy
> pierwszej zmianie łamiącej nie pomogłoby nikomu, kto zainstalował wcześniej.

---

### <a id="wym-wydanie-metadane"></a>`wym-wydanie-metadane` — Pakiet ma komplet metadanych

**Obietnica.** Manifest niesie `repository`, a repozytorium — plik `LICENSE`.
`"license": "MIT"` bez pliku LICENSE to formalnie **niepełna licencja**, a to pierwsza
rzecz, którą sprawdza dział prawny konsumenta korporacyjnego. Bez `repository` npm odmawia
provenance.

**Bramka:** `libs/components/check-package.mjs` (punkt 6) — ostrzeżenie w zwykłym
przebiegu, **błąd przy `--release`**
**Kontrola:** `tools/check-package.fixtures/brak-repository/` — manifest bez `repository`
musi zapalić przy `--release` i **tylko ostrzec** w zwykłym przebiegu. Badane są oba
kierunki: asercja wyłącznie na „blokuje" przepuściłaby regresję, po której punkt 6 blokuje
zawsze, a wtedy repozytorium bez zdalnego nie zbudowałoby się w ogóle
**Wiąże przy:** pierwszej publikacji — bramka i jej kontrola już są, ale samego pola nadal
nie ma, bo nie ma zdalnego repozytorium, na które mogłoby wskazywać

> Kontrola dowodzi, że **bramka** potrafi zapalić — nie że obietnica jest spełniona. Dziś
> nie jest: przebieg jest zielony z ostrzeżeniem, na które nikt nie patrzy, i tak ma
> zostać do czasu, aż repozytorium dostanie zdalne.

---

### <a id="wym-wydanie-wsparcie"></a>`wym-wydanie-wsparcie` — Polityka wsparcia i deprecacji

**Obietnica.** Zapisane wprost: ile wersji Angulara wstecz jest wspieranych i jak długo,
ile minorów ostrzeżenia przed usunięciem API, oraz że **pierwsza zmiana łamiąca przyjedzie
z codemodem**, a nie z akapitem w CHANGELOG-u.

**Bramka:** brak — luka: dokumentu nie ma. Kolekcja migracji istnieje
([`wym-wydanie-ng-add`](#wym-wydanie-ng-add)), ale nic nie wiąże zmiany łamiącej
z obowiązkiem dostarczenia migracji
**Kontrola:** brak — luka: commit `feat!:` bez wpisu w kolekcji migracji musi zapalić
**Wiąże przy:** pierwszym zewnętrznym konsumencie — firma nie kupuje biblioteki na
podstawie kodu, tylko na podstawie **przewidywalności**
