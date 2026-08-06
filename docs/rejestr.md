# Rejestr — obietnica → bramka → kontrola

> **Ten plik jest generowany.** Nie edytuj go ręcznie —
> `node tools/check-docs.mjs --write`. Bramka `check-docs` odrzuca rozjazd.

Stan jest **wyprowadzony** z zawartości pól `Bramka` i `Kontrola`, nie wpisany.
Nie ma stanu „zrealizowane, tylko niesprawdzone" — patrz
[README](README.md#pola-bramka-i-kontrola).

| stan           | znaczenie                                          | liczba |
| -------------- | -------------------------------------------------- | -----: |
| ✅ egzekwowane | bramka i kontrola istnieją, są wpięte w CI         |     54 |
| 🟡 częściowo   | bramka jest, kontroli odniesienia brak (świadomie) |     16 |
| ⛔ luka        | brak bramki albo kontroli, z zapisanym terminem    |     11 |
| **razem**      |                                                    | **81** |

## Luki wg pilności

Kolejność bierze się z pola **Wiąże przy**, nie z numeru wymagania.

| wymaganie                                                               | czego brakuje                                                                       | wiąże przy                                                   |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`wym-api-animacje`](wymagania/api.md#wym-api-animacje)                 | zakaz jest dotrzymany, ale **nic go nie pilnuje** — jedyne, co obowią…              | pierwszym komponencie z wejściem/wyjściem (panel, dialog, t… |
| [`wym-api-ikony`](wymagania/api.md#wym-api-ikony)                       | dziś każda ikona jest **wpisana w szablon** jako SVG w `currentColor`…              | drugim komponencie potrzebującym podmienialnej ikony         |
| [`wym-api-liczba`](wymagania/api.md#wym-api-liczba)                     | testy własnościowe parsera (`parse(format(n)) === n` dla dowolnego `n… _(kontrola)_ | pierwszym locale spoza `pl`/`en` zgłoszonym przez konsumenta |
| [`wym-api-szablony`](wymagania/api.md#wym-api-szablony)                 | projekcja działa (sloty obudowy), ale **`TemplateRef` nie pada nigdzi…              | pierwszym realnym użyciu selecta (szablon opcji) oraz przy … |
| [`wym-projekt-aplikacje`](wymagania/projekt.md#wym-projekt-aplikacje)   | `apps/docs` nie istnieje, więc bramka opisywałaby stan, który nie zac…              | pierwszym zewnętrznym użytkowniku — bez dokumentacji nie ma… |
| [`wym-projekt-layout`](wymagania/projekt.md#wym-projekt-layout)         | wynika z `wym-projekt-aplikacje`; domknie się razem z nim                           | powstaniu `apps/docs`                                        |
| [`wym-projekt-pliki`](wymagania/projekt.md#wym-projekt-pliki)           | kontrola układu katalogu entrypointu (skrypt w duchu `check-package.m…              | pierwszym komponencie dopisanym przez kogoś innego niż auto… |
| [`wym-projekt-zaleznosci`](wymagania/projekt.md#wym-projekt-zaleznosci) | kontrola listy `dependencies` / `peerDependencies` w spakowanym manif…              | pierwszej zależności dodanej odruchowo — dziś nic nie odróż… |
| [`wym-token-dyrektywa`](wymagania/tokeny.md#wym-token-dyrektywa)        | dyrektywy nie ma, motyw ustawia się ręcznym `data-theme`                            | gdy ustawianie `data-theme` z szablonu zacznie się powtarza… |
| [`wym-token-gestosc`](wymagania/tokeny.md#wym-token-gestosc)            | w źródłach DTCG nie ma **ani jednego** tokenu gęstości                              | po ustabilizowaniu osi wielkości. Uwaga: gęstość zejdzie po… |
| [`wym-wydanie-wsparcie`](wymagania/wydanie.md#wym-wydanie-wsparcie)     | dokumentu nie ma. Kolekcja migracji istnieje (`wym-wydanie-ng-add`), …              | pierwszym zewnętrznym konsumencie — firma nie kupuje biblio… |

## oś

| wymaganie                   | stan           | bramka                                                                 | kontrola                                                               |
| --------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`wym-os`](00-os.md#wym-os) | ✅ egzekwowane | `wym-jakosc-rejestr` — rejestr obietnica → bramka → kontrola, czytany… | `wym-jakosc-kontrola` — reguła, że bramka bez dowodu zapalenia jest n… |

## dostępność

| wymaganie                                                                  | stan           | bramka                                                                 | kontrola                                                               |
| -------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`wym-a11y-wcag`](wymagania/a11y.md#wym-a11y-wcag)                         | ✅ egzekwowane | `wym-a11y-axe` (wyrenderowany DOM) + `wym-token-kontrast` (wartości w… | patrz obie bramki wyżej > **Zgodność formalna nie znaczy dobra jakość… |
| [`wym-a11y-wbudowana`](wymagania/a11y.md#wym-a11y-wbudowana)               | ✅ egzekwowane | `libs/components/*/src/*.spec.ts` — powiązania ARIA sprawdzane per ko… | `a11y.spec.ts › „bramka a11y faktycznie wykrywa naruszenia (kontrola … |
| [`wym-a11y-dotyk`](wymagania/a11y.md#wym-a11y-dotyk)                       | ✅ egzekwowane | `apps/sandbox-e2e/src/field-hitarea.spec.ts`, `apps/sandbox-e2e/src/c… | bramka ma dwa udokumentowane przebiegi, w których zapaliła: `lekcja-2… |
| [`wym-a11y-axe`](wymagania/a11y.md#wym-a11y-axe)                           | ✅ egzekwowane | `apps/sandbox-e2e/src/a11y.spec.ts`                                    | `a11y.spec.ts › „bramka a11y faktycznie wykrywa naruszenia (kontrola … |
| [`wym-a11y-ruch`](wymagania/a11y.md#wym-a11y-ruch)                         | ✅ egzekwowane | `apps/sandbox-e2e/src/preferences.spec.ts`                             | `preferences.spec.ts › „bez preferencji oś ruchu stoi na wartościach … |
| [`wym-a11y-kolory-wymuszone`](wymagania/a11y.md#wym-a11y-kolory-wymuszone) | ✅ egzekwowane | `apps/sandbox-e2e/src/forced-colors.spec.ts`                           | emulacja idzie przez `page.emulateMedia()` w pomocniku `visit()`, a t… |

## API

| wymaganie                                                             | stan           | bramka                                                                 | kontrola                                                               |
| --------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`wym-api-nazwy`](wymagania/api.md#wym-api-nazwy)                     | 🟡 częściowo   | `libs/components/eslint.config.mjs` — `@angular-eslint/component-sele… | brak — świadomie: reguła ESLint nie ma trybu cichego przejścia ---     |
| [`wym-api-fundament`](wymagania/api.md#wym-api-fundament)             | ✅ egzekwowane | `tools/check-zoneless.mjs` (target `check-zoneless`, w CI) — pomiar `… | `tools/check-zoneless.fixtures/` — spreparowane wejścia, po jednym na… |
| [`wym-api-sygnaly`](wymagania/api.md#wym-api-sygnaly)                 | 🟡 częściowo   | `libs/components/button/src/button.spec.ts`, `libs/components/checkbo… | brak — świadomie: błędna transformacja objawia się złym typem w szabl… |
| [`wym-api-atrybuty`](wymagania/api.md#wym-api-atrybuty)               | 🟡 częściowo   | `apps/sandbox-e2e/src/states.spec.ts` — widok przekrojowy stanów odpy… | brak — świadomie: selektor trafiający w nic daje pusty locator, czyli… |
| [`wym-api-konfiguracja`](wymagania/api.md#wym-api-konfiguracja)       | 🟡 częściowo   | `libs/components/button/src/button.spec.ts` — domyślny `size` z konfi… | brak — świadomie: test porównuje dwie **różne** wartości, więc nie mo… |
| [`wym-api-signal-forms`](wymagania/api.md#wym-api-signal-forms)       | ✅ egzekwowane | `libs/components/field/src/field-controls.spec.ts`, `apps/sandbox-e2e… | testy startują z **niepustą** wartością początkową — z pustym modelem… |
| [`wym-api-kontener`](wymagania/api.md#wym-api-kontener)               | 🟡 częściowo   | `libs/components/radio/src/radio.spec.ts`                              | brak — świadomie: naruszeniem byłby drugi `FormValueControl` w drzewi… |
| [`wym-api-obudowa`](wymagania/api.md#wym-api-obudowa)                 | ✅ egzekwowane | `libs/components/field/src/field.spec.ts`, `apps/sandbox-e2e/src/fiel… | `field-hitarea.spec.ts` — mapa kursora po siatce punktów (`elementFro… |
| [`wym-api-bez-obudowy`](wymagania/api.md#wym-api-bez-obudowy)         | 🟡 częściowo   | `libs/components/field/src/field-controls.spec.ts` — każda kontrolka … | brak — świadomie: tryb samodzielny jest **domyślny**, więc jego awari… |
| [`wym-api-ramka`](wymagania/api.md#wym-api-ramka)                     | ✅ egzekwowane | `apps/sandbox-e2e/src/field.spec.ts`, `wym-a11y-dotyk`                 | test progu dotyku wychwycił regresję opisaną w `lekcja-25` (select w … |
| [`wym-api-natywne-pole`](wymagania/api.md#wym-api-natywne-pole)       | 🟡 częściowo   | `libs/components/field/src/field-controls.spec.ts`                     | brak — świadomie: podmiana `<input>` na własny element wywraca komple… |
| [`wym-api-platforma`](wymagania/api.md#wym-api-platforma)             | 🟡 częściowo   | `apps/sandbox-e2e/src/radio.spec.ts` — nawigacja klawiaturą            | brak — świadomie: test nawigacji nie ma trybu, w którym przechodzi be… |
| [`wym-api-liczba`](wymagania/api.md#wym-api-liczba)                   | ⛔ luka        | `libs/components/field/src/number.spec.ts`, `apps/sandbox-e2e/src/num… | brak — luka: testy własnościowe parsera (`parse(format(n)) === n` dla… |
| [`wym-api-generyk`](wymagania/api.md#wym-api-generyk)                 | ✅ egzekwowane | `libs/components/select/src/select.spec.ts`, target `typecheck` proje… | sonda z `lekcja-37` — pięć celowo sprzecznych wiązań, z których czter… |
| [`wym-api-czesci`](wymagania/api.md#wym-api-czesci)                   | ✅ egzekwowane | `tools/check-parts.mjs` (target `check-parts` w projekcie roota, w CI… | `tools/check-parts.fixtures/` — dwadzieścia jeden wejść, każde odrzuc… |
| [`wym-api-czesci-unikalne`](wymagania/api.md#wym-api-czesci-unikalne) | ✅ egzekwowane | `apps/sandbox-e2e/src/radio.spec.ts`, `apps/sandbox-e2e/src/field.spe… | kolizja z `lekcja-15` i `lekcja-24` jest udokumentowanym przebiegiem,… |
| [`wym-api-szablony`](wymagania/api.md#wym-api-szablony)               | ⛔ luka        | brak — luka: projekcja działa (sloty obudowy), ale **`TemplateRef` ni… | brak — luka: szablon opcji podany przez konsumenta, który nie zostaje… |
| [`wym-api-ikony`](wymagania/api.md#wym-api-ikony)                     | ⛔ luka        | brak — luka: dziś każda ikona jest **wpisana w szablon** jako SVG w `… | brak — luka: podmiana ikony przez `PCT_ICONS`, która nie dociera do k… |
| [`wym-api-ikony-wlasne`](wymagania/api.md#wym-api-ikony-wlasne)       | 🟡 częściowo   | `libs/components/check-package.mjs` — brak plików ikon w spakowanym a… | brak — świadomie: naruszeniem jest **dodanie** czegoś, a nie ciche zn… |
| [`wym-api-teksty`](wymagania/api.md#wym-api-teksty)                   | ✅ egzekwowane | `tools/check-texts.mjs` (target `check-texts`) — sześć punktów: napis… | `tools/check-texts.fixtures/` — 29 spreparowanych wejść, każde odrzuc… |
| [`wym-api-nakladka`](wymagania/api.md#wym-api-nakladka)               | ✅ egzekwowane | `apps/sandbox-e2e/src/select.spec.ts` — pomiar szerokości i przesunię… | pomiar z `lekcja-35` (pole 301 px ⇒ panel 275 px, przesunięcie 13 px;… |
| [`wym-api-wielkosc`](wymagania/api.md#wym-api-wielkosc)               | ✅ egzekwowane | `apps/sandbox-e2e/src/size.spec.ts` — pomiar w przeglądarce            | test sprawdza równość wysokości **i jej konkretną wartość** — przy sa… |
| [`wym-api-animacje`](wymagania/api.md#wym-api-animacje)               | ⛔ luka        | brak — luka: zakaz jest dotrzymany, ale **nic go nie pilnuje** — jedy… | brak — luka: import `@angular/animations` dodany do pakietu musi zapa… |

## jakość

| wymaganie                                                                | stan           | bramka                                                                 | kontrola                                                               |
| ------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`wym-jakosc-kontrola`](wymagania/jakosc.md#wym-jakosc-kontrola)         | ✅ egzekwowane | `tools/check-docs.mjs` — pole **Kontrola** jest wymagane przy każdym … | `tools/check-docs.fixtures/` — wymaganie z bramką, ale bez kontroli, … |
| [`wym-jakosc-rejestr`](wymagania/jakosc.md#wym-jakosc-rejestr)           | ✅ egzekwowane | `tools/check-docs.mjs` (target `check-docs`, w CI) — sześć kontroli o… | `tools/check-docs.fixtures/` — zestaw celowo wadliwych wymagań (bez b… |
| [`wym-jakosc-typecheck`](wymagania/jakosc.md#wym-jakosc-typecheck)       | ✅ egzekwowane | `tools/check-typecheck.mjs` (target `check-typecheck`, w CI) — cztery… | `tools/check-typecheck.fixtures/` — jedenaście spreparowanych wejść, … |
| [`wym-jakosc-jednostkowe`](wymagania/jakosc.md#wym-jakosc-jednostkowe)   | ✅ egzekwowane | trzyczęściowa, bo „testy biegną", „ile ich przechodzi" i „ile wad zau… | `tools/check-mutation.fixtures/` — 37 spreparowanych wejść na udawane… |
| [`wym-jakosc-pokrycie`](wymagania/jakosc.md#wym-jakosc-pokrycie)         | ✅ egzekwowane | dwuczęściowa, bo procent i jego mianownik psują się osobno. `libs/com… | `tools/check-coverage.fixtures/` — siedem spreparowanych wejść, po je… |
| [`wym-jakosc-e2e`](wymagania/jakosc.md#wym-jakosc-e2e)                   | ✅ egzekwowane | `apps/sandbox-e2e/src/visual.spec.ts` i pozostałe specyfikacje e2e     | progi są **dwa** i oba wynikają z pomiaru. Liczba pikseli jest bezwzg… |
| [`wym-jakosc-hydracja`](wymagania/jakosc.md#wym-jakosc-hydracja)         | ✅ egzekwowane | `apps/sandbox-e2e/src/hydration.spec.ts` + pomocnik `visit()` w `apps… | `hydration.spec.ts › „bramka faktycznie wykrywa błąd hydracji (kontro… |
| [`wym-jakosc-pakiet`](wymagania/jakosc.md#wym-jakosc-pakiet)             | ✅ egzekwowane | `libs/components/check-package.mjs` (target `check-package`, w CI)     | `tools/check-package.fixtures/` — siedem spreparowanych pakietów, po … |
| [`wym-jakosc-konsument`](wymagania/jakosc.md#wym-jakosc-konsument)       | ✅ egzekwowane | `tools/check-consumer.mjs` (target `check-consumer`, w CI) — siedem p… | `tools/check-consumer.fixtures/` — 28 spreparowanych wejść, każde odr… |
| [`wym-jakosc-przegladarki`](wymagania/jakosc.md#wym-jakosc-przegladarki) | ✅ egzekwowane | `apps/sandbox-e2e/playwright.config.mts` — trzy projekty (chromium, f… | `tools/check-browsers.fixtures/` — 25 spreparowanych wejść, każde odr… |
| [`wym-jakosc-widoki`](wymagania/jakosc.md#wym-jakosc-widoki)             | ✅ egzekwowane | `apps/sandbox-e2e/src/a11y.spec.ts`, `hydration.spec.ts` — obie iteru… | `apps/sandbox/src/app/app.spec.ts` — rejestr widoków wobec tras        |
| [`wym-jakosc-karta`](wymagania/jakosc.md#wym-jakosc-karta)               | ✅ egzekwowane | `apps/sandbox/src/app/ui/demo.spec.ts`; `tools/check-docs.mjs` — każd… | `tools/check-docs.fixtures/` — karta z nieistniejącym identyfikatorem… |
| [`wym-jakosc-scena`](wymagania/jakosc.md#wym-jakosc-scena)               | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/shell.spe… | `preferences.spec.ts › „bez preferencji ciemnej :root zostaje jasny (… |
| [`wym-jakosc-prefiks`](wymagania/jakosc.md#wym-jakosc-prefiks)           | 🟡 częściowo   | `apps/sandbox/eslint.config.mjs` — reguły selektorów z prefiksami      | brak — świadomie: reguła ESLint nie ma trybu cichego przejścia         |

## projekt

| wymaganie                                                                   | stan           | bramka                                                                 | kontrola                                                               |
| --------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`wym-projekt-monorepo`](wymagania/projekt.md#wym-projekt-monorepo)         | 🟡 częściowo   | `.github/workflows/ci.yml` — cały przebieg idzie przez `nx affected`   | brak — świadomie: awaria jest natychmiastowa i całkowita (CI nie ma c… |
| [`wym-projekt-najnowsze`](wymagania/projekt.md#wym-projekt-najnowsze)       | 🟡 częściowo   | brak — świadomie: to reguła procesu, nie właściwość artefaktu; nie ma… | nie dotyczy                                                            |
| [`wym-projekt-zaleznosci`](wymagania/projekt.md#wym-projekt-zaleznosci)     | ⛔ luka        | brak — luka: kontrola listy `dependencies` / `peerDependencies` w spa… | brak — luka: manifest z dopisaną zależnością spoza listy musi bramkę … |
| [`wym-projekt-aplikacje`](wymagania/projekt.md#wym-projekt-aplikacje)       | ⛔ luka        | brak — luka: `apps/docs` nie istnieje, więc bramka opisywałaby stan, … | brak — luka: patrz wyżej                                               |
| [`wym-projekt-pakiet`](wymagania/projekt.md#wym-projekt-pakiet)             | ✅ egzekwowane | `libs/components/check-package.mjs` (target `check-package`, w CI) — … | `tools/check-package.fixtures/` — spreparowany pakiet na każdy punkt … |
| [`wym-projekt-entrypointy`](wymagania/projekt.md#wym-projekt-entrypointy)   | ✅ egzekwowane | `libs/components/check-package.mjs` — mapa `exports` w spakowanym man… | `tools/check-package.fixtures/skorka-poza-exports/` — plik obecny w p… |
| [`wym-projekt-core`](wymagania/projekt.md#wym-projekt-core)                 | 🟡 częściowo   | `libs/components/field/src/field-controls.spec.ts` — wspólna logika k… | brak — świadomie: naruszeniem jest **duplikacja**, a nie awaria; łapi… |
| [`wym-projekt-lib-tokenow`](wymagania/projekt.md#wym-projekt-lib-tokenow)   | ✅ egzekwowane | `libs/components/project.json` → `implicitDependencies: ["tokens"]` +… | `tools/check-package.fixtures/brak-skorki/` — pakiet bez `themes/pct.… |
| [`wym-projekt-tree-shaking`](wymagania/projekt.md#wym-projekt-tree-shaking) | ✅ egzekwowane | `tools/check-bundle.mjs` (target `check-bundle` w `components`, w CI)… | `tools/check-bundle.fixtures/` — 22 spreparowane wejścia, każde odrzu… |
| [`wym-projekt-pliki`](wymagania/projekt.md#wym-projekt-pliki)               | ⛔ luka        | brak — luka: kontrola układu katalogu entrypointu (skrypt w duchu `ch… | brak — luka: entrypoint z szablonem inline musi bramkę zapalić         |
| [`wym-projekt-prefiks`](wymagania/projekt.md#wym-projekt-prefiks)           | 🟡 częściowo   | `libs/components/eslint.config.mjs` — reguły `@angular-eslint/compone… | brak — świadomie: reguła ESLint zapala przy pierwszym naruszeniu i ni… |
| [`wym-projekt-angular`](wymagania/projekt.md#wym-projekt-angular)           | ✅ egzekwowane | `tools/check-zoneless.mjs` (target `check-zoneless`, w CI) — trzy pun… | `tools/check-zoneless.fixtures/` — spreparowane wejścia, po jednym na… |
| [`wym-projekt-ssr`](wymagania/projekt.md#wym-projekt-ssr)                   | ✅ egzekwowane | `apps/sandbox-e2e/src/hydration.spec.ts` — sprawdzenie siedzi w pomoc… | `hydration.spec.ts › „bramka faktycznie wykrywa błąd hydracji (kontro… |
| [`wym-projekt-layout`](wymagania/projekt.md#wym-projekt-layout)             | ⛔ luka        | brak — luka: wynika z `wym-projekt-aplikacje`; domknie się razem z nim | brak — luka: patrz wyżej                                               |

## tokeny

| wymaganie                                                            | stan           | bramka                                                                 | kontrola                                                               |
| -------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`wym-token-dtcg`](wymagania/tokeny.md#wym-token-dtcg)               | 🟡 częściowo   | `libs/tokens/build.mjs` — build nie ruszy przy niepoprawnym kształcie… | brak — świadomie: błąd parsowania jest natychmiastowy i głośny         |
| [`wym-token-artefakty`](wymagania/tokeny.md#wym-token-artefakty)     | ✅ egzekwowane | target `typecheck` projektu `sandbox-e2e` — pomocniki `tokenOf` / `ro… | podmiana jednej nazwy na błędną daje 6 błędów typu — przebieg udokume… |
| [`wym-token-poziomy`](wymagania/tokeny.md#wym-token-poziomy)         | ✅ egzekwowane | `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w … | `tools/check-tokens.fixtures/` — po jednym wejściu na regułę: `kolor-… |
| [`wym-token-referencje`](wymagania/tokeny.md#wym-token-referencje)   | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts` — nadpisanie tokenu semantyczneg… | test porównuje token komponentowy w `:root` **i** w scope — sam token… |
| [`wym-token-domkniecie`](wymagania/tokeny.md#wym-token-domkniecie)   | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts` — token **komponentowy** porówny… | przebieg z `lekcja-17`: przed poprawką `--pct-surface` był poprawnie … |
| [`wym-token-nazwy`](wymagania/tokeny.md#wym-token-nazwy)             | ✅ egzekwowane | `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w … | `tools/check-tokens.fixtures/` — jedenaście wejść, każde odrzucane na… |
| [`wym-token-pary-tekstu`](wymagania/tokeny.md#wym-token-pary-tekstu) | ✅ egzekwowane | `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w … | `tools/check-tokens.fixtures/` — `kolor-niezmierzony` (arkusz maluje … |
| [`wym-token-kontrast`](wymagania/tokeny.md#wym-token-kontrast)       | ✅ egzekwowane | `libs/tokens/build.mjs` (target `tokens:build`, w CI przez `^build`);… | przebieg z `lekcja-6`: pierwotny guard przepuścił `disabled` o realny… |
| [`wym-token-bez-opacity`](wymagania/tokeny.md#wym-token-bez-opacity) | ✅ egzekwowane | `tools/check-styles.mjs` (target `check-styles`, w CI) — punkt 6: `op… | `tools/check-styles.fixtures/opacity-czesciowa/` (stan wyrażony przez… |
| [`wym-token-css`](wymagania/tokeny.md#wym-token-css)                 | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts`, `libs/components/check-package.… | `tools/check-package.fixtures/token-bez-deklaracji/` — pakiet, w któr… |
| [`wym-token-scss`](wymagania/tokeny.md#wym-token-scss)               | 🟡 częściowo   | brak — świadomie: rozszerzenie pliku jest widoczne w review, a arkusz… | nie dotyczy ---                                                        |
| [`wym-token-nadpisanie`](wymagania/tokeny.md#wym-token-nadpisanie)   | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts`                                   | jak w `wym-token-domkniecie` — porównanie tokenu komponentowego, nie … |
| [`wym-token-scoped`](wymagania/tokeny.md#wym-token-scoped)           | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/a11y.spec… | patrz `wym-token-domkniecie`                                           |
| [`wym-token-dyrektywa`](wymagania/tokeny.md#wym-token-dyrektywa)     | ⛔ luka        | brak — luka: dyrektywy nie ma, motyw ustawia się ręcznym `data-theme`  | brak — luka: motyw ustawiony dyrektywą i motyw ustawiony atrybutem mu… |
| [`wym-token-system`](wymagania/tokeny.md#wym-token-system)           | ✅ egzekwowane | `apps/sandbox-e2e/src/preferences.spec.ts`                             | `preferences.spec.ts › „bez preferencji ciemnej :root zostaje jasny (… |
| [`wym-token-skorka`](wymagania/tokeny.md#wym-token-skorka)           | ✅ egzekwowane | `libs/tokens/build.mjs` — ale **wyłącznie dla skórki wbudowanej**      | patrz `wym-token-kontrast`                                             |
| [`wym-token-dystrybucja`](wymagania/tokeny.md#wym-token-dystrybucja) | ✅ egzekwowane | `libs/components/check-package.mjs` — punkty 1 i 2: skórka jest w pak… | `tools/check-package.fixtures/brak-skorki/` — pakiet bez skórki musi … |
| [`wym-token-gestosc`](wymagania/tokeny.md#wym-token-gestosc)         | ⛔ luka        | brak — luka: w źródłach DTCG nie ma **ani jednego** tokenu gęstości    | brak — luka: układ z tokenem gęstości `compact` musi przejść próg obs… |
| [`wym-token-logiczne`](wymagania/tokeny.md#wym-token-logiczne)       | ✅ egzekwowane | `tools/check-styles.mjs` (target `check-styles`, w CI) — punkt 5: zak… | `tools/check-styles.fixtures/padding-fizyczny/` (nazwa właściwości) i… |

## wydanie

| wymaganie                                                           | stan           | bramka                                                                 | kontrola                                                               |
| ------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`wym-wydanie-semver`](wymagania/wydanie.md#wym-wydanie-semver)     | ✅ egzekwowane | `libs/components/check-package.mjs` (punkt 4: `PCT_VERSION` == `versi… | `stamp-version` **nie jest** zależnością `build` — gdyby był, artefak… |
| [`wym-wydanie-ng-add`](wymagania/wydanie.md#wym-wydanie-ng-add)     | ✅ egzekwowane | `libs/components/check-package.mjs` (punkt 5) — kolekcje są w pakieci… | `tools/check-package.fixtures/brak-schematica/` — pakiet, w którym ko… |
| [`wym-wydanie-metadane`](wymagania/wydanie.md#wym-wydanie-metadane) | ✅ egzekwowane | `libs/components/check-package.mjs` (punkt 6) — ostrzeżenie w zwykłym… | `tools/check-package.fixtures/brak-repository/` — manifest bez `repos… |
| [`wym-wydanie-wsparcie`](wymagania/wydanie.md#wym-wydanie-wsparcie) | ⛔ luka        | brak — luka: dokumentu nie ma. Kolekcja migracji istnieje (`wym-wydan… | brak — luka: commit `feat!:` bez wpisu w kolekcji migracji musi zapal… |

## Indeks odwrotny — lekcja → wymagania

Która lekcja karmi które wymaganie. Generowane z pól **Lekcje**.

| lekcja                             | wymagania                                                                                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`lekcja-1`](lekcje.md#lekcja-1)   | `wym-projekt-layout`                                                                                                                                         |
| [`lekcja-2`](lekcje.md#lekcja-2)   | `wym-projekt-layout`                                                                                                                                         |
| [`lekcja-3`](lekcje.md#lekcja-3)   | `wym-jakosc-jednostkowe`                                                                                                                                     |
| [`lekcja-4`](lekcje.md#lekcja-4)   | `wym-token-dtcg`                                                                                                                                             |
| [`lekcja-5`](lekcje.md#lekcja-5)   | `wym-jakosc-pokrycie`                                                                                                                                        |
| [`lekcja-6`](lekcje.md#lekcja-6)   | `wym-token-kontrast`, `wym-token-bez-opacity`                                                                                                                |
| [`lekcja-7`](lekcje.md#lekcja-7)   | `wym-api-fundament`, `wym-projekt-angular`                                                                                                                   |
| [`lekcja-8`](lekcje.md#lekcja-8)   | `wym-projekt-angular`                                                                                                                                        |
| [`lekcja-9`](lekcje.md#lekcja-9)   | `wym-api-signal-forms`                                                                                                                                       |
| [`lekcja-10`](lekcje.md#lekcja-10) | `wym-token-kontrast`                                                                                                                                         |
| [`lekcja-11`](lekcje.md#lekcja-11) | `wym-api-fundament`, `wym-projekt-angular`                                                                                                                   |
| [`lekcja-12`](lekcje.md#lekcja-12) | `wym-api-sygnaly`                                                                                                                                            |
| [`lekcja-13`](lekcje.md#lekcja-13) | `wym-jakosc-e2e`, `wym-jakosc-karta`                                                                                                                         |
| [`lekcja-14`](lekcje.md#lekcja-14) | `wym-a11y-dotyk`, `wym-a11y-axe`                                                                                                                             |
| [`lekcja-15`](lekcje.md#lekcja-15) | `wym-api-czesci-unikalne`                                                                                                                                    |
| [`lekcja-16`](lekcje.md#lekcja-16) | `wym-api-kontener`                                                                                                                                           |
| [`lekcja-17`](lekcje.md#lekcja-17) | `wym-jakosc-scena`, `wym-token-referencje`, `wym-token-domkniecie`, `wym-token-nadpisanie`, `wym-token-scoped`                                               |
| [`lekcja-18`](lekcje.md#lekcja-18) | `wym-api-nakladka`, `wym-token-css`, `wym-token-scoped`                                                                                                      |
| [`lekcja-19`](lekcje.md#lekcja-19) | `wym-jakosc-jednostkowe`                                                                                                                                     |
| [`lekcja-20`](lekcje.md#lekcja-20) | `wym-api-signal-forms`                                                                                                                                       |
| [`lekcja-21`](lekcje.md#lekcja-21) | `wym-api-obudowa`, `wym-projekt-core`                                                                                                                        |
| [`lekcja-22`](lekcje.md#lekcja-22) | `wym-api-obudowa`                                                                                                                                            |
| [`lekcja-23`](lekcje.md#lekcja-23) | `wym-jakosc-e2e`                                                                                                                                             |
| [`lekcja-24`](lekcje.md#lekcja-24) | `wym-api-obudowa`, `wym-api-czesci-unikalne`                                                                                                                 |
| [`lekcja-25`](lekcje.md#lekcja-25) | `wym-a11y-dotyk`, `wym-api-ramka`                                                                                                                            |
| [`lekcja-26`](lekcje.md#lekcja-26) | `wym-api-signal-forms`                                                                                                                                       |
| [`lekcja-27`](lekcje.md#lekcja-27) | `wym-api-obudowa`                                                                                                                                            |
| [`lekcja-28`](lekcje.md#lekcja-28) | `wym-api-obudowa`, `wym-jakosc-jednostkowe`                                                                                                                  |
| [`lekcja-29`](lekcje.md#lekcja-29) | `wym-api-wielkosc`, `wym-jakosc-widoki`                                                                                                                      |
| [`lekcja-30`](lekcje.md#lekcja-30) | `wym-jakosc-e2e`, `wym-jakosc-hydracja`, `wym-projekt-ssr`                                                                                                   |
| [`lekcja-31`](lekcje.md#lekcja-31) | `wym-a11y-wbudowana`, `wym-jakosc-hydracja`, `wym-projekt-ssr`                                                                                               |
| [`lekcja-32`](lekcje.md#lekcja-32) | `wym-api-liczba`                                                                                                                                             |
| [`lekcja-33`](lekcje.md#lekcja-33) | `wym-a11y-wbudowana`, `wym-a11y-axe`, `wym-jakosc-widoki`                                                                                                    |
| [`lekcja-34`](lekcje.md#lekcja-34) | `wym-api-obudowa`, `wym-api-wielkosc`                                                                                                                        |
| [`lekcja-35`](lekcje.md#lekcja-35) | `wym-api-nakladka`, `wym-token-logiczne`                                                                                                                     |
| [`lekcja-36`](lekcje.md#lekcja-36) | `wym-jakosc-rejestr`, `wym-jakosc-pakiet`, `wym-jakosc-konsument`, `wym-projekt-pakiet`, `wym-projekt-lib-tokenow`, `wym-token-css`, `wym-token-dystrybucja` |
| [`lekcja-37`](lekcje.md#lekcja-37) | `wym-api-generyk`                                                                                                                                            |
| [`lekcja-38`](lekcje.md#lekcja-38) | `wym-a11y-ruch`, `wym-a11y-kolory-wymuszone`, `wym-jakosc-kontrola`, `wym-token-system`                                                                      |
| [`lekcja-39`](lekcje.md#lekcja-39) | `wym-jakosc-kontrola`, `wym-jakosc-rejestr`, `wym-jakosc-e2e`                                                                                                |
| [`lekcja-40`](lekcje.md#lekcja-40) | `wym-a11y-kolory-wymuszone`                                                                                                                                  |
| [`lekcja-41`](lekcje.md#lekcja-41) | `wym-jakosc-kontrola`, `wym-jakosc-pakiet`, `wym-wydanie-semver`                                                                                             |
| [`lekcja-42`](lekcje.md#lekcja-42) | `wym-jakosc-typecheck`, `wym-token-artefakty`                                                                                                                |
| [`lekcja-43`](lekcje.md#lekcja-43) | `wym-jakosc-karta`, `wym-token-artefakty`                                                                                                                    |
| [`lekcja-44`](lekcje.md#lekcja-44) | — _(nie cytowana)_                                                                                                                                           |
| [`lekcja-45`](lekcje.md#lekcja-45) | `wym-jakosc-pokrycie`                                                                                                                                        |
| [`lekcja-46`](lekcje.md#lekcja-46) | `wym-api-fundament`                                                                                                                                          |
| [`lekcja-47`](lekcje.md#lekcja-47) | `wym-jakosc-typecheck`                                                                                                                                       |
| [`lekcja-48`](lekcje.md#lekcja-48) | `wym-token-logiczne`                                                                                                                                         |
| [`lekcja-49`](lekcje.md#lekcja-49) | — _(nie cytowana)_                                                                                                                                           |
| [`lekcja-50`](lekcje.md#lekcja-50) | — _(nie cytowana)_                                                                                                                                           |
| [`lekcja-51`](lekcje.md#lekcja-51) | `wym-projekt-tree-shaking`                                                                                                                                   |
| [`lekcja-52`](lekcje.md#lekcja-52) | — _(nie cytowana)_                                                                                                                                           |
| [`lekcja-53`](lekcje.md#lekcja-53) | — _(nie cytowana)_                                                                                                                                           |
| [`lekcja-54`](lekcje.md#lekcja-54) | `wym-api-teksty`                                                                                                                                             |
| [`lekcja-55`](lekcje.md#lekcja-55) | `wym-jakosc-pakiet`, `wym-jakosc-konsument`, `wym-wydanie-ng-add`                                                                                            |
| [`lekcja-56`](lekcje.md#lekcja-56) | `wym-jakosc-przegladarki`                                                                                                                                    |
| [`lekcja-57`](lekcje.md#lekcja-57) | `wym-jakosc-jednostkowe`                                                                                                                                     |
| [`lekcja-58`](lekcje.md#lekcja-58) | `wym-jakosc-jednostkowe`                                                                                                                                     |
