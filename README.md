# @pacit/components

Biblioteka komponentów Angular — budowana jako nowoczesna, dostępna alternatywa dla rozwiązań typu PrimeNG. Monorepo NX.

> **Status:** wczesny etap. Działa _walking skeleton_ — komponent referencyjny `PctButton` przechodzi całą ścieżkę end-to-end (tokeny → build → komponent → SSR → testy → e2e). Pełne ustalenia i wymagania: [docs/opis.md](docs/opis.md).

## Stack

Angular 22 · TypeScript 6 · NX 23 · Vitest · Playwright · SSR (Angular Universal)

## Zasady

- Minimalne zależności runtime: jedynie `@angular/cdk` (CDK Overlay w `PctSelect`).
- Standalone, OnPush, signals, zoneless (`zone.js` nie jest zależnością projektu), SSR.
- Dostępność: minimum WCAG 2.2 AA, weryfikowane automatycznie audytem axe-core w testach e2e (plus obszar dotyku ≥ 24×24 px).
- Theming przez design tokens (DTCG) → CSS custom properties, z zachowaniem referencji `var()` (kaskada, scoped theme).

## Struktura

```
apps/
  sandbox/       aplikacja demo / playground
  sandbox-e2e/   testy e2e (Playwright)
libs/
  components/    pakiet @pacit/components (entrypoints: ./core, ./button, ./input, ./checkbox, ./radio, ./select)
  tokens/        źródło DTCG + build -> CSS/SCSS/TS + bramka kontrastu
docs/opis.md     ustalenia i wymagania
```

## Wymagania wstępne

Node 24 (repo używa nvm). W nieinteraktywnej powłoce najpierw:

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
```

## Start

```bash
npm ci
node libs/tokens/build.mjs         # wygeneruj tokeny (CSS/SCSS/TS) — wymagane przed buildem
npx nx serve sandbox --port 4200   # uruchom demo na http://localhost:4200
```

## Testy

```bash
npx nx test components      # testy jednostkowe biblioteki (Vitest)
npx nx vite:test sandbox    # testy jednostkowe aplikacji (uwaga: inny target niż `test`)
npx nx e2e sandbox-e2e      # e2e + audyt a11y axe-core (wymaga: npx playwright install chromium)
node libs/tokens/build.mjs  # bramka kontrastu (policy WCAG) — błędy blokują, ostrzeżenia informują
```

## Design tokens

Źródło: `libs/tokens/src/*.json` (format DTCG). Build (`libs/tokens/build.mjs`) generuje:

- `dist/pct.css` — CSS custom properties (motyw jasny + `[data-theme="dark"]`),
- `dist/_tokens.scss` — zmienne SCSS do użytku wewnętrznego,
- `dist/tokens.ts` — typowane nazwy tokenów.

Trzy poziomy: **prymitywne → semantyczne → komponentowe**; referencje zachowane jako `var()`, więc nadpisanie jednej zmiennej w dowolnym scope kaskaduje bez rekompilacji. Polityka kontrastu (`src/contrast.policy.json`) waliduje pary tekst/tło wobec progów WCAG, per motyw — `error` blokuje build, `warn` informuje (np. `disabled`, zwolniony z SC 1.4.3).

## Komponenty

`PctButton` (`@pacit/components/button`) — selektor atrybutowy na natywnym `<button>`, warianty `solid|outline`, rozmiary `sm|md|lg`, stany `disabled`/`loading`. Stan wystawiany jako `data-pct-*`, elementy wewnętrzne jako `data-pct-part`.

```html
<button pct-button variant="outline" size="lg">Zapisz</button>
```

`PctInput` (`@pacit/components/input`) — natywna kontrolka **signal forms** (`FormValueControl`), z etykietą, podpowiedzią i komunikatem błędu powiązanymi przez ARIA. Działa również z reactive forms i `ngModel` — bez `ControlValueAccessor`.

```html
<!-- signal forms -->
<pct-input label="E-mail" type="email" [formField]="userForm.email" />

<!-- dwukierunkowo, bez formularza -->
<pct-input label="E-mail" [(value)]="email" />

<!-- kompatybilnie z reactive forms -->
<pct-input label="E-mail" [formControl]="emailCtrl" />
```

`PctCheckbox` (`@pacit/components/checkbox`) — natywna kontrolka **signal forms** (`FormCheckboxControl`). Wymaganym polem jest `checked` (nie `value`), więc wiąże się je nawiasami.

```html
<pct-checkbox label="Akceptuję regulamin" [formField]="userForm.terms" />
<pct-checkbox label="Zapamiętaj mnie" [(checked)]="remember" />
<pct-checkbox label="Częściowy wybór" [indeterminate]="true" />
```

`PctRadioGroup` + `PctRadio` (`@pacit/components/radio`) — komponent złożony: kontrolką formularza jest **grupa**, nie poszczególne opcje. Nawigacja strzałkami pochodzi od przeglądarki (natywne radia ze wspólnym `name`), bez własnego roving tabindex.

```html
<pct-radio-group label="Plan" [formField]="userForm.plan">
  <pct-radio value="free">Darmowy</pct-radio>
  <pct-radio value="pro">Pro</pct-radio>
</pct-radio-group>
```

`PctSelect` (`@pacit/components/select`) — lista wyboru z własnym panelem (nie natywny `<select>`), wzorzec ARIA „select-only combobox": fokus zostaje na triggerze, aktywna opcja wskazywana przez `aria-activedescendant`. Obsługa klawiatury: strzałki, Home/End, Enter, Escape, typeahead.

```html
<pct-select label="Kraj" [options]="countries" [formField]="userForm.country" />
```

> Wymaga dołączenia stylów nakładki CDK: `node_modules/@angular/cdk/overlay-prebuilt.css`.

## Dokumentacja

Pełne wymagania i decyzje architektoniczne (identyfikatory `wym-*`): [docs/opis.md](docs/opis.md).
