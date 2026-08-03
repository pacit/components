# 0002 — Skórka jedzie w pakiecie

**Status:** przyjęta
**Realizuje:** [`wym-projekt-lib-tokenow`](../wymagania/projekt.md#wym-projekt-lib-tokenow),
[`wym-token-dystrybucja`](../wymagania/tokeny.md#wym-token-dystrybucja),
[`wym-jakosc-pakiet`](../wymagania/jakosc.md#wym-jakosc-pakiet)
**Dowód:** [`lekcja-36`](../lekcje.md#lekcja-36)

## Kontekst

Tokeny mieszkają w osobnej bibliotece (`libs/tokens`) i są kompilowane z DTCG do CSS.
Pakiet `@pacit/components` odwołuje się do nich wyłącznie przez `var(--pct-*)` w arkuszach
— **ani jednego importu TypeScript**.

To wystarczyło, żeby `dist/libs/components` zawierał FESM-y, typy i mapę `exports`,
i **zero plików CSS**. Bundle odwoływał się do `var(--pct-field-bg)`, którego definicji
nie było nigdzie w pakiecie.

Awaria była **cicha w obie strony**: po usunięciu `libs/tokens/dist` `nx build sandbox`
kończył się **sukcesem** bez ostrzeżenia, a CI przechodziło wyłącznie dzięki ręcznemu
krokowi `node libs/tokens/build.mjs` przed `run-many` — czyli obejściu maskującemu brak
krawędzi w grafie zamiast go ujawnić.

## Decyzja

Naprawa jest **trójdzielna**, bo trzy różne rzeczy mogły zawieść niezależnie.

1. **Graf zna krawędź.** `implicitDependencies: ["tokens"]` w `components` i `sandbox`
   plus jawne `dependsOn` na `serve`. Graf Nx wnioskuje z importów, a ta zależność jest
   nietypowa — sam artefakt CSS, zero TS.
2. **Skórka jest wejściem pakietu, nie assetem z zewnątrz.** Kopiowana do
   `libs/components/themes` i stamtąd brana przez `assets` w `ng-package.json` —
   ng-packagr **nie czyta assetów spoza katalogu projektu**, więc staging jest wymuszony,
   nie kosmetyczny. Do tego wpis `./themes/*` w `exports`, bo mapa `exports` jest zamknięta
   i plik bez wpisu jest dla konsumenta niewidoczny.
3. **Bramka bada artefakt**, nie źródła (`nx check-package components`).

## Konsekwencje

- `libs/components/themes` jest **generowane i gitignorowane** — jedynym źródłem prawdy
  pozostają pliki DTCG w `libs/tokens/src`.
- Bramka sprawdza **domknięcie tokenów** (każdy użyty `var(--pct-*)` ma w pakiecie
  deklarację), a nie samą obecność pliku. Obecność spełniłby też pusty plik albo skórka,
  z której ktoś usunął warstwę komponentową.
- Ręczny krok w CI zniknął.

## Co przez to tracimy

- Katalog generowany wewnątrz projektu publikowanego — trzeba pamiętać, że `themes/`
  nie jest źródłem, mimo że leży w `libs/components`.
- Krawędź w grafie jest **zadeklarowana ręcznie**, więc nowy projekt zależny od tokenów
  w ten sam nietypowy sposób znów jej nie dostanie automatycznie.

## Rozważane alternatywy

| alternatywa                                     | dlaczego odrzucona                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `assets` wskazujące wprost na `libs/tokens`     | ng-packagr nie czyta assetów spoza katalogu projektu — nie jest to wybór          |
| Import TS tokenów, żeby graf zobaczył zależność | wnosiłby runtime JS do pakietu wbrew zasadzie CSS-first, zero-runtime             |
| Poleganie na ręcznym kroku w CI                 | to było **stanem sprzed** tej decyzji; maskowało brak krawędzi zamiast go ujawnić |
