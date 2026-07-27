# @pacit/components

Biblioteka komponentów Angular — budowana jako nowoczesna, dostępna alternatywa dla rozwiązań typu PrimeNG. Monorepo NX.

> **Status:** wczesny etap, API wciąż się zmienia. Kontrolki formularza budowane są jako obudowa `pct-field` + kontrolka w środku. Pełne ustalenia i wymagania: [docs/opis.md](docs/opis.md) — w tym zestawienie [czego jeszcze nie ma](docs/opis.md#czego-jeszcze-nie-ma).

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
  components/    pakiet @pacit/components (entrypoints: ./core, ./field, ./button, ./checkbox, ./radio, ./select)
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
npx nx serve sandbox --port 4200   # uruchom demo na http://localhost:4200
```

Tokeny (`libs/tokens/dist`) budują się same — `tokens` jest zależnością `components`
i `sandbox` w grafie NX, więc `nx serve`/`nx build` generuje je przed konsumentami.
Osobno uruchamia je `npx nx build tokens`.

## Testy

```bash
npx nx test components           # testy jednostkowe biblioteki (Vitest)
npx nx vite:test sandbox         # testy jednostkowe aplikacji (uwaga: inny target niż `test`)
npx nx e2e sandbox-e2e           # e2e + audyt a11y axe-core (wymaga: npx playwright install chromium)
npx nx build tokens              # bramka kontrastu (policy WCAG) — błędy blokują, ostrzeżenia informują
npx nx check-package components  # bramka pakietu — czy dist wozi skórkę i domyka użyte tokeny
```

## Design tokens

Źródło: `libs/tokens/src/*.json` (format DTCG). Build (`libs/tokens/build.mjs`) generuje:

- `dist/pct.css` — CSS custom properties (motyw jasny + `[data-theme="dark"]`),
- `dist/_tokens.scss` — zmienne SCSS do użytku wewnętrznego,
- `dist/tokens.ts` — typowane nazwy tokenów.

Skórka jedzie w pakiecie i **musi zostać dołączona** — bez niej komponenty odwołują się do
nieistniejących custom properties i renderują się bez wyglądu:

```jsonc
// angular.json / project.json — styles
"node_modules/@pacit/components/themes/pct.css"
```

```scss
// albo z poziomu arkusza
@use '@pacit/components/themes/pct.css';
```

Pilnuje tego bramka `nx check-package components`: sprawdza, czy `dist` zawiera `themes/pct.css`,
czy plik jest osiągalny przez `exports`, i czy **każdy** `var(--pct-*)` użyty w pakiecie ma w nim
swoją deklarację.

Trzy poziomy: **prymitywne → semantyczne → komponentowe**; referencje zachowane jako `var()`, więc nadpisanie jednej zmiennej w dowolnym scope kaskaduje bez rekompilacji. Polityka kontrastu (`src/contrast.policy.json`) waliduje pary tekst/tło wobec progów WCAG, per motyw — `error` blokuje build, `warn` informuje (np. `disabled`, zwolniony z SC 1.4.3).

## Komponenty

`PctButton` (`@pacit/components/button`) — selektor atrybutowy na natywnym `<button>`, warianty `solid|outline`, rozmiary `sm|md|lg`, stany `disabled`/`loading`. Stan wystawiany jako `data-pct-*`, elementy wewnętrzne jako `data-pct-part`.

```html
<button pctButton variant="outline" size="lg">Zapisz</button>
```

`PctField` (`@pacit/components/field`) — **obudowa pola**: etykieta, podpowiedź, komunikat błędu, znacznik wymagalności i sloty `[pctPrefix]` / `[pctSuffix]` wewnątrz ramki. Kontraktu formularza nie implementuje obudowa, lecz kontrolka w środku, więc typowanie zostaje przy rodzaju pola. W środku może stać dowolna kontrolka — pole tekstowe, select, checkbox, grupa radiów.

```html
<!-- pole tekstowe: komponent na natywnym <input> -->
<pct-field label="E-mail" hint="Adres służbowy">
  <input pctText type="email" [formField]="userForm.email" />
</pct-field>

<!-- ta sama obudowa, inna kontrolka -->
<pct-field label="Kraj">
  <pct-select [options]="countries" [formField]="userForm.country" />
</pct-field>

<!-- dekoracje wewnątrz ramki; `inset` (domyślnie) leży na powierzchni pola,
     `fill` bierze cały slot i jest własną powierzchnią -->
<pct-field label="Cena">
  <span pctPrefix aria-hidden="true">PLN</span>
  <input pctText inputmode="numeric" [(value)]="price" />
  <button pctSuffix pctButton size="sm" aria-label="Wyczyść">×</button>
</pct-field>

<pct-field label="Szukaj">
  <input pctText [(value)]="query" />
  <button pctSuffix="fill" pctButton>Szukaj</button>
</pct-field>
```

Kontrolki działają też **bez obudowy** (wtedy bez etykiety i komunikatów), a checkbox i grupa radiów rysują wówczas własną etykietę.

`PctNumber` (`@pacit/components/field`) — pole liczbowe (`input[pctNumber]`) o wartości `number | null`. Świadomie **nie** opiera się na `<input type="number">`: to pole nie zna lokalnego separatora dziesiętnego, nie grupuje tysięcy i przy błędnej treści zwraca puste `value`. Zamiast tego `<input type="text">` z `role="spinbutton"` i formatowaniem przez `Intl.NumberFormat` wg `LOCALE_ID`.

```html
<!-- domyślnie pole całkowite; granice biorą się z walidatorów min()/max() schematu -->
<pct-field label="Liczba stanowisk">
  <input pctNumber [formField]="form.seats" />
</pct-field>

<!-- kwota: dwa miejsca po przecinku, krok pół złotego -->
<pct-field label="Cena">
  <span pctPrefix aria-hidden="true">PLN</span>
  <input pctNumber [minFractionDigits]="2" [maxFractionDigits]="2" [step]="0.5" [(value)]="price" />
</pct-field>
```

Puste pole to `null`, nie `0`. Wpisując, można używać przecinka i kropki niezależnie od locale. Zaokrąglenie i domknięcie do `min`/`max` następuje przy opuszczeniu pola, nie w trakcie pisania. Strzałki góra/dół zmieniają wartość o `step`, PageUp/PageDown dziesięciokrotnie, Home/End skaczą do granic.

`PctCheckbox` (`@pacit/components/checkbox`) — natywna kontrolka **signal forms** (`FormCheckboxControl`). Wymaganym polem jest `checked` (nie `value`), więc wiąże się je nawiasami.

```html
<pct-checkbox label="Akceptuję regulamin" [formField]="userForm.terms" />
<!-- w obudowie: etykietę renderuje pct-field, checkbox jej nie powtarza -->
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

Wartość jest dowolnego typu (`PctRadioGroup<T>`, domyślnie `string`) — opcją może być wariant unii albo encja. Równość zgłasza aplikacja przez `compareWith`, a brak wyboru to `null`.

`PctSelect` (`@pacit/components/select`) — lista wyboru z własnym panelem (nie natywny `<select>`), wzorzec ARIA „select-only combobox": fokus zostaje na triggerze, aktywna opcja wskazywana przez `aria-activedescendant`. Obsługa klawiatury: strzałki, Home/End, Enter, Escape, typeahead.

```html
<pct-field label="Kraj">
  <pct-select [options]="countries" [formField]="userForm.country" />
</pct-field>
```

Wartość jest dowolnego typu (`PctSelect<T>` / `PctSelectOption<T>`, domyślnie `string`), a typ bierze się z listy opcji. Encje porównuje się po kluczu — instancja z serwera nie jest tą samą referencją co opcja na liście:

```html
<!-- protected poId = (a: Miasto, b: Miasto) => a.id === b.id; -->
<pct-select [options]="miasta" [compareWith]="poId" [(value)]="miasto" />
```

Brak wyboru to `null`. Aplikacja z polem nienullowalnym podaje własną wartość pustą (`[emptyValue]="''"`), żeby reset formularza nie wpisywał `null` wbrew typowi modelu.

> Wymaga dołączenia stylów nakładki CDK: `node_modules/@angular/cdk/overlay-prebuilt.css`.

## Teksty i tłumaczenia

Napisy, które komponent wypisuje sam (tekst zastępczy listy, komunikat pustej listy), są **angielskie** i idą przez token DI. Podane pola nadpisują domyślne, reszta zostaje:

```ts
bootstrapApplication(App, {
  providers: [providePctTexts({ selectPlaceholder: 'Wybierz…', selectEmpty: 'Brak opcji' })],
});
```

`providePctTexts` działa też w zasięgu lokalnym (`providers` komponentu) — sekcja aplikacji może mieć inny język niż reszta. Ostrzeżenia deweloperskie w konsoli nie należą do tego kanału: są po angielsku i gasną poza trybem deweloperskim.

## Dokumentacja

Pełne wymagania i decyzje architektoniczne (identyfikatory `wym-*`): [docs/opis.md](docs/opis.md).
