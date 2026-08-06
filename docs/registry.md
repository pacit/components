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
| ⛔ luka        | brak bramki albo kontroli, z zapisanym terminem    |     13 |
| **razem**      |                                                    | **83** |

## Luki wg pilności

Kolejność bierze się z pola **Wiąże przy**, nie z numeru wymagania.

| wymaganie                                                                      | czego brakuje                                                                       | wiąże przy                                                   |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`req-api-animations`](requirements/api.md#req-api-animations)                 | zakaz jest dotrzymany, ale **nic go nie pilnuje** — jedyne, co obowią…              | pierwszym komponencie z wejściem/wyjściem (panel, dialog, t… |
| [`req-api-icons`](requirements/api.md#req-api-icons)                           | dziś każda ikona jest **wpisana w szablon** jako SVG w `currentColor`…              | drugim komponencie potrzebującym podmienialnej ikony         |
| [`req-api-number`](requirements/api.md#req-api-number)                         | testy własnościowe parsera (`parse(format(n)) === n` dla dowolnego `n… _(kontrola)_ | pierwszym locale spoza `pl`/`en` zgłoszonym przez konsumenta |
| [`req-api-templates`](requirements/api.md#req-api-templates)                   | projekcja działa (sloty obudowy), ale **`TemplateRef` nie pada nigdzi…              | pierwszym realnym użyciu selecta (szablon opcji) oraz przy … |
| [`req-project-apps`](requirements/project.md#req-project-apps)                 | `apps/docs` nie istnieje, więc bramka opisywałaby stan, który nie zac…              | pierwszym zewnętrznym użytkowniku — bez dokumentacji nie ma… |
| [`req-project-concise`](requirements/project.md#req-project-concise)           | budżet objętości prozy per plik, snapshot z tolerancją **dwustronną**…              | zamknięciu kompresji (sekcja H) — **nie wcześniej**. Snapsh… |
| [`req-project-dependencies`](requirements/project.md#req-project-dependencies) | kontrola listy `dependencies` / `peerDependencies` w spakowanym manif…              | pierwszej zależności dodanej odruchowo — dziś nic nie odróż… |
| [`req-project-files`](requirements/project.md#req-project-files)               | kontrola układu katalogu entrypointu (skrypt w duchu `check-package.m…              | pierwszym komponencie dopisanym przez kogoś innego niż auto… |
| [`req-project-language`](requirements/project.md#req-project-language)         | `tools/check-language.mjs` — dwa pomiary o różnym zasięgu. Powierzchn…              | **pierwszym pushu do upstreamu** — repozytorium jest public… |
| [`req-project-layout`](requirements/project.md#req-project-layout)             | wynika z `req-project-apps`; domknie się razem z nim                                | powstaniu `apps/docs`                                        |
| [`req-release-support`](requirements/release.md#req-release-support)           | dokumentu nie ma. Kolekcja migracji istnieje (`req-release-ng-add`), …              | pierwszym zewnętrznym konsumencie — firma nie kupuje biblio… |
| [`req-token-density`](requirements/tokens.md#req-token-density)                | w źródłach DTCG nie ma **ani jednego** tokenu gęstości                              | po ustabilizowaniu osi wielkości. Uwaga: gęstość zejdzie po… |
| [`req-token-directive`](requirements/tokens.md#req-token-directive)            | dyrektywy nie ma, motyw ustawia się ręcznym `data-theme`                            | gdy ustawianie `data-theme` z szablonu zacznie się powtarza… |

## oś

| wymaganie                         | stan           | bramka                                                                 | kontrola                                                               |
| --------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-axis`](00-axis.md#req-axis) | ✅ egzekwowane | `req-quality-registry` — rejestr obietnica → bramka → kontrola, czyta… | `req-quality-negative-control` — reguła, że bramka bez dowodu zapalen… |

## dostępność

| wymaganie                                                               | stan           | bramka                                                                 | kontrola                                                               |
| ----------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-a11y-wcag`](requirements/a11y.md#req-a11y-wcag)                   | ✅ egzekwowane | `req-a11y-axe` (wyrenderowany DOM) + `req-token-contrast` (wartości w… | patrz obie bramki wyżej > **Zgodność formalna nie znaczy dobra jakość… |
| [`req-a11y-built-in`](requirements/a11y.md#req-a11y-built-in)           | ✅ egzekwowane | `libs/components/*/src/*.spec.ts` — powiązania ARIA sprawdzane per ko… | `a11y.spec.ts › „bramka a11y faktycznie wykrywa naruszenia (kontrola … |
| [`req-a11y-touch`](requirements/a11y.md#req-a11y-touch)                 | ✅ egzekwowane | `apps/sandbox-e2e/src/field-hitarea.spec.ts`, `apps/sandbox-e2e/src/c… | bramka ma dwa udokumentowane przebiegi, w których zapaliła: `lesson-2… |
| [`req-a11y-axe`](requirements/a11y.md#req-a11y-axe)                     | ✅ egzekwowane | `apps/sandbox-e2e/src/a11y.spec.ts`                                    | `a11y.spec.ts › „bramka a11y faktycznie wykrywa naruszenia (kontrola … |
| [`req-a11y-motion`](requirements/a11y.md#req-a11y-motion)               | ✅ egzekwowane | `apps/sandbox-e2e/src/preferences.spec.ts`                             | `preferences.spec.ts › „bez preferencji oś ruchu stoi na wartościach … |
| [`req-a11y-forced-colors`](requirements/a11y.md#req-a11y-forced-colors) | ✅ egzekwowane | `apps/sandbox-e2e/src/forced-colors.spec.ts`                           | emulacja idzie przez `page.emulateMedia()` w pomocniku `visit()`, a t… |

## API

| wymaganie                                                          | stan           | bramka                                                                 | kontrola                                                               |
| ------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-api-names`](requirements/api.md#req-api-names)               | 🟡 częściowo   | `libs/components/eslint.config.mjs` — `@angular-eslint/component-sele… | brak — świadomie: reguła ESLint nie ma trybu cichego przejścia ---     |
| [`req-api-foundation`](requirements/api.md#req-api-foundation)     | ✅ egzekwowane | `tools/check-zoneless.mjs` (target `check-zoneless`, w CI) — pomiar `… | `tools/check-zoneless.fixtures/` — spreparowane wejścia, po jednym na… |
| [`req-api-signals`](requirements/api.md#req-api-signals)           | 🟡 częściowo   | `libs/components/button/src/button.spec.ts`, `libs/components/checkbo… | brak — świadomie: błędna transformacja objawia się złym typem w szabl… |
| [`req-api-attributes`](requirements/api.md#req-api-attributes)     | 🟡 częściowo   | `apps/sandbox-e2e/src/states.spec.ts` — widok przekrojowy stanów odpy… | brak — świadomie: selektor trafiający w nic daje pusty locator, czyli… |
| [`req-api-config`](requirements/api.md#req-api-config)             | 🟡 częściowo   | `libs/components/button/src/button.spec.ts` — domyślny `size` z konfi… | brak — świadomie: test porównuje dwie **różne** wartości, więc nie mo… |
| [`req-api-signal-forms`](requirements/api.md#req-api-signal-forms) | ✅ egzekwowane | `libs/components/field/src/field-controls.spec.ts`, `apps/sandbox-e2e… | testy startują z **niepustą** wartością początkową — z pustym modelem… |
| [`req-api-container`](requirements/api.md#req-api-container)       | 🟡 częściowo   | `libs/components/radio/src/radio.spec.ts`                              | brak — świadomie: naruszeniem byłby drugi `FormValueControl` w drzewi… |
| [`req-api-wrapper`](requirements/api.md#req-api-wrapper)           | ✅ egzekwowane | `libs/components/field/src/field.spec.ts`, `apps/sandbox-e2e/src/fiel… | `field-hitarea.spec.ts` — mapa kursora po siatce punktów (`elementFro… |
| [`req-api-no-wrapper`](requirements/api.md#req-api-no-wrapper)     | 🟡 częściowo   | `libs/components/field/src/field-controls.spec.ts` — każda kontrolka … | brak — świadomie: tryb samodzielny jest **domyślny**, więc jego awari… |
| [`req-api-frame`](requirements/api.md#req-api-frame)               | ✅ egzekwowane | `apps/sandbox-e2e/src/field.spec.ts`, `req-a11y-touch`                 | test progu dotyku wychwycił regresję opisaną w `lesson-25` (select w … |
| [`req-api-native-input`](requirements/api.md#req-api-native-input) | 🟡 częściowo   | `libs/components/field/src/field-controls.spec.ts`                     | brak — świadomie: podmiana `<input>` na własny element wywraca komple… |
| [`req-api-platform`](requirements/api.md#req-api-platform)         | 🟡 częściowo   | `apps/sandbox-e2e/src/radio.spec.ts` — nawigacja klawiaturą            | brak — świadomie: test nawigacji nie ma trybu, w którym przechodzi be… |
| [`req-api-number`](requirements/api.md#req-api-number)             | ⛔ luka        | `libs/components/field/src/number.spec.ts`, `apps/sandbox-e2e/src/num… | brak — luka: testy własnościowe parsera (`parse(format(n)) === n` dla… |
| [`req-api-generic`](requirements/api.md#req-api-generic)           | ✅ egzekwowane | `libs/components/select/src/select.spec.ts`, target `typecheck` proje… | sonda z `lesson-37` — pięć celowo sprzecznych wiązań, z których czter… |
| [`req-api-parts`](requirements/api.md#req-api-parts)               | ✅ egzekwowane | `tools/check-parts.mjs` (target `check-parts` w projekcie roota, w CI… | `tools/check-parts.fixtures/` — dwadzieścia jeden wejść, każde odrzuc… |
| [`req-api-parts-unique`](requirements/api.md#req-api-parts-unique) | ✅ egzekwowane | `apps/sandbox-e2e/src/radio.spec.ts`, `apps/sandbox-e2e/src/field.spe… | kolizja z `lesson-15` i `lesson-24` jest udokumentowanym przebiegiem,… |
| [`req-api-templates`](requirements/api.md#req-api-templates)       | ⛔ luka        | brak — luka: projekcja działa (sloty obudowy), ale **`TemplateRef` ni… | brak — luka: szablon opcji podany przez konsumenta, który nie zostaje… |
| [`req-api-icons`](requirements/api.md#req-api-icons)               | ⛔ luka        | brak — luka: dziś każda ikona jest **wpisana w szablon** jako SVG w `… | brak — luka: podmiana ikony przez `PCT_ICONS`, która nie dociera do k… |
| [`req-api-icons-custom`](requirements/api.md#req-api-icons-custom) | 🟡 częściowo   | `libs/components/check-package.mjs` — brak plików ikon w spakowanym a… | brak — świadomie: naruszeniem jest **dodanie** czegoś, a nie ciche zn… |
| [`req-api-texts`](requirements/api.md#req-api-texts)               | ✅ egzekwowane | `tools/check-texts.mjs` (target `check-texts`) — sześć punktów: napis… | `tools/check-texts.fixtures/` — 29 spreparowanych wejść, każde odrzuc… |
| [`req-api-overlay`](requirements/api.md#req-api-overlay)           | ✅ egzekwowane | `apps/sandbox-e2e/src/select.spec.ts` — pomiar szerokości i przesunię… | pomiar z `lesson-35` (pole 301 px ⇒ panel 275 px, przesunięcie 13 px;… |
| [`req-api-size`](requirements/api.md#req-api-size)                 | ✅ egzekwowane | `apps/sandbox-e2e/src/size.spec.ts` — pomiar w przeglądarce            | test sprawdza równość wysokości **i jej konkretną wartość** — przy sa… |
| [`req-api-animations`](requirements/api.md#req-api-animations)     | ⛔ luka        | brak — luka: zakaz jest dotrzymany, ale **nic go nie pilnuje** — jedy… | brak — luka: import `@angular/animations` dodany do pakietu musi zapa… |

## projekt

| wymaganie                                                                      | stan           | bramka                                                                 | kontrola                                                               |
| ------------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-project-monorepo`](requirements/project.md#req-project-monorepo)         | 🟡 częściowo   | `.github/workflows/ci.yml` — cały przebieg idzie przez `nx affected`   | brak — świadomie: awaria jest natychmiastowa i całkowita (CI nie ma c… |
| [`req-project-latest`](requirements/project.md#req-project-latest)             | 🟡 częściowo   | brak — świadomie: to reguła procesu, nie właściwość artefaktu; nie ma… | nie dotyczy                                                            |
| [`req-project-dependencies`](requirements/project.md#req-project-dependencies) | ⛔ luka        | brak — luka: kontrola listy `dependencies` / `peerDependencies` w spa… | brak — luka: manifest z dopisaną zależnością spoza listy musi bramkę … |
| [`req-project-apps`](requirements/project.md#req-project-apps)                 | ⛔ luka        | brak — luka: `apps/docs` nie istnieje, więc bramka opisywałaby stan, … | brak — luka: patrz wyżej                                               |
| [`req-project-package`](requirements/project.md#req-project-package)           | ✅ egzekwowane | `libs/components/check-package.mjs` (target `check-package`, w CI) — … | `tools/check-package.fixtures/` — spreparowany pakiet na każdy punkt … |
| [`req-project-entrypoints`](requirements/project.md#req-project-entrypoints)   | ✅ egzekwowane | `libs/components/check-package.mjs` — mapa `exports` w spakowanym man… | `tools/check-package.fixtures/skorka-poza-exports/` — plik obecny w p… |
| [`req-project-core`](requirements/project.md#req-project-core)                 | 🟡 częściowo   | `libs/components/field/src/field-controls.spec.ts` — wspólna logika k… | brak — świadomie: naruszeniem jest **duplikacja**, a nie awaria; łapi… |
| [`req-project-tokens-lib`](requirements/project.md#req-project-tokens-lib)     | ✅ egzekwowane | `libs/components/project.json` → `implicitDependencies: ["tokens"]` +… | `tools/check-package.fixtures/brak-skorki/` — pakiet bez `themes/pct.… |
| [`req-project-tree-shaking`](requirements/project.md#req-project-tree-shaking) | ✅ egzekwowane | `tools/check-bundle.mjs` (target `check-bundle` w `components`, w CI)… | `tools/check-bundle.fixtures/` — 22 spreparowane wejścia, każde odrzu… |
| [`req-project-files`](requirements/project.md#req-project-files)               | ⛔ luka        | brak — luka: kontrola układu katalogu entrypointu (skrypt w duchu `ch… | brak — luka: entrypoint z szablonem inline musi bramkę zapalić         |
| [`req-project-prefix`](requirements/project.md#req-project-prefix)             | 🟡 częściowo   | `libs/components/eslint.config.mjs` — reguły `@angular-eslint/compone… | brak — świadomie: reguła ESLint zapala przy pierwszym naruszeniu i ni… |
| [`req-project-language`](requirements/project.md#req-project-language)         | ⛔ luka        | brak — luka: `tools/check-language.mjs` — dwa pomiary o różnym zasięg… | brak — luka: polski komentarz w pliku spoza rejestru musi zapalić; wp… |
| [`req-project-concise`](requirements/project.md#req-project-concise)           | ⛔ luka        | brak — luka: budżet objętości prozy per plik, snapshot z tolerancją *… | brak — luka: plik z dopisanym akapitem ponad tolerancję musi zapalić;… |
| [`req-project-angular`](requirements/project.md#req-project-angular)           | ✅ egzekwowane | `tools/check-zoneless.mjs` (target `check-zoneless`, w CI) — trzy pun… | `tools/check-zoneless.fixtures/` — spreparowane wejścia, po jednym na… |
| [`req-project-ssr`](requirements/project.md#req-project-ssr)                   | ✅ egzekwowane | `apps/sandbox-e2e/src/hydration.spec.ts` — sprawdzenie siedzi w pomoc… | `hydration.spec.ts › „bramka faktycznie wykrywa błąd hydracji (kontro… |
| [`req-project-layout`](requirements/project.md#req-project-layout)             | ⛔ luka        | brak — luka: wynika z `req-project-apps`; domknie się razem z nim      | brak — luka: patrz wyżej                                               |

## jakość

| wymaganie                                                                              | stan           | bramka                                                                 | kontrola                                                               |
| -------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-quality-negative-control`](requirements/quality.md#req-quality-negative-control) | ✅ egzekwowane | `tools/check-docs.mjs` — pole **Kontrola** jest wymagane przy każdym … | `tools/check-docs.fixtures/` — wymaganie z bramką, ale bez kontroli, … |
| [`req-quality-registry`](requirements/quality.md#req-quality-registry)                 | ✅ egzekwowane | `tools/check-docs.mjs` (target `check-docs`, w CI) — sześć kontroli o… | `tools/check-docs.fixtures/` — zestaw celowo wadliwych wymagań (bez b… |
| [`req-quality-typecheck`](requirements/quality.md#req-quality-typecheck)               | ✅ egzekwowane | `tools/check-typecheck.mjs` (target `check-typecheck`, w CI) — cztery… | `tools/check-typecheck.fixtures/` — jedenaście spreparowanych wejść, … |
| [`req-quality-unit`](requirements/quality.md#req-quality-unit)                         | ✅ egzekwowane | trzyczęściowa, bo „testy biegną", „ile ich przechodzi" i „ile wad zau… | `tools/check-mutation.fixtures/` — 37 spreparowanych wejść na udawane… |
| [`req-quality-coverage`](requirements/quality.md#req-quality-coverage)                 | ✅ egzekwowane | dwuczęściowa, bo procent i jego mianownik psują się osobno. `libs/com… | `tools/check-coverage.fixtures/` — siedem spreparowanych wejść, po je… |
| [`req-quality-e2e`](requirements/quality.md#req-quality-e2e)                           | ✅ egzekwowane | `apps/sandbox-e2e/src/visual.spec.ts` i pozostałe specyfikacje e2e     | progi są **dwa** i oba wynikają z pomiaru. Liczba pikseli jest bezwzg… |
| [`req-quality-hydration`](requirements/quality.md#req-quality-hydration)               | ✅ egzekwowane | `apps/sandbox-e2e/src/hydration.spec.ts` + pomocnik `visit()` w `apps… | `hydration.spec.ts › „bramka faktycznie wykrywa błąd hydracji (kontro… |
| [`req-quality-package`](requirements/quality.md#req-quality-package)                   | ✅ egzekwowane | `libs/components/check-package.mjs` (target `check-package`, w CI)     | `tools/check-package.fixtures/` — siedem spreparowanych pakietów, po … |
| [`req-quality-consumer`](requirements/quality.md#req-quality-consumer)                 | ✅ egzekwowane | `tools/check-consumer.mjs` (target `check-consumer`, w CI) — siedem p… | `tools/check-consumer.fixtures/` — 28 spreparowanych wejść, każde odr… |
| [`req-quality-browsers`](requirements/quality.md#req-quality-browsers)                 | ✅ egzekwowane | `apps/sandbox-e2e/playwright.config.mts` — trzy projekty (chromium, f… | `tools/check-browsers.fixtures/` — 25 spreparowanych wejść, każde odr… |
| [`req-quality-views`](requirements/quality.md#req-quality-views)                       | ✅ egzekwowane | `apps/sandbox-e2e/src/a11y.spec.ts`, `hydration.spec.ts` — obie iteru… | `apps/sandbox/src/app/app.spec.ts` — rejestr widoków wobec tras        |
| [`req-quality-card`](requirements/quality.md#req-quality-card)                         | ✅ egzekwowane | `apps/sandbox/src/app/ui/demo.spec.ts`; `tools/check-docs.mjs` — każd… | `tools/check-docs.fixtures/` — karta z nieistniejącym identyfikatorem… |
| [`req-quality-stage`](requirements/quality.md#req-quality-stage)                       | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/shell.spe… | `preferences.spec.ts › „bez preferencji ciemnej :root zostaje jasny (… |
| [`req-quality-prefix`](requirements/quality.md#req-quality-prefix)                     | 🟡 częściowo   | `apps/sandbox/eslint.config.mjs` — reguły selektorów z prefiksami      | brak — świadomie: reguła ESLint nie ma trybu cichego przejścia         |

## wydanie

| wymaganie                                                              | stan           | bramka                                                                 | kontrola                                                               |
| ---------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-release-semver`](requirements/release.md#req-release-semver)     | ✅ egzekwowane | `libs/components/check-package.mjs` (punkt 4: `PCT_VERSION` == `versi… | `stamp-version` **nie jest** zależnością `build` — gdyby był, artefak… |
| [`req-release-ng-add`](requirements/release.md#req-release-ng-add)     | ✅ egzekwowane | `libs/components/check-package.mjs` (punkt 5) — kolekcje są w pakieci… | `tools/check-package.fixtures/brak-schematica/` — pakiet, w którym ko… |
| [`req-release-metadata`](requirements/release.md#req-release-metadata) | ✅ egzekwowane | `libs/components/check-package.mjs` (punkt 6) — dwie różne surowości,… | `tools/check-package.fixtures/brak-repository/` — manifest bez `repos… |
| [`req-release-support`](requirements/release.md#req-release-support)   | ⛔ luka        | brak — luka: dokumentu nie ma. Kolekcja migracji istnieje (`req-relea… | brak — luka: commit `feat!:` bez wpisu w kolekcji migracji musi zapal… |

## tokeny

| wymaganie                                                                 | stan           | bramka                                                                 | kontrola                                                               |
| ------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`req-token-dtcg`](requirements/tokens.md#req-token-dtcg)                 | 🟡 częściowo   | `libs/tokens/build.mjs` — build nie ruszy przy niepoprawnym kształcie… | brak — świadomie: błąd parsowania jest natychmiastowy i głośny         |
| [`req-token-artifacts`](requirements/tokens.md#req-token-artifacts)       | ✅ egzekwowane | target `typecheck` projektu `sandbox-e2e` — pomocniki `tokenOf` / `ro… | podmiana jednej nazwy na błędną daje 6 błędów typu — przebieg udokume… |
| [`req-token-tiers`](requirements/tokens.md#req-token-tiers)               | ✅ egzekwowane | `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w … | `tools/check-tokens.fixtures/` — po jednym wejściu na regułę: `kolor-… |
| [`req-token-references`](requirements/tokens.md#req-token-references)     | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts` — nadpisanie tokenu semantyczneg… | test porównuje token komponentowy w `:root` **i** w scope — sam token… |
| [`req-token-closure`](requirements/tokens.md#req-token-closure)           | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts` — token **komponentowy** porówny… | przebieg z `lesson-17`: przed poprawką `--pct-surface` był poprawnie … |
| [`req-token-names`](requirements/tokens.md#req-token-names)               | ✅ egzekwowane | `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w … | `tools/check-tokens.fixtures/` — jedenaście wejść, każde odrzucane na… |
| [`req-token-text-pairs`](requirements/tokens.md#req-token-text-pairs)     | ✅ egzekwowane | `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w … | `tools/check-tokens.fixtures/` — `kolor-niezmierzony` (arkusz maluje … |
| [`req-token-contrast`](requirements/tokens.md#req-token-contrast)         | ✅ egzekwowane | `libs/tokens/build.mjs` (target `tokens:build`, w CI przez `^build`);… | przebieg z `lesson-6`: pierwotny guard przepuścił `disabled` o realny… |
| [`req-token-no-opacity`](requirements/tokens.md#req-token-no-opacity)     | ✅ egzekwowane | `tools/check-styles.mjs` (target `check-styles`, w CI) — punkt 6: `op… | `tools/check-styles.fixtures/opacity-czesciowa/` (stan wyrażony przez… |
| [`req-token-css`](requirements/tokens.md#req-token-css)                   | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts`, `libs/components/check-package.… | `tools/check-package.fixtures/token-bez-deklaracji/` — pakiet, w któr… |
| [`req-token-scss`](requirements/tokens.md#req-token-scss)                 | 🟡 częściowo   | brak — świadomie: rozszerzenie pliku jest widoczne w review, a arkusz… | nie dotyczy ---                                                        |
| [`req-token-override`](requirements/tokens.md#req-token-override)         | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts`                                   | jak w `req-token-closure` — porównanie tokenu komponentowego, nie sem… |
| [`req-token-scoped`](requirements/tokens.md#req-token-scoped)             | ✅ egzekwowane | `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/a11y.spec… | patrz `req-token-closure`                                              |
| [`req-token-directive`](requirements/tokens.md#req-token-directive)       | ⛔ luka        | brak — luka: dyrektywy nie ma, motyw ustawia się ręcznym `data-theme`  | brak — luka: motyw ustawiony dyrektywą i motyw ustawiony atrybutem mu… |
| [`req-token-system`](requirements/tokens.md#req-token-system)             | ✅ egzekwowane | `apps/sandbox-e2e/src/preferences.spec.ts`                             | `preferences.spec.ts › „bez preferencji ciemnej :root zostaje jasny (… |
| [`req-token-skin`](requirements/tokens.md#req-token-skin)                 | ✅ egzekwowane | `libs/tokens/build.mjs` — ale **wyłącznie dla skórki wbudowanej**      | patrz `req-token-contrast`                                             |
| [`req-token-distribution`](requirements/tokens.md#req-token-distribution) | ✅ egzekwowane | `libs/components/check-package.mjs` — punkty 1 i 2: skórka jest w pak… | `tools/check-package.fixtures/brak-skorki/` — pakiet bez skórki musi … |
| [`req-token-density`](requirements/tokens.md#req-token-density)           | ⛔ luka        | brak — luka: w źródłach DTCG nie ma **ani jednego** tokenu gęstości    | brak — luka: układ z tokenem gęstości `compact` musi przejść próg obs… |
| [`req-token-logical`](requirements/tokens.md#req-token-logical)           | ✅ egzekwowane | `tools/check-styles.mjs` (target `check-styles`, w CI) — punkt 5: zak… | `tools/check-styles.fixtures/padding-fizyczny/` (nazwa właściwości) i… |

## Indeks odwrotny — lekcja → wymagania

Która lekcja karmi które wymaganie. Generowane z pól **Lekcje**.

| lekcja                              | wymagania          |
| ----------------------------------- | ------------------ |
| [`lesson-1`](lessons.md#lesson-1)   | — _(nie cytowana)_ |
| [`lesson-2`](lessons.md#lesson-2)   | — _(nie cytowana)_ |
| [`lesson-3`](lessons.md#lesson-3)   | — _(nie cytowana)_ |
| [`lesson-4`](lessons.md#lesson-4)   | — _(nie cytowana)_ |
| [`lesson-5`](lessons.md#lesson-5)   | — _(nie cytowana)_ |
| [`lesson-6`](lessons.md#lesson-6)   | — _(nie cytowana)_ |
| [`lesson-7`](lessons.md#lesson-7)   | — _(nie cytowana)_ |
| [`lesson-8`](lessons.md#lesson-8)   | — _(nie cytowana)_ |
| [`lesson-9`](lessons.md#lesson-9)   | — _(nie cytowana)_ |
| [`lesson-10`](lessons.md#lesson-10) | — _(nie cytowana)_ |
| [`lesson-11`](lessons.md#lesson-11) | — _(nie cytowana)_ |
| [`lesson-12`](lessons.md#lesson-12) | — _(nie cytowana)_ |
| [`lesson-13`](lessons.md#lesson-13) | — _(nie cytowana)_ |
| [`lesson-14`](lessons.md#lesson-14) | — _(nie cytowana)_ |
| [`lesson-15`](lessons.md#lesson-15) | — _(nie cytowana)_ |
| [`lesson-16`](lessons.md#lesson-16) | — _(nie cytowana)_ |
| [`lesson-17`](lessons.md#lesson-17) | — _(nie cytowana)_ |
| [`lesson-18`](lessons.md#lesson-18) | — _(nie cytowana)_ |
| [`lesson-19`](lessons.md#lesson-19) | — _(nie cytowana)_ |
| [`lesson-20`](lessons.md#lesson-20) | — _(nie cytowana)_ |
| [`lesson-21`](lessons.md#lesson-21) | — _(nie cytowana)_ |
| [`lesson-22`](lessons.md#lesson-22) | — _(nie cytowana)_ |
| [`lesson-23`](lessons.md#lesson-23) | — _(nie cytowana)_ |
| [`lesson-24`](lessons.md#lesson-24) | — _(nie cytowana)_ |
| [`lesson-25`](lessons.md#lesson-25) | — _(nie cytowana)_ |
| [`lesson-26`](lessons.md#lesson-26) | — _(nie cytowana)_ |
| [`lesson-27`](lessons.md#lesson-27) | — _(nie cytowana)_ |
| [`lesson-28`](lessons.md#lesson-28) | — _(nie cytowana)_ |
| [`lesson-29`](lessons.md#lesson-29) | — _(nie cytowana)_ |
| [`lesson-30`](lessons.md#lesson-30) | — _(nie cytowana)_ |
| [`lesson-31`](lessons.md#lesson-31) | — _(nie cytowana)_ |
| [`lesson-32`](lessons.md#lesson-32) | — _(nie cytowana)_ |
| [`lesson-33`](lessons.md#lesson-33) | — _(nie cytowana)_ |
| [`lesson-34`](lessons.md#lesson-34) | — _(nie cytowana)_ |
| [`lesson-35`](lessons.md#lesson-35) | — _(nie cytowana)_ |
| [`lesson-36`](lessons.md#lesson-36) | — _(nie cytowana)_ |
| [`lesson-37`](lessons.md#lesson-37) | — _(nie cytowana)_ |
| [`lesson-38`](lessons.md#lesson-38) | — _(nie cytowana)_ |
| [`lesson-39`](lessons.md#lesson-39) | — _(nie cytowana)_ |
| [`lesson-40`](lessons.md#lesson-40) | — _(nie cytowana)_ |
| [`lesson-41`](lessons.md#lesson-41) | — _(nie cytowana)_ |
| [`lesson-42`](lessons.md#lesson-42) | — _(nie cytowana)_ |
| [`lesson-43`](lessons.md#lesson-43) | — _(nie cytowana)_ |
| [`lesson-44`](lessons.md#lesson-44) | — _(nie cytowana)_ |
| [`lesson-45`](lessons.md#lesson-45) | — _(nie cytowana)_ |
| [`lesson-46`](lessons.md#lesson-46) | — _(nie cytowana)_ |
| [`lesson-47`](lessons.md#lesson-47) | — _(nie cytowana)_ |
| [`lesson-48`](lessons.md#lesson-48) | — _(nie cytowana)_ |
| [`lesson-49`](lessons.md#lesson-49) | — _(nie cytowana)_ |
| [`lesson-50`](lessons.md#lesson-50) | — _(nie cytowana)_ |
| [`lesson-51`](lessons.md#lesson-51) | — _(nie cytowana)_ |
| [`lesson-52`](lessons.md#lesson-52) | — _(nie cytowana)_ |
| [`lesson-53`](lessons.md#lesson-53) | — _(nie cytowana)_ |
| [`lesson-54`](lessons.md#lesson-54) | — _(nie cytowana)_ |
| [`lesson-55`](lessons.md#lesson-55) | — _(nie cytowana)_ |
| [`lesson-56`](lessons.md#lesson-56) | — _(nie cytowana)_ |
| [`lesson-57`](lessons.md#lesson-57) | — _(nie cytowana)_ |
| [`lesson-58`](lessons.md#lesson-58) | — _(nie cytowana)_ |
| [`lesson-59`](lessons.md#lesson-59) | — _(nie cytowana)_ |
