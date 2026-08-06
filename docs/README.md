# Dokumentacja `@pacit/components`

Dokumentacja robocza projektu. **Docelowo w całości po angielsku** —
[`req-project-language`](requirements/project.md#req-project-language); dziś jeszcze po polsku
i to jest stan przejściowy, a nie reguła.

Wcześniejszy podział („robocze po polsku, powierzchnia publiczna po angielsku") obowiązywał
jako proza bez bramki i nie był dotrzymany po żadnej ze stron: `description` pakietu jest
po polsku, publiczny JSDoc też, a przy okazji cytuje wewnętrzne identyfikatory
dokumentacji. Kolejność zdejmowania polszczyzny warstwa po warstwie trzyma
[sekcja H planu](plan.md#h-jeden-język-repozytorium).

## Mapa

```
00-axis.md      POZIOM 0   jedno wymaganie, z którego wynika kolejność wszystkich innych
requirements/   POZIOM 1   obietnice: co ma być prawdą                (83 pozycje)
decisions/      POZIOM 2   dlaczego akurat tak i co przez to tracimy  (15 ADR-ów)
components/     POZIOM 3   czy ten konkretny komponent to spełnia     (wypełniony DoD)
lessons.md                 baza dowodowa: co się naprawdę stało       (59 wpisów)
registry.md                GENEROWANY: obietnica → bramka → kontrola → stan
review.md                  datowana migawka zewnętrznego przeglądu
plan.md                    lista zadań i dziennik prac — jedyne miejsce ze stanem „zrobione"
```

Kierunek czytania jest odwrotny do kierunku pisania: **wymagania powstają z lekcji.**

| chcę…                                            | zacznij od                                                   |
| ------------------------------------------------ | ------------------------------------------------------------ |
| zrozumieć, na czym ta biblioteka wygrywa         | [`00-axis.md`](00-axis.md)                                   |
| dopisać komponent                                | [`components/_template.md`](components/_template.md)         |
| zrozumieć, dlaczego coś jest zrobione akurat tak | [`decisions/`](decisions/)                                   |
| sprawdzić, czego jeszcze nie ma                  | [`registry.md`](registry.md) — **nie** czytaj tego z wymagań |
| wiedzieć, co robić dalej i co już zrobiono       | [`plan.md`](plan.md)                                         |
| dowiedzieć się, co poszło nie tak w przeszłości  | [`lessons.md`](lessons.md)                                   |

### Poziom 1 — wymagania

| plik                                                 | obszar          | co obejmuje                                 |
| ---------------------------------------------------- | --------------- | ------------------------------------------- |
| [`requirements/project.md`](requirements/project.md) | `req-project-*` | monorepo, zależności, stack, layout, pakiet |
| [`requirements/api.md`](requirements/api.md)         | `req-api-*`     | kontrakt widziany przez konsumenta          |
| [`requirements/a11y.md`](requirements/a11y.md)       | `req-a11y-*`    | dostępność                                  |
| [`requirements/tokens.md`](requirements/tokens.md)   | `req-token-*`   | tokeny, stylowanie, motywy                  |
| [`requirements/quality.md`](requirements/quality.md) | `req-quality-*` | testy, sandbox, bramki, rejestr             |
| [`requirements/release.md`](requirements/release.md) | `req-release-*` | wersjonowanie, publikacja, wsparcie         |

---

## Kształt wymagania

Każde wymaganie ma **stały, parsowalny** kształt. Normatywna jest wyłącznie **Obietnica** —
reszta to komentarz i metadane.

```markdown
### <a id="req-api-wrapper"></a>`req-api-wrapper` — Kontrolki formularza to obudowa + kontrolka

**Obietnica.** Jedno–dwa zdania. Sprawdzalne.

**Bramka:** `ścieżka/do/testu.ts`, `inna/ścieżka.mjs`
**Kontrola:** `plik.spec.ts › „nazwa testu"` albo opis przebiegu
**Decyzja:** [0003 — …](decisions/0003-wrapper-and-control.md)
**Lekcje:** [`lesson-21`](lessons.md#lesson-21)
```

### Pola `Bramka` i `Kontrola`

Oba są **obowiązkowe**. Każde przyjmuje albo listę ścieżek, albo jedną z dwóch jawnych form
braku:

| zapis                             | znaczenie                                                 | stan w rejestrze         |
| --------------------------------- | --------------------------------------------------------- | ------------------------ |
| `` `ścieżka/…` ``                 | maszyna, która na tej obietnicy zapala                    | **egzekwowane**          |
| `brak — świadomie: <powód>`       | bramki **nigdy nie będzie**, i to jest w porządku         | **świadomie bez bramki** |
| `brak — luka: <co trzeba>`        | bramki **jeszcze** nie ma; wymagany też `**Wiąże przy:**` | **luka**                 |
| cokolwiek innego (albo brak pola) | —                                                         | **BŁĄD CI**              |

**Nie ma stanu „zrealizowane, tylko niesprawdzone".** To jest najostrzejsza konsekwencja
[`req-axis`](00-axis.md): jeśli nic nie potwierdza obietnicy, to nie ma znaczenia, czy jest
niezbudowana, czy zbudowana i niezmierzona — w obu przypadkach **nie wiemy**. Dlatego jedna
kategoria (`luka`) pokrywa oba.

Wcześniej rozróżniały je ręczne adnotacje `_(niezrealizowane)_` i `_(częściowo)_`. Było ich
18, dopisano je jednym commitem po fakcie i utrzymywała je wyłącznie czyjaś pamięć.

---

## Identyfikatory

### Dlaczego slugi, a nie numery

Reguła jest jedna:

> **Numer jest dobrym identyfikatorem tam, gdzie kolejność coś znaczy.**

- W [logu lekcji](lessons.md) **znaczy** — log jest chronologiczny i append-only, wstawek
  nie ma. Numery zostają.
- W wymaganiach **nie znaczyła nic** — i dlatego się rozjechała. Kolejność `req-api-*`
  w pliku wyglądała pod koniec tak: `1,2,3,4,5,` **`13,14,15,`** `10,11,12,16,17,18,19,`
  **`6,7,8,`** `20,21,` **`9`**.

Numer, który nie mówi nic o pozycji, **jest nazwą** — tylko nieinformującą. Do tego
`wym-api-31` (przestawione cyfry) wygląda wiarygodnie, a przy 161 cytowaniach w kodzie nic
takiej literówki nie łapało.

Uzasadnienie nie jest zapożyczone: [`req-token-names`](requirements/tokens.md#req-token-names)
żąda, żeby **token dało się zgadnąć bez dokumentacji**. Identyfikator wymagania podlega tej
samej regule.

### Zasady

- **ID nie zmienia się z powodu zmiany sensu.** Gdy sens się zmienia, powstaje **nowe**
  wymaganie, a stare dostaje `zastąpione przez`. Slug jest nazwą, nie streszczeniem.
- Kształt: `req-<obszar>-<slug>`, slug 1–2 słowa, ASCII bez znaków diakrytycznych.
- Lekcje: `lesson-<numer>`, numer kolejny wolny.
- Decyzje: `<NNNN>` chronologicznie.

### Migracja przestrzeni ID (2026-08-06)

Cała przestrzeń przeszła na angielską razem z resztą repozytorium
([`req-project-language`](requirements/project.md#req-project-language), zadanie
[H1](plan.md#h-jeden-język-repozytorium)). Reguła wyżej mówi o **sensie**, nie o pisowni,
więc tego wyjątku nie obejmuje — i jest to wyjątek jeden, datowany i ostatni. Stare
identyfikatory są od tej daty **odrzucane przez bramkę** tak samo jak numeryczne z 2026-07-27.

Prefiksy, katalogi i pliki:

| stare         | nowe          | stare         | nowe            |
| ------------- | ------------- | ------------- | --------------- |
| `wym-`        | `req-`        | `wymagania/`  | `requirements/` |
| `lekcja-`     | `lesson-`     | `decyzje/`    | `decisions/`    |
| `wym-projekt` | `req-project` | `komponenty/` | `components/`   |
| `wym-jakosc`  | `req-quality` | `lekcje.md`   | `lessons.md`    |
| `wym-wydanie` | `req-release` | `rejestr.md`  | `registry.md`   |
| `wym-token`   | `req-token`   | `00-os.md`    | `00-axis.md`    |
| `wym-api`     | `req-api`     | `opis.md`     | `overview.md`   |
| `wym-a11y`    | `req-a11y`    | `tokeny.md`   | `tokens.md`     |
| `wym-os`      | `req-axis`    | `_szablon.md` | `_template.md`  |

Pliki wymagań: `projekt.md` → `project.md`, `jakosc.md` → `quality.md`,
`tokeny.md` → `tokens.md`, `wydanie.md` → `release.md`. Nazwy decyzji przeszły razem
z plikami (`0014-teksty-jako-sygnal.md` → `0014-texts-as-signal.md`), a generowana unia
ID mieszka teraz w `apps/sandbox/src/app/ui/doc-ids.ts` — dawne `req-ids.ts` samo wyglądało
dla bramki jak cytowanie wymagania.

Pełne odwzorowanie identyfikatorów:

| stare                       | nowe                           |     | stare                      | nowe                       |
| --------------------------- | ------------------------------ | --- | -------------------------- | -------------------------- |
| `wym-a11y-axe`              | `req-a11y-axe`                 |     | `wym-jakosc-widoki`        | `req-quality-views`        |
| `wym-a11y-dotyk`            | `req-a11y-touch`               |     | `wym-os`                   | `req-axis`                 |
| `wym-a11y-kolory-wymuszone` | `req-a11y-forced-colors`       |     | `wym-projekt-angular`      | `req-project-angular`      |
| `wym-a11y-ruch`             | `req-a11y-motion`              |     | `wym-projekt-aplikacje`    | `req-project-apps`         |
| `wym-a11y-wbudowana`        | `req-a11y-built-in`            |     | `wym-projekt-core`         | `req-project-core`         |
| `wym-a11y-wcag`             | `req-a11y-wcag`                |     | `wym-projekt-entrypointy`  | `req-project-entrypoints`  |
| `wym-api-animacje`          | `req-api-animations`           |     | `wym-projekt-jezyk`        | `req-project-language`     |
| `wym-api-atrybuty`          | `req-api-attributes`           |     | `wym-projekt-layout`       | `req-project-layout`       |
| `wym-api-bez-obudowy`       | `req-api-no-wrapper`           |     | `wym-projekt-lib-tokenow`  | `req-project-tokens-lib`   |
| `wym-api-czesci`            | `req-api-parts`                |     | `wym-projekt-monorepo`     | `req-project-monorepo`     |
| `wym-api-czesci-unikalne`   | `req-api-parts-unique`         |     | `wym-projekt-najnowsze`    | `req-project-latest`       |
| `wym-api-fundament`         | `req-api-foundation`           |     | `wym-projekt-pakiet`       | `req-project-package`      |
| `wym-api-generyk`           | `req-api-generic`              |     | `wym-projekt-pliki`        | `req-project-files`        |
| `wym-api-ikony`             | `req-api-icons`                |     | `wym-projekt-prefiks`      | `req-project-prefix`       |
| `wym-api-ikony-wlasne`      | `req-api-icons-custom`         |     | `wym-projekt-ssr`          | `req-project-ssr`          |
| `wym-api-konfiguracja`      | `req-api-config`               |     | `wym-projekt-tree-shaking` | `req-project-tree-shaking` |
| `wym-api-kontener`          | `req-api-container`            |     | `wym-projekt-zaleznosci`   | `req-project-dependencies` |
| `wym-api-liczba`            | `req-api-number`               |     | `wym-projekt-zwiezlosc`    | `req-project-concise`      |
| `wym-api-nakladka`          | `req-api-overlay`              |     | `wym-token-artefakty`      | `req-token-artifacts`      |
| `wym-api-natywne-pole`      | `req-api-native-input`         |     | `wym-token-bez-opacity`    | `req-token-no-opacity`     |
| `wym-api-nazwy`             | `req-api-names`                |     | `wym-token-css`            | `req-token-css`            |
| `wym-api-obudowa`           | `req-api-wrapper`              |     | `wym-token-domkniecie`     | `req-token-closure`        |
| `wym-api-platforma`         | `req-api-platform`             |     | `wym-token-dtcg`           | `req-token-dtcg`           |
| `wym-api-ramka`             | `req-api-frame`                |     | `wym-token-dyrektywa`      | `req-token-directive`      |
| `wym-api-signal-forms`      | `req-api-signal-forms`         |     | `wym-token-dystrybucja`    | `req-token-distribution`   |
| `wym-api-sygnaly`           | `req-api-signals`              |     | `wym-token-gestosc`        | `req-token-density`        |
| `wym-api-szablony`          | `req-api-templates`            |     | `wym-token-kontrast`       | `req-token-contrast`       |
| `wym-api-teksty`            | `req-api-texts`                |     | `wym-token-logiczne`       | `req-token-logical`        |
| `wym-api-wielkosc`          | `req-api-size`                 |     | `wym-token-nadpisanie`     | `req-token-override`       |
| `wym-jakosc-e2e`            | `req-quality-e2e`              |     | `wym-token-nazwy`          | `req-token-names`          |
| `wym-jakosc-hydracja`       | `req-quality-hydration`        |     | `wym-token-pary-tekstu`    | `req-token-text-pairs`     |
| `wym-jakosc-jednostkowe`    | `req-quality-unit`             |     | `wym-token-poziomy`        | `req-token-tiers`          |
| `wym-jakosc-karta`          | `req-quality-card`             |     | `wym-token-referencje`     | `req-token-references`     |
| `wym-jakosc-konsument`      | `req-quality-consumer`         |     | `wym-token-scoped`         | `req-token-scoped`         |
| `wym-jakosc-kontrola`       | `req-quality-negative-control` |     | `wym-token-scss`           | `req-token-scss`           |
| `wym-jakosc-pakiet`         | `req-quality-package`          |     | `wym-token-skorka`         | `req-token-skin`           |
| `wym-jakosc-pokrycie`       | `req-quality-coverage`         |     | `wym-token-system`         | `req-token-system`         |
| `wym-jakosc-prefiks`        | `req-quality-prefix`           |     | `wym-wydanie-metadane`     | `req-release-metadata`     |
| `wym-jakosc-przegladarki`   | `req-quality-browsers`         |     | `wym-wydanie-ng-add`       | `req-release-ng-add`       |
| `wym-jakosc-rejestr`        | `req-quality-registry`         |     | `wym-wydanie-semver`       | `req-release-semver`       |
| `wym-jakosc-scena`          | `req-quality-stage`            |     | `wym-wydanie-wsparcie`     | `req-release-support`      |
| `wym-jakosc-typecheck`      | `req-quality-typecheck`        |     |                            |                            |

--------------- | --------------- | ------------- | --------------- |
| `wym-` | `req-` | `requirements/` | `requirements/` |
| `lekcja-` | `lesson-` | `decisions/` | `decisions/` |
| `req-project-*` | `req-project-*` | `components/` | `components/` |
| `req-quality-*` | `req-quality-*` | `lessons.md` | `lessons.md` |
| `req-release-*` | `req-release-*` | `registry.md` | `registry.md` |
| `req-token-*` | `req-token-*` | `00-axis.md` | `00-axis.md` |
| `req-api-*` | `req-api-*` | `overview.md` | `overview.md` |
| `req-a11y-*` | `req-a11y-*` | `tokeny.md` | `tokens.md` |
| `req-axis` | `req-axis` | `_template.md` | `_template.md` |

Slugi poszczególnych wymagań tłumaczą się wprost (`req-token-text-pairs` →
`req-token-text-pairs`); nazwy decyzji idą razem z plikami
(`0014-texts-as-signal.md` → `0014-texts-as-signal.md`).

### Typowanie po stronie kodu

Identyfikatory są **generowane do unii TypeScriptu** (`PctReqId`), a karta sandboxa
przyjmuje `[reqs]="PctReqId[]"` zamiast `string[]`. Literówka w cytowaniu jest **błędem
kompilacji**, a nie chipem prowadzącym donikąd.

To ten sam ruch co `PctCssVar` w [`lesson-43`](lessons.md#lesson-43), zastosowany do drugiej
klasy nazw.

---

## Bramka dokumentacji

`tools/check-docs.mjs`, target `check-docs`, w CI. Idiom jak `check-package.mjs`:
numerowane kontrole, nagłówek wyjaśniający **po co skrypt istnieje**, `exit 1` przy
naruszeniu.

Sprawdza sześć rzeczy:

1. **Kompletność.** Każde wymaganie ma `Obietnica`, `Bramka` i `Kontrola`; każde `brak —
luka` ma też `Wiąże przy`.
2. **Istnienie.** Każda ścieżka cytowana w `Bramka` / `Kontrola` istnieje na dysku
   (wzorce glob muszą mieć co najmniej jedno trafienie).
3. **Wpięcie w CI.** Wskazany target faktycznie biegnie w `nx affected -t …`
   z `ci.yml` — albo jest jego zależnością. To ta sama kontrola co punkt 5
   w `check-package.mjs`, gdzie sprawdzamy, że fabryka schematica wskazuje na skompilowany
   plik, a nie na TS sprzed builda.
4. **Brak wiszących cytowań.** Każde `wym-*` / `lekcja-*` użyte **gdziekolwiek w repo**
   rozwiązuje się do istniejącej pozycji, a stare ID numeryczne są odrzucane.
5. **Świeżość rejestru.** `registry.md` na dysku jest równy świeżo wygenerowanemu.
6. **Kontrola odniesienia.** Zestaw celowo wadliwych wymagań w `tools/check-docs.fixtures/`
   — **każde** musi zostać odrzucone.

Punkt 6 nie jest ozdobnikiem. Rejestr jest bramką, więc podlega
[`req-quality-negative-control`](requirements/quality.md#req-quality-negative-control) tak samo jak każda inna.
Bez niego byłby dokładnie tym, co opisuje [`lesson-39`](lessons.md#lesson-39): bramką
urodzoną martwą.

---

## Migracja identyfikatorów (2026-07-27)

Historyczna. Stare ID żyją w commitach, PR-ach i w [`review.md`](review.md) — ta tabela
pozwala je rozwiązać. **Nowego kodu nie wolno nimi cytować**; bramka je odrzuca.

| stare          | nowe                                       |     | stare         | nowe                           |
| -------------- | ------------------------------------------ | --- | ------------- | ------------------------------ |
| `wym-proj-0`   | `req-axis`                                 |     | `wym-api-9`   | `req-api-animations`           |
| `wym-proj-1`   | `req-project-monorepo`                     |     | `wym-api-10`  | `req-api-container`            |
| `wym-proj-2`   | `req-project-latest`                       |     | `wym-api-11`  | `req-api-platform`             |
| `wym-proj-3`   | `req-project-dependencies`                 |     | `wym-api-12`  | `req-api-parts-unique`         |
| `wym-proj-4`   | `req-quality-coverage`                     |     | `wym-api-13`  | `req-api-wrapper`              |
| `wym-proj-5`   | `req-project-apps`                         |     | `wym-api-14`  | `req-api-no-wrapper`           |
| `wym-proj-6`   | `req-quality-registry`                     |     | `wym-api-15`  | `req-api-native-input`         |
| `wym-tech-1`   | `req-project-package`                      |     | `wym-api-16`  | `req-api-frame`                |
| `wym-tech-2`   | `req-project-prefix`                       |     | `wym-api-17`  | `req-api-number`               |
| `wym-tech-3`   | `req-project-angular`                      |     | `wym-api-18`  | `req-api-size`                 |
| `wym-tech-4`   | `req-project-ssr`                          |     | `wym-api-19`  | `req-api-overlay`              |
| `wym-ws-1`     | `req-project-layout`                       |     | `wym-api-20`  | `req-api-generic`              |
| `wym-ws-2`     | `req-project-entrypoints`                  |     | `wym-api-21`  | `req-api-texts`                |
| `wym-ws-3`     | `req-project-core`                         |     | `wym-a11y-1`  | `req-a11y-wcag`                |
| `wym-ws-4`     | `req-project-tokens-lib`                   |     | `wym-a11y-2`  | `req-a11y-touch`               |
| `wym-ws-5`     | `req-project-tree-shaking`                 |     | `wym-a11y-3`  | `req-a11y-axe`                 |
| `wym-ws-6`     | `req-project-files`                        |     | `wym-a11y-4`  | `req-quality-negative-control` |
| `wym-sbx-1`    | `req-quality-views`                        |     | `wym-a11y-5`  | `req-a11y-motion`              |
| `wym-sbx-2`    | `req-quality-card`                         |     | `wym-a11y-6`  | `req-a11y-forced-colors`       |
| `wym-sbx-3`    | `req-quality-stage`                        |     | `wym-a11y-7`  | `req-quality-hydration`        |
| `wym-sbx-4`    | `req-quality-prefix`                       |     | `wym-styl-1`  | `req-token-css`                |
| `wym-api-1`    | `req-api-names`                            |     | `wym-styl-2`  | `req-token-scss`               |
| `wym-api-2`    | `req-api-foundation`                       |     | `wym-theme-1` | `req-token-css`                |
| `wym-api-3`    | `req-api-signals`                          |     | `wym-theme-2` | `req-token-tiers`              |
| `wym-api-4`    | `req-api-attributes`                       |     | `wym-theme-3` | `req-token-override`           |
| `wym-api-5`    | `req-api-signal-forms`                     |     | `wym-theme-4` | `req-token-scoped`             |
| `wym-api-6`    | `req-a11y-built-in`                        |     | `wym-theme-5` | `req-token-skin`               |
| `wym-api-7`    | `req-api-templates`                        |     | `wym-theme-6` | `req-token-system`             |
| `wym-api-8`    | `req-api-config`                           |     | `wym-ikon-1`  | `req-api-icons-custom`         |
| `wym-token-1`  | `req-token-dtcg`                           |     | `wym-ikon-2`  | `req-api-icons`                |
| `wym-token-2`  | `req-token-artifacts`                      |     | `wym-test-1`  | `req-quality-unit`             |
| `wym-token-3`  | `req-token-tiers`                          |     | `wym-test-2`  | `req-quality-e2e`              |
| `wym-token-4`  | `req-token-references`                     |     | `wym-wer-1`   | `req-release-semver`           |
| `wym-token-5`  | `req-token-names`                          |     | `wym-wer-2`   | `req-release-ng-add`           |
| `wym-token-6`  | `req-token-text-pairs`                     |     | `wym-real-N`  | `lekcja-N`                     |
| `wym-token-7`  | `req-api-parts`                            |     |               |                                |
| `wym-token-8`  | `req-token-density`                        |     |               |                                |
| `wym-token-9`  | `req-token-scoped` + `req-token-directive` |     |               |                                |
| `wym-token-10` | `req-token-distribution`                   |     |               |                                |
| `wym-token-11` | `req-token-contrast`                       |     |               |                                |
| `wym-token-12` | `req-token-no-opacity`                     |     |               |                                |
| `wym-token-13` | `req-token-closure`                        |     |               |                                |

### Co się zmieniło poza numeracją

- **`wym-real-*` przestały być wymaganiami.** 43 lekcje to baza dowodowa, nie obietnice —
  nie mają bramek i nie da się ich „zrealizować". Wspólny prefiks był jedynym powodem, dla
  którego mieszały się z listą wymagań.
- **Trzy pary zdublowanych wymagań scalono:** `wym-styl-1` ≈ `wym-theme-1`,
  `wym-theme-2` ≈ `wym-token-3`, `wym-theme-4` ≈ `wym-token-9` (część o scoped theme).
- **`wym-token-9` rozdzielono** na mechanizm (`req-token-scoped`) i dyrektywę-cukier
  (`req-token-directive`) — bo pierwsze działa, a drugiego nie ma.
- **`wym-token-7` przeniesiono do obszaru `api`** jako `req-api-parts`: kontrakt
  `data-pct-part` jest publicznym API stylowania, nie tokenem.
- **Dopisano 9 wymagań**, których wcześniej nie było, mimo że obietnice już obowiązywały:
  `req-quality-package`, `req-quality-typecheck`, `req-quality-consumer`,
  `req-quality-browsers`, `req-token-logical`, `req-release-metadata`,
  `req-release-support`, `req-token-directive`, `req-api-icons-custom`.
- **Usunięto sekcję „Czego jeszcze nie ma"** — była ręczną kopią informacji obecnej wyżej.
  Zastępuje ją [`registry.md`](registry.md), generowany.
- **Usunięto sekcję „Jak czytać ten dokument"** — istniała, bo wymagania dawały się czytać
  jako opis stanu kodu. Po rozdzieleniu obietnicy od stanu nie ma czego wyjaśniać.
