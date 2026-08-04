# Dokumentacja `@pacit/components`

Dokumentacja robocza projektu. Po polsku — tutaj się myśli, a myśli się we własnym języku.
Powierzchnia publiczna (README pakietu, JSDoc, CHANGELOG, komunikaty widoczne dla
konsumenta) jest po angielsku i to jest osobna reguła.

## Mapa

```
00-os.md          POZIOM 0   jedno wymaganie, z którego wynika kolejność wszystkich innych
wymagania/        POZIOM 1   obietnice: co ma być prawdą           (~80 pozycji)
decyzje/          POZIOM 2   dlaczego akurat tak i co przez to tracimy  (12 ADR-ów)
komponenty/       POZIOM 3   czy ten konkretny komponent to spełnia (wypełniony DoD)
lekcje.md                    baza dowodowa: co się naprawdę stało   (43 wpisy)
rejestr.md                   GENEROWANY: obietnica → bramka → kontrola → stan
review.md                    datowana migawka zewnętrznego przeglądu
plan.md                      lista zadań i dziennik prac — jedyne miejsce ze stanem „zrobione"
```

Kierunek czytania jest odwrotny do kierunku pisania: **wymagania powstają z lekcji.**

| chcę…                                            | zacznij od                                                 |
| ------------------------------------------------ | ---------------------------------------------------------- |
| zrozumieć, na czym ta biblioteka wygrywa         | [`00-os.md`](00-os.md)                                     |
| dopisać komponent                                | [`komponenty/_szablon.md`](komponenty/_szablon.md)         |
| zrozumieć, dlaczego coś jest zrobione akurat tak | [`decyzje/`](decyzje/)                                     |
| sprawdzić, czego jeszcze nie ma                  | [`rejestr.md`](rejestr.md) — **nie** czytaj tego z wymagań |
| wiedzieć, co robić dalej i co już zrobiono       | [`plan.md`](plan.md)                                       |
| dowiedzieć się, co poszło nie tak w przeszłości  | [`lekcje.md`](lekcje.md)                                   |

### Poziom 1 — wymagania

| plik                                           | obszar          | co obejmuje                                 |
| ---------------------------------------------- | --------------- | ------------------------------------------- |
| [`wymagania/projekt.md`](wymagania/projekt.md) | `wym-projekt-*` | monorepo, zależności, stack, layout, pakiet |
| [`wymagania/api.md`](wymagania/api.md)         | `wym-api-*`     | kontrakt widziany przez konsumenta          |
| [`wymagania/a11y.md`](wymagania/a11y.md)       | `wym-a11y-*`    | dostępność                                  |
| [`wymagania/tokeny.md`](wymagania/tokeny.md)   | `wym-token-*`   | tokeny, stylowanie, motywy                  |
| [`wymagania/jakosc.md`](wymagania/jakosc.md)   | `wym-jakosc-*`  | testy, sandbox, bramki, rejestr             |
| [`wymagania/wydanie.md`](wymagania/wydanie.md) | `wym-wydanie-*` | wersjonowanie, publikacja, wsparcie         |

---

## Kształt wymagania

Każde wymaganie ma **stały, parsowalny** kształt. Normatywna jest wyłącznie **Obietnica** —
reszta to komentarz i metadane.

