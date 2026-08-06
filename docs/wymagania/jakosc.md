# Wymagania — jakość i bramki

Ten obszar jest **realizacją [`wym-os`](../00-os.md)**: opisuje maszyny, które potrafią
zapalić. Scala dawne sekcje testów i sandboxa oraz cztery wymagania rozrzucone wcześniej
po obszarach projektu i dostępności. Mapowanie starych identyfikatorów jest w
[tabeli migracji](../README.md#migracja-identyfikatorów-2026-07-27).

Sandbox stoi tutaj, a nie w osobnej sekcji, celowo: [`lekcja-33`](../lekcje.md#lekcja-33)
pokazała, że macierz „każdy komponent × każdy stan" nie jest ozdobnikiem, tylko
**wejściem dla bramki a11y**. Audyt bada wyłącznie to, co ktoś wcześniej wyrenderował —
luka w prezentacji jest luką w pokryciu, niewidoczną w raporcie, bo raport jest zielony.

> Kształt wpisu i znaczenie pól **Bramka** / **Kontrola** opisuje
> [README](../README.md#kształt-wymagania).

---

## Meta — bramki dla bramek

### <a id="wym-jakosc-kontrola"></a>`wym-jakosc-kontrola` — Każda bramka ma kontrolę odniesienia

**Obietnica.** Nowa bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy **pokazano,
że potrafi nie przejść**. Każda bramka ma test albo udokumentowany przebieg dowodzący, że
po wprowadzeniu celowej regresji zapala. Bramka, która zawsze przechodzi, jest
groźniejsza niż jej brak.

**Bramka:** `tools/check-docs.mjs` — pole **Kontrola** jest wymagane przy każdym
wymaganiu, tak samo jak pole **Bramka**
**Kontrola:** `tools/check-docs.fixtures/` — wymaganie z bramką, ale bez kontroli, musi
zostać odrzucone
**Lekcje:** [`lekcja-38`](../lekcje.md#lekcja-38), [`lekcja-39`](../lekcje.md#lekcja-39),
[`lekcja-41`](../lekcje.md#lekcja-41)

> Dwa przebiegi, z których wzięła się ta reguła, warto trzymać blisko:
> [`lekcja-38`](../lekcje.md#lekcja-38) — idiomatyczny zapis emulacji **po cichu nie
> działał**, a test przechodził na wartościach domyślnych; wykryła to dopiero kontrola
> odniesienia, nie test właściwy. [`lekcja-39`](../lekcje.md#lekcja-39) — test wizualny
> mógł urodzić się martwy na dwa niezależne sposoby, oba wyglądające jak działający test.

---

### <a id="wym-jakosc-rejestr"></a>`wym-jakosc-rejestr` — Rejestr obietnica → bramka → kontrola

**Obietnica.** Każde wymaganie wskazuje **maszynowo**, co je egzekwuje i co dowodzi, że
ta bramka potrafi nie przejść. Stan wymagania jest **wyprowadzany** z zawartości rejestru,
nigdy wpisywany ręcznie. Świadomy brak bramki jest dozwolony — musi być wpisany **wraz
z powodem**.

**Bramka:** `tools/check-docs.mjs` (target `check-docs`, w CI) — sześć kontroli opisanych
w [README](../README.md#bramka-dokumentacji)
**Kontrola:** `tools/check-docs.fixtures/` — zestaw celowo wadliwych wymagań (bez bramki,
z bramką wskazującą na nieistniejący plik, z targetem spoza CI, bez kontroli), z których
**każde** musi zostać odrzucone
**Lekcje:** [`lekcja-36`](../lekcje.md#lekcja-36), [`lekcja-39`](../lekcje.md#lekcja-39)

> **Dlaczego to musi być kod, a nie dyscyplina.** Rozjazd między dokumentacją
> a rzeczywistością już wystąpił i już go raz łatano ręcznie: nagłówek „Jak czytać ten
> dokument" istniał dokładnie dlatego, że wymagania dawały się czytać jako opis stanu
> kodu, a odpowiedzią było **ręczne dopisanie 18 adnotacji**. To ten sam wzorzec co
> ręczny `node libs/tokens/build.mjs` w CI przed [`lekcja-36`](../lekcje.md#lekcja-36):
> obejście, które **maskuje brak struktury zamiast go ujawnić**.
>
> Efekt uboczny jest właściwie główną korzyścią: **dopisanie wymagania bez bramki
> przestaje być możliwe po cichu.** Oś zaczyna egzekwować samą siebie.
>
> To wymaganie jest przy tym **własnym pierwszym przypadkiem testowym**: dopóki rejestru
> nie ma, [`wym-os`](../00-os.md) jest obietnicą bez bramki — dokładnie tym, czego
> zakazuje.

---

### <a id="wym-jakosc-typecheck"></a>`wym-jakosc-typecheck` — Każdy projekt ma target `typecheck`

**Obietnica.** Nie ma w workspace kodu TypeScript, którego kompilator nie widzi. **Lint
nie zastępuje typechecku**: ESLint parsuje i sprawdza reguły, ale nie zgłasza błędów typów
ani niespójności konfiguracji modułów.

**Bramka:** `tools/check-typecheck.mjs` (target `check-typecheck`, w CI) — cztery kontrole:
(1) każdy plik TypeScriptu z indeksu gita należy do jakiegoś projektu, (2) każdy projekt
z plikami TypeScriptu ma target `typecheck`, (3) polecenie tego targetu daje się zmierzyć
i nie jest rozbrojone (operator powłoki, `--noCheck`, brak `-p`), (4) każdy plik projektu
wchodzi do programu jego kompilatora
**Kontrola:** `tools/check-typecheck.fixtures/` — jedenaście spreparowanych wejść, każde
odrzucane na swoim punkcie; plus przebiegi na repozytorium: `sandbox` cofnięty do targetu
inferowanego przez `@nx/vite` zapala punkt 4 na czterech plikach, nowy entrypoint
biblioteki spoza `include` — też punkt 4, nowy projekt bez targetu — punkt 2, `|| true`
dopisane do polecenia — punkt 3
**Lekcje:** [`lekcja-42`](../lekcje.md#lekcja-42), [`lekcja-47`](../lekcje.md#lekcja-47)

> **Punkt 4 jest tym, po co ta bramka powstała.** Sam wymóg istnienia targetu mierzy
> deklarację, a `lekcja-42` mówi wprost, że tsconfig potrafi kłamać o swoim zasięgu.
> `sandbox` miał target `typecheck` **inferowany** przez `@nx/vite/plugin` i przechodził
> na zielono, sprawdzając wyłącznie `tsconfig.app.json` — a ten wyklucza `**/*.spec.ts`.
> Dlatego bramka nie czyta `include`, tylko uruchamia **polecenie z targetu** rozszerzone
> o `--listFilesOnly` i porównuje wynik z indeksem gita.

---

## Testy

### <a id="wym-jakosc-jednostkowe"></a>`wym-jakosc-jednostkowe` — Testy jednostkowe na Vitest

**Obietnica.** Testy jednostkowe biblioteki i aplikacji biegną na Vitest, pod zoneless.

**Bramka:** `.github/workflows/ci.yml` — `test` i `vite:test` w liście `nx affected -t`
**Kontrola:** brak — luka: **testowanie mutacyjne** rdzenia (Stryker na `core`, `number`,
`select`). To jedyna metoda odpowiadająca na pytanie „czy te testy w ogóle coś łapią" —
czyli dokładnie to pytanie, które projekt zadaje sobie przy każdej bramce. 136 zielonych
testów nie jest jeszcze dowodem
**Wiąże przy:** natychmiast dla `core` — im więcej komponentów na nim stoi, tym droższa
każda niewykryta luka
**Lekcje:** [`lekcja-3`](../lekcje.md#lekcja-3), [`lekcja-19`](../lekcje.md#lekcja-19),
[`lekcja-28`](../lekcje.md#lekcja-28)

---

### <a id="wym-jakosc-pokrycie"></a>`wym-jakosc-pokrycie` — Pokrycie ≥ 80% linii

**Obietnica.** Kod biblioteki jest możliwie pełnie pokryty testami; minimum SonarQube,
czyli ≥ 80% pokrycia linii.

**Bramka:** dwuczęściowa, bo procent i jego mianownik psują się osobno.
`libs/components/project.json` — target `test` zbiera pokrycie (`coverage`,
`coverageInclude`) i **faila** poniżej `coverageThresholds.lines` = 80.
`tools/check-coverage.mjs` (target `check-coverage`, w CI) pilnuje mianownika: **każdy
plik źródłowy biblioteki musi być w raporcie**, a próg musi być zadeklarowany i nie
niższy niż 80. Dodatkowo `libs/components/src/public-api.spec.ts` wprowadza moduły każdej
bramki pakietu do przebiegu — bez tego plik bez testu nie pokazuje się z zerem, tylko
**wypada ze statystyki** ([`lekcja-45`](../lekcje.md#lekcja-45))
**Kontrola:** `tools/check-coverage.fixtures/` — siedem spreparowanych wejść, po jednym na
sposób rozbrojenia bramki (brak raportu, pusta lista źródeł, plik poza raportem, pomiar
wyłączony, próg usunięty, próg zaniżony, pokrycie poniżej progu). Każde musi zostać
odrzucone **przez ten punkt, który deklaruje**, a wejście wzorcowe — przejść. Do tego dwa
przebiegi na prawdziwym repozytorium: usunięcie `libs/components/src/public-api.spec.ts`
zostawia target `test` **zielony** (96,55%), a `check-coverage` zapala na
`libs/components/src/index.ts`; usunięcie `select.spec.ts` i `number.spec.ts` zbija
pokrycie do 64,96% i zapala oba progi naraz
**Lekcje:** [`lekcja-5`](../lekcje.md#lekcja-5), [`lekcja-45`](../lekcje.md#lekcja-45)

> Dlaczego dwie bramki na jedną liczbę. Sam próg pilnuje **licznika przez mianownik**,
> a v8 liczy oba wyłącznie na modułach, które weszły do przebiegu. Usunięcie
> `number.spec.ts` **podniosło** kiedyś pokrycie z 96,55% na 96,94%, bo razem z testem
> zniknął z raportu cały nietestowany plik. Punkt 3 bramki pilnuje więc czegoś, czego
> procent nie widzi: że mianownik obejmuje całą bibliotekę.

> Próg jest **podłogą, nie zapadką**. Przy 96,58% usunięcie jednej specyfikacji nie zbija
> go poniżej 80 (`select.spec.ts` → 81,55%, `number.spec.ts` → 80,00%) i to jest zgodne
> z obietnicą: 80% to minimum, nie „nigdy mniej niż wczoraj". Zapadka byłaby inną
> obietnicą i musiałaby przyjść z własną bramką.

---

### <a id="wym-jakosc-e2e"></a>`wym-jakosc-e2e` — Testy e2e na Playwright, w tym wizualne

**Obietnica.** Testy e2e na Playwright, w tym **testy wizualne** (screenshot diff).
Porównywane są **karty sandboxa** (`toHaveScreenshot` na elemencie), nie całe strony —
więc zmiana w powłoce nie unieważnia wzorców wszystkich komponentów naraz. Wzorce leżą
w `apps/sandbox-e2e/src/__screenshots__/{platform}/` i **są w repozytorium**.

**Bramka:** `apps/sandbox-e2e/src/visual.spec.ts` i pozostałe specyfikacje e2e
**Kontrola:** progi są **dwa** i oba wynikają z pomiaru. Liczba pikseli jest bezwzględna
(`maxDiffPixels: 20`): powtórzony przebieg tego samego kodu daje **0** różniących się
pikseli, a zmiana `border-radius` 8 px → 1 px — **74**; pierwsza wersja z progiem
ułamkowym (`maxDiffPixelRatio: 0.01`) tę regresję **przepuszczała**
([`lekcja-39`](../lekcje.md#lekcja-39)). Podobieństwo koloru jest osobnym progiem
(`threshold: 0.005`), bo domyślne `0.2` decyduje, które piksele w ogóle **trafią** do
tamtego budżetu: krok rampy `blue-500` → `blue-400` to 0,0163 w metryce pixelmatcha, więc
przemalowanie całego przycisku dawało **zero** różniących się pikseli
([`lekcja-53`](../lekcje.md#lekcja-53))
**Lekcje:** [`lekcja-13`](../lekcje.md#lekcja-13), [`lekcja-23`](../lekcje.md#lekcja-23),
[`lekcja-30`](../lekcje.md#lekcja-30), [`lekcja-39`](../lekcje.md#lekcja-39)

> Dwie rzeczy decydują o tym, czy taki test mierzy kod, czy maszynę. **Krój pisma** jest
> przypinany na czas zrzutu (`Liberation Sans`), bo `system-ui` rozwiązuje się inaczej na
> każdym systemie. **Próg jest bezwzględny**, nie ułamkowy — ułamek daje tym większą
> pobłażliwość, im większa karta.
>
> Testy geometrii sprawdzają to, o co ktoś wcześniej zapytał; zrzut łapie także to, o co
> nikt nie zapytał, bo porównuje cały obraz.

---

### <a id="wym-jakosc-hydracja"></a>`wym-jakosc-hydracja` — Bramka hydracji w e2e

**Obietnica.** Niezgodność drzewa serwerowego z klienckim zapala bramkę. Sprawdzenie
siedzi w pomocniku `visit()`, przez który wchodzi **każdy** test e2e — obejmuje więc
wszystkie widoki naraz, zamiast czekać na dopisanie do kolejnych specyfikacji.

**Bramka:** `apps/sandbox-e2e/src/hydration.spec.ts` + pomocnik `visit()`
w `apps/sandbox-e2e/src/support/`
**Kontrola:** `hydration.spec.ts › „bramka faktycznie wykrywa błąd hydracji (kontrola
bramki)"`
**Lekcje:** [`lekcja-30`](../lekcje.md#lekcja-30), [`lekcja-31`](../lekcje.md#lekcja-31)

> Rozjazd hydracji **nie przewraca strony**: Angular loguje `NG05xx` i po cichu odtwarza
> poddrzewo od nowa. Aplikacja wygląda poprawnie, a płaci podwójnym renderem i utratą
> stanu DOM — modelowy przypadek [`wym-os`](../00-os.md).

---

### <a id="wym-jakosc-pakiet"></a>`wym-jakosc-pakiet` — Bramka bada spakowany artefakt

**Obietnica.** **Zielony build nie jest dowodem, że artefakt da się użyć.** Osobna bramka
bada `dist/libs/components` — nie źródła: obecność i osiągalność skórki, **domknięcie
tokenów** (każdy `var(--pct-*)` użyty w pakiecie ma w nim deklarację), zgodność
`PCT_VERSION` z manifestem, osiągalność kolekcji `ng add` / `ng update` oraz metadane
wymagane przez npm.

**Bramka:** `libs/components/check-package.mjs` (target `check-package`, w CI)
**Kontrola:** `tools/check-package.fixtures/` — siedem spreparowanych pakietów, po jednym
na każdy punkt bramki (punkt 4 ma dwa: zła wartość i zniknięcie stałej). Każdy musi zostać
odrzucony **przez ten punkt, który deklaruje**, a pakiet wzorcowy — przejść. Przebieg
z [`lekcja-36`](../lekcje.md#lekcja-36) (usunięcie `libs/tokens/dist` → build
**przechodzi**, a pakiet nie wozi ani jednej definicji tokenu) był ręczny; to jest jego
maszynowa postać
**Lekcje:** [`lekcja-36`](../lekcje.md#lekcja-36), [`lekcja-41`](../lekcje.md#lekcja-41)

> Bramka sprawdza **domknięcie**, a nie obecność pliku — obecność spełniłby też pusty
> plik albo skórka, z której ktoś usunął warstwę komponentową.

> Bada jednak **katalog `dist`**, i to jest granica zapisana, nie przeoczona: między nim
> a `node_modules` konsumenta stoją `npm pack` i rejestr, a „plik jest" nie znaczy „plik
> da się wczytać". Drugą stronę mierzy
> [`wym-jakosc-konsument`](#wym-jakosc-konsument) ([`lekcja-55`](../lekcje.md#lekcja-55)).

> Kontrola sprawdza nie tylko to, **że** spreparowany pakiet zapalił, ale i **który** punkt
> go odrzucił. Bez tego fixture wywalający się z przypadkowego powodu — zepsuty manifest,
> literówka w ścieżce — liczyłby się jako dowód, że badany punkt działa. Byłaby to ta sama
> cicha wada piętro wyżej.

---

### <a id="wym-jakosc-konsument"></a>`wym-jakosc-konsument` — Test konsumenta na lokalnym rejestrze

**Obietnica.** Logicznym następnym krokiem po [`wym-jakosc-pakiet`](#wym-jakosc-pakiet)
jest sprawdzenie artefaktu **w użyciu**: `npm pack` → publikacja do lokalnego rejestru →
instalacja **po nazwie** do świeżej aplikacji → `ng add` → build z SSR → jeden e2e.

Między `dist` a `node_modules` konsumenta stoją dwa filtry, których bramka statyczna nie
widzi z założenia: `npm pack` (pole `files`, `.npmignore`) i rejestr. Do tego **„plik
istnieje" nie znaczy „plik działa"**.

**Bramka:** `tools/check-consumer.mjs` (target `check-consumer`, w CI) — siedem punktów:
zawartość archiwum wobec mapy `exports` i kolekcji schematiców; publikacja i to, czy
rejestr serwuje **tę samą sumę** z **lokalnego** adresu, a nie z uplinku npmjs; instalacja
po nazwie i rozwiązanie modułu do własnego `node_modules` aplikacji; `ng add` uruchomiony
z **zainstalowanego** pakietu prawdziwym Angular CLI; build z SSR razem ze śladem
biblioteki w bundlu i deklaracjami tokenów w arkuszu; renderowanie **po stronie serwera**
(`ng-server-context="ssr"`, nie prerender); jeden przebieg w przeglądarce mierzący, że
tło przycisku jest wartością `--pct-button-bg`, przy zerowej liczbie błędów w konsoli
**Kontrola:** `tools/check-consumer.fixtures/` — 28 spreparowanych wejść, każde odrzucane
na swojej **regule**; plus siedem przebiegów na prawdziwym repozytorium (pusta skórka
w pakiecie → build konsumenta bez ani jednej deklaracji tokenu; skórka usunięta z pakietu;
`files` w manifeście odcinające schematics; zdjęta granica CommonJS; `exports` wskazujące
na nieistniejący plik; `document` przy konstrukcji komponentu; przycisk malowany kolorem
z palca) — każdy na innej regule
**Lekcje:** [`lekcja-36`](../lekcje.md#lekcja-36), [`lekcja-55`](../lekcje.md#lekcja-55)

> Bramka **nie** instaluje `peerDependencies` z rejestru — aplikacja bierze `@angular/*`
> z `node_modules` repozytorium, tak samo jak sonda buildera w
> [`wym-projekt-tree-shaking`](projekt.md#wym-projekt-tree-shaking). Rozjazd zakresu wersji
> w `peerDependencies` przez tę bramkę przejdzie; pilnuje go
> [`wym-projekt-zaleznosci`](projekt.md#wym-projekt-zaleznosci).

---

### <a id="wym-jakosc-przegladarki"></a>`wym-jakosc-przegladarki` — Macierz przeglądarek

**Obietnica.** Testy funkcjonalne biegną na chromium, **webkit i firefox**. Zrzuty
wizualne zostają na jednej platformie (linux/chromium) — rasteryzacja i tak by je
rozjechała.

**Bramka:** brak — luka: `apps/sandbox-e2e/playwright.config.mts` ma **wyłącznie
chromium**, reszta zakomentowana
**Kontrola:** brak — luka: przebieg dowodzący, że test przechodzący na chromium potrafi nie przejść na webkicie
**Wiąże przy:** natychmiast dla biblioteki chwalącej się a11y — Safari ma najwięcej wad
CSS (`:has()`, `inert`, `dialog`, `field-sizing`), a `forced-colors` testujemy wyłącznie
emulacją

---

## Sandbox — wejście dla bramek

### <a id="wym-jakosc-widoki"></a>`wym-jakosc-widoki` — Sandbox jest rozbity na widoki

**Obietnica.** Widok per komponent pokazuje jego warianty, wielkości i stany; widoki
przekrojowe (wielkość, motyw, gęstość, stany, formularze, tokeny/części, a11y) zestawiają
**wszystkie** komponenty na jednej osi. Rejestr widoków (`views.ts`) jest jednym źródłem
dla routingu, nawigacji i strony wejściowej. **Test komponentu wchodzi na widok tego
komponentu.**

**Bramka:** `apps/sandbox-e2e/src/a11y.spec.ts`, `hydration.spec.ts` — obie iterują po
rejestrze widoków, więc nowy widok jest audytowany **bez dopisywania testu**
**Kontrola:** `apps/sandbox/src/app/app.spec.ts` — rejestr widoków wobec tras
**Lekcje:** [`lekcja-29`](../lekcje.md#lekcja-29), [`lekcja-33`](../lekcje.md#lekcja-33)

> Widoki przekrojowe zestawiają komponenty w **macierz**, nie w listę przykładów: `/size`
> to wszystkie kontrolki × `sm`/`md`/`lg` wyrównane dolną krawędzią, `/states` to
> wszystkie kontrolki × każdy stan. Stany są wymuszane **inputami**, a nie wyprowadzane
> z formularza — inaczej nie da się pokazać przypadków, do których trudno doprowadzić
> klikaniem, a to właśnie one nie mają pokrycia.

---

### <a id="wym-jakosc-karta"></a>`wym-jakosc-karta` — Wspólna karta `sbx-demo`

**Obietnica.** Karta obudowuje każdy przykład i niesie osie przekrojowe: schemat kolorów,
skórkę i wielkość — globalnie w powłoce, lokalnie per karta. Motyw ustawia na **własnej
scenie**, nigdy na `:root`, więc każdy przykład jest przy okazji testem scoped theme.
Pasek przełączników stoi **poza sceną**. Karta deklaruje też, których wymagań dotyczy
(`[reqs]`).

**Bramka:** `apps/sandbox/src/app/ui/demo.spec.ts`; `tools/check-docs.mjs` — każde
`wym-*` w `[reqs]` musi rozwiązywać się do istniejącego wymagania
**Kontrola:** `tools/check-docs.fixtures/` — karta z nieistniejącym identyfikatorem musi
zostać odrzucona
**Lekcje:** [`lekcja-13`](../lekcje.md#lekcja-13)

> Wejście `reqs` jest typowane jako `PctReqId[]` — unia generowana z dokumentacji. To ten
> sam ruch co `PctCssVar` w [`lekcja-43`](../lekcje.md#lekcja-43): literówka
> w identyfikatorze przestaje być cichym chipem prowadzącym donikąd i staje się **błędem
> kompilacji**.

---

### <a id="wym-jakosc-scena"></a>`wym-jakosc-scena` — Motyw strony też jest scoped theme

**Obietnica.** Powłoka trzyma `data-theme` na swoim hoście, a nie na `:root`. Dzięki temu
`:root` zostaje **niezmiennym punktem odniesienia** dla testów, a strona przechodzi tę
samą ścieżkę kodu co dowolne poddrzewo.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/shell.spec.ts`
**Kontrola:** `preferences.spec.ts › „bez preferencji ciemnej :root zostaje jasny
(odniesienie)"` — to `:root` jest tu kontrolą odniesienia dla wszystkich pomiarów motywu
**Lekcje:** [`lekcja-17`](../lekcje.md#lekcja-17)

> Wymusiło to emisję bloku `[data-theme="light"]` w buildzie tokenów: dopóki jasny motyw
> był tylko brakiem atrybutu, jasna karta wewnątrz ciemnej strony nie miała czym cofnąć
> dziedziczonych wartości.

---

### <a id="wym-jakosc-prefiks"></a>`wym-jakosc-prefiks` — Infrastruktura sandboxa ma prefiks `sbx`

**Obietnica.** Prefiks `sbx` oddzielony od `app` (powłoka) i `pct` (biblioteka) — po
selektorze widać, czy element jest rusztowaniem, demonstracją, czy komponentem
publikowanym.

**Bramka:** `apps/sandbox/eslint.config.mjs` — reguły selektorów z prefiksami
**Kontrola:** brak — świadomie: reguła ESLint nie ma trybu cichego przejścia
