# 0011 — Ikony przez szablon i `PCT_ICONS`

**Status:** przyjęta (mechanizm nie jest zbudowany)
**Realizuje:** [`wym-api-ikony`](../wymagania/api.md#wym-api-ikony),
[`wym-api-ikony-wlasne`](../wymagania/api.md#wym-api-ikony-wlasne)
**Dowód:** brak — decyzja kierunkowa, podjęta przed budową

## Kontekst

Dwie obietnice, które łatwo uznać za sprzeczne:

- [`wym-projekt-zaleznosci`](../wymagania/projekt.md#wym-projekt-zaleznosci) — zero
  zależności runtime, więc **nie wciągamy cudzego zestawu ikon**.
- [`wym-api-ikony`](../wymagania/api.md#wym-api-ikony) — konsument ma móc **podmienić
  ikonę na swoją**.

Dziś każda ikona jest **wpisana w szablon** jako SVG w `currentColor` (znacznik checkboxa,
strzałka selecta). Działa i nie wnosi zależności, ale nie jest mechanizmem: konsument nie
ma jak podmienić strzałki selecta, a każdy nowy komponent dokłada kolejny wpisany SVG.

## Decyzja

**Dwa poziomy, spełniające obie obietnice naraz:**

1. **`pct-icon` przyjmujący rzutowany SVG** — najniższy poziom, bez żadnej wiedzy o nazwach.
2. **Token `PCT_ICONS` mapujący nazwy semantyczne na szablony** — `chevron-down`, `check`,
   `close`, `calendar`, z **wbudowanymi wpisanymi domyślnymi**.

Konsument, który nic nie zrobi, dostaje działające ikony. Konsument, który poda własny
zestaw, podmienia je **globalnie jedną deklaracją**, a nie komponent po komponencie.

Nazwy są **semantyczne, nie wizualne** (`chevron-down`, nie `arrow-down-16`), bo mapowane
są na role w komponentach, a nie na wygląd.

## Konsekwencje

- **Wiąże z [`wym-api-szablony`](../wymagania/api.md#wym-api-szablony)** — najprostszym
  mechanizmem podmiany jest szablon, którego jeszcze nie ma. Ikony nie ruszą przed nim.
- Zestaw domyślny zostaje wpisany w bibliotekę, więc `wym-api-ikony-wlasne` (nie
  dostarczamy zestawu) obowiązuje w sensie „nie publikujemy zestawu jako produktu", a nie
  „nie ma w pakiecie ani jednego SVG".
- Rozmiar ikony bierze się z kontekstu (`currentColor`, `1em`), więc oś wielkości
  ([0004](0004-wysokosc-wprost.md)) obejmuje ikony bez osobnej konfiguracji.

## Co przez to tracimy

- **Lista nazw semantycznych jest publicznym API** i podlega tym samym rygorom co
  [`wym-api-czesci`](../wymagania/api.md#wym-api-czesci): raz opublikowanej nazwy nie
  można zmienić bez migracji.
- Konsument podmieniający **jedną** ikonę musi znać nazwę — czyli potrzebuje spisu, który
  jest kolejnym generowanym inwentarzem.
- Dwa poziomy to dwie powierzchnie do udokumentowania.

## Rozważane alternatywy

| alternatywa                          | dlaczego odrzucona                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| Zależność od zestawu ikon            | łamie [`wym-projekt-zaleznosci`](../wymagania/projekt.md#wym-projekt-zaleznosci) |
| Tylko rzutowany SVG, bez `PCT_ICONS` | zmusza konsumenta do podania ikony przy **każdym** użyciu każdego komponentu     |
| Tylko `PCT_ICONS`, bez `pct-icon`    | odbiera możliwość wstawienia jednorazowej ikony bez rejestrowania jej pod nazwą  |
| Font ikon                            | wnosi zależność, gorzej skaluje i psuje się przy blokowaniu zewnętrznych fontów  |