```markdown
### <a id="wym-api-obudowa"></a>`wym-api-obudowa` — Kontrolki formularza to obudowa + kontrolka

**Obietnica.** Jedno–dwa zdania. Sprawdzalne.

**Bramka:** `ścieżka/do/testu.ts`, `inna/ścieżka.mjs`
**Kontrola:** `plik.spec.ts › „nazwa testu"` albo opis przebiegu
**Decyzja:** [0003 — …](decyzje/0003-obudowa-i-kontrolka.md)
**Lekcje:** [`lekcja-21`](lekcje.md#lekcja-21)
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
[`wym-os`](00-os.md): jeśli nic nie potwierdza obietnicy, to nie ma znaczenia, czy jest
niezbudowana, czy zbudowana i niezmierzona — w obu przypadkach **nie wiemy**. Dlatego jedna
kategoria (`luka`) pokrywa oba.

Wcześniej rozróżniały je ręczne adnotacje `_(niezrealizowane)_` i `_(częściowo)_`. Było ich
18, dopisano je jednym commitem po fakcie i utrzymywała je wyłącznie czyjaś pamięć.

---

## Identyfikatory

### Dlaczego slugi, a nie numery

Reguła jest jedna:

> **Numer jest dobrym identyfikatorem tam, gdzie kolejność coś znaczy.**

- W [logu lekcji](lekcje.md) **znaczy** — log jest chronologiczny i append-only, wstawek
  nie ma. Numery zostają.
- W wymaganiach **nie znaczyła nic** — i dlatego się rozjechała. Kolejność `wym-api-*`
  w pliku wyglądała pod koniec tak: `1,2,3,4,5,` **`13,14,15,`** `10,11,12,16,17,18,19,`
  **`6,7,8,`** `20,21,` **`9`**.

Numer, który nie mówi nic o pozycji, **jest nazwą** — tylko nieinformującą. Do tego
`wym-api-31` (przestawione cyfry) wygląda wiarygodnie, a przy 161 cytowaniach w kodzie nic
takiej literówki nie łapało.

Uzasadnienie nie jest zapożyczone: [`wym-token-nazwy`](wymagania/tokeny.md#wym-token-nazwy)
żąda, żeby **token dało się zgadnąć bez dokumentacji**. Identyfikator wymagania podlega tej
samej regule.

### Zasady

- **ID nigdy się nie zmienia.** Gdy sens się zmienia, powstaje **nowe** wymaganie, a stare
  dostaje `zastąpione przez`. Slug jest nazwą, nie streszczeniem.
- Kształt: `wym-<obszar>-<slug>`, slug 1–2 słowa, ASCII bez znaków diakrytycznych.
- Lekcje: `lekcja-<numer>`, numer kolejny wolny.
- Decyzje: `<NNNN>` chronologicznie.

### Typowanie po stronie kodu

Identyfikatory są **generowane do unii TypeScriptu** (`PctReqId`), a karta sandboxa
przyjmuje `[reqs]="PctReqId[]"` zamiast `string[]`. Literówka w cytowaniu jest **błędem
kompilacji**, a nie chipem prowadzącym donikąd.

To ten sam ruch co `PctCssVar` w [`lekcja-43`](lekcje.md#lekcja-43), zastosowany do drugiej
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
5. **Świeżość rejestru.** `rejestr.md` na dysku jest równy świeżo wygenerowanemu.
6. **Kontrola odniesienia.** Zestaw celowo wadliwych wymagań w `tools/check-docs.fixtures/`
   — **każde** musi zostać odrzucone.

Punkt 6 nie jest ozdobnikiem. Rejestr jest bramką, więc podlega
[`wym-jakosc-kontrola`](wymagania/jakosc.md#wym-jakosc-kontrola) tak samo jak każda inna.
Bez niego byłby dokładnie tym, co opisuje [`lekcja-39`](lekcje.md#lekcja-39): bramką
urodzoną martwą.

---

## Migracja identyfikatorów (2026-07-27)

Historyczna. Stare ID żyją w commitach, PR-ach i w [`review.md`](review.md) — ta tabela
pozwala je rozwiązać. **Nowego kodu nie wolno nimi cytować**; bramka je odrzuca.

| stare          | nowe                                       |     | stare         | nowe                        |
| -------------- | ------------------------------------------ | --- | ------------- | --------------------------- |
| `wym-proj-0`   | `wym-os`                                   |     | `wym-api-9`   | `wym-api-animacje`          |
| `wym-proj-1`   | `wym-projekt-monorepo`                     |     | `wym-api-10`  | `wym-api-kontener`          |
| `wym-proj-2`   | `wym-projekt-najnowsze`                    |     | `wym-api-11`  | `wym-api-platforma`         |
| `wym-proj-3`   | `wym-projekt-zaleznosci`                   |     | `wym-api-12`  | `wym-api-czesci-unikalne`   |
| `wym-proj-4`   | `wym-jakosc-pokrycie`                      |     | `wym-api-13`  | `wym-api-obudowa`           |
| `wym-proj-5`   | `wym-projekt-aplikacje`                    |     | `wym-api-14`  | `wym-api-bez-obudowy`       |
| `wym-proj-6`   | `wym-jakosc-rejestr`                       |     | `wym-api-15`  | `wym-api-natywne-pole`      |
| `wym-tech-1`   | `wym-projekt-pakiet`                       |     | `wym-api-16`  | `wym-api-ramka`             |
| `wym-tech-2`   | `wym-projekt-prefiks`                      |     | `wym-api-17`  | `wym-api-liczba`            |
| `wym-tech-3`   | `wym-projekt-angular`                      |     | `wym-api-18`  | `wym-api-wielkosc`          |
| `wym-tech-4`   | `wym-projekt-ssr`                          |     | `wym-api-19`  | `wym-api-nakladka`          |
| `wym-ws-1`     | `wym-projekt-layout`                       |     | `wym-api-20`  | `wym-api-generyk`           |
| `wym-ws-2`     | `wym-projekt-entrypointy`                  |     | `wym-api-21`  | `wym-api-teksty`            |
| `wym-ws-3`     | `wym-projekt-core`                         |     | `wym-a11y-1`  | `wym-a11y-wcag`             |
| `wym-ws-4`     | `wym-projekt-lib-tokenow`                  |     | `wym-a11y-2`  | `wym-a11y-dotyk`            |
| `wym-ws-5`     | `wym-projekt-tree-shaking`                 |     | `wym-a11y-3`  | `wym-a11y-axe`              |
| `wym-ws-6`     | `wym-projekt-pliki`                        |     | `wym-a11y-4`  | `wym-jakosc-kontrola`       |
| `wym-sbx-1`    | `wym-jakosc-widoki`                        |     | `wym-a11y-5`  | `wym-a11y-ruch`             |
| `wym-sbx-2`    | `wym-jakosc-karta`                         |     | `wym-a11y-6`  | `wym-a11y-kolory-wymuszone` |
| `wym-sbx-3`    | `wym-jakosc-scena`                         |     | `wym-a11y-7`  | `wym-jakosc-hydracja`       |
| `wym-sbx-4`    | `wym-jakosc-prefiks`                       |     | `wym-styl-1`  | `wym-token-css`             |
| `wym-api-1`    | `wym-api-nazwy`                            |     | `wym-styl-2`  | `wym-token-scss`            |
| `wym-api-2`    | `wym-api-fundament`                        |     | `wym-theme-1` | `wym-token-css`             |
| `wym-api-3`    | `wym-api-sygnaly`                          |     | `wym-theme-2` | `wym-token-poziomy`         |
| `wym-api-4`    | `wym-api-atrybuty`                         |     | `wym-theme-3` | `wym-token-nadpisanie`      |
| `wym-api-5`    | `wym-api-signal-forms`                     |     | `wym-theme-4` | `wym-token-scoped`          |
| `wym-api-6`    | `wym-a11y-wbudowana`                       |     | `wym-theme-5` | `wym-token-skorka`          |
| `wym-api-7`    | `wym-api-szablony`                         |     | `wym-theme-6` | `wym-token-system`          |
| `wym-api-8`    | `wym-api-konfiguracja`                     |     | `wym-ikon-1`  | `wym-api-ikony-wlasne`      |
| `wym-token-1`  | `wym-token-dtcg`                           |     | `wym-ikon-2`  | `wym-api-ikony`             |
| `wym-token-2`  | `wym-token-artefakty`                      |     | `wym-test-1`  | `wym-jakosc-jednostkowe`    |
| `wym-token-3`  | `wym-token-poziomy`                        |     | `wym-test-2`  | `wym-jakosc-e2e`            |
| `wym-token-4`  | `wym-token-referencje`                     |     | `wym-wer-1`   | `wym-wydanie-semver`        |
| `wym-token-5`  | `wym-token-nazwy`                          |     | `wym-wer-2`   | `wym-wydanie-ng-add`        |
| `wym-token-6`  | `wym-token-pary-tekstu`                    |     | `wym-real-N`  | `lekcja-N`                  |
| `wym-token-7`  | `wym-api-czesci`                           |     |               |                             |
| `wym-token-8`  | `wym-token-gestosc`                        |     |               |                             |
| `wym-token-9`  | `wym-token-scoped` + `wym-token-dyrektywa` |     |               |                             |
| `wym-token-10` | `wym-token-dystrybucja`                    |     |               |                             |
| `wym-token-11` | `wym-token-kontrast`                       |     |               |                             |
| `wym-token-12` | `wym-token-bez-opacity`                    |     |               |                             |
| `wym-token-13` | `wym-token-domkniecie`                     |     |               |                             |

### Co się zmieniło poza numeracją

- **`wym-real-*` przestały być wymaganiami.** 43 lekcje to baza dowodowa, nie obietnice —
  nie mają bramek i nie da się ich „zrealizować". Wspólny prefiks był jedynym powodem, dla
  którego mieszały się z listą wymagań.
- **Trzy pary zdublowanych wymagań scalono:** `wym-styl-1` ≈ `wym-theme-1`,
  `wym-theme-2` ≈ `wym-token-3`, `wym-theme-4` ≈ `wym-token-9` (część o scoped theme).
- **`wym-token-9` rozdzielono** na mechanizm (`wym-token-scoped`) i dyrektywę-cukier
  (`wym-token-dyrektywa`) — bo pierwsze działa, a drugiego nie ma.
- **`wym-token-7` przeniesiono do obszaru `api`** jako `wym-api-czesci`: kontrakt
  `data-pct-part` jest publicznym API stylowania, nie tokenem.
- **Dopisano 9 wymagań**, których wcześniej nie było, mimo że obietnice już obowiązywały:
  `wym-jakosc-pakiet`, `wym-jakosc-typecheck`, `wym-jakosc-konsument`,
  `wym-jakosc-przegladarki`, `wym-token-logiczne`, `wym-wydanie-metadane`,
  `wym-wydanie-wsparcie`, `wym-token-dyrektywa`, `wym-api-ikony-wlasne`.
- **Usunięto sekcję „Czego jeszcze nie ma"** — była ręczną kopią informacji obecnej wyżej.
  Zastępuje ją [`rejestr.md`](rejestr.md), generowany.
- **Usunięto sekcję „Jak czytać ten dokument"** — istniała, bo wymagania dawały się czytać
  jako opis stanu kodu. Po rozdzieleniu obietnicy od stanu nie ma czego wyjaśniać.
