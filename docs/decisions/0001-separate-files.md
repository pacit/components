# 0001 — Szablon i style w osobnych plikach

**Status:** przyjęta
**Realizuje:** [`req-project-files`](../requirements/project.md#req-project-files),
[`req-api-names`](../requirements/api.md#req-api-names)
**Dowód:** brak pomiaru — decyzja z przewidywanej skali, świadomie podjęta wcześnie

## Kontekst

Oficjalny przewodnik Angulara mówi wprost: _prefer inline templates for smaller
components_. Większość komponentów tej biblioteki jest mała.

## Decyzja

**Szablon i style zawsze w osobnych plikach** — świadome odstępstwo od wskazówki.
Struktura per komponent jest stała: `button.ts`, `button.html`, `button.scss`,
`button.spec.ts`, `button.types.ts`, `index.ts`, `ng-package.json`.

Powód jest ilościowy, nie estetyczny: w bibliotece o dziesiątkach komponentów **koszt
niespójności rośnie szybciej niż koszt jednego pliku więcej**. „Mały komponent" nie jest
stanem trwałym — `PctSelect` zaczynał jako trigger z listą.

## Konsekwencje

- Ścieżkę do dowolnego artefaktu komponentu da się przewidzieć bez otwierania katalogu.
- Skrypt bramkujący układ entrypointu jest trywialny do napisania — nie musi rozstrzygać,
  czy brak `.html` jest wadą, czy wyborem.
- Style komponentu są plikiem SCSS, więc podlegają tym samym regułom lintu co reszta
  ([`req-token-logical`](../requirements/tokens.md#req-token-logical)).

## Co przez to tracimy

- Więcej plików w drzewie i więcej przełączania między nimi przy pracy nad jednym
  komponentem.
- Odstępstwo od oficjalnej wskazówki trzeba tłumaczyć każdemu nowemu współpracownikowi —
  stąd ten wpis.

## Rozważane alternatywy

| alternatywa                          | dlaczego odrzucona                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| Inline dla małych, osobno dla dużych | granica „mały" jest nieostra i przesuwa się w czasie; wymusza decyzję przy każdym pliku |
| Inline wszędzie                      | arkusze komponentów mają dziś po kilkadziesiąt reguł — inline byłby nieczytelny         |
