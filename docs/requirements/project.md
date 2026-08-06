# Wymagania — projekt

Jak zbudowany jest projekt, z czego i co z niego wychodzi. Obszar scala trzy dawne
sekcje, które leżały osobno, choć odpowiadały na jedno pytanie. Mapowanie starych
identyfikatorów jest w
[tabeli migracji](../README.md#migracja-identyfikatorów-2026-07-27).

> Kształt wpisu i znaczenie pól **Bramka** / **Kontrola** opisuje
> [README](../README.md#kształt-wymagania).

---

### <a id="req-project-monorepo"></a>`req-project-monorepo` — Workspace jest monorepem NX

**Obietnica.** Całość powstaje jako jeden workspace NX; każdy target uruchamiany jest
przez `nx`, nigdy przez narzędzie pod spodem.

**Bramka:** `.github/workflows/ci.yml` — cały przebieg idzie przez `nx affected`
**Kontrola:** brak — świadomie: awaria jest natychmiastowa i całkowita (CI nie ma czym
uruchomić żadnego targetu), a więc nie należy do klasy [`req-axis`](../00-axis.md)

---

### <a id="req-project-latest"></a>`req-project-latest` — Przed 1.0 używamy najnowszych wersji

**Obietnica.** Do pierwszego publicznego wydania biblioteka stoi na najnowszych
dostępnych wersjach bibliotek i frameworków. Macierz kompatybilności (które wersje
Angulara są wspierane) zaczyna obowiązywać dopiero po tym wydaniu.

**Bramka:** brak — świadomie: to reguła procesu, nie właściwość artefaktu; nie ma czego
zmierzyć na wyjściu
**Kontrola:** nie dotyczy
**Wiąże przy:** pierwszym wydaniu publicznym — wtedy to wymaganie **zastępuje**
macierz kompatybilności i wraz z nią bramka

---

### <a id="req-project-dependencies"></a>`req-project-dependencies` — Minimum zależności runtime

**Obietnica.** Biblioteka ma możliwie najmniej zależności runtime od innych bibliotek
TS/JS. Dopuszczone: `@angular/*` oraz `@angular/cdk` (deklarowany jako `peerDependency`;
konsument dołącza `@angular/cdk/overlay-prebuilt.css`).

**Bramka:** brak — luka: kontrola listy `dependencies` / `peerDependencies` w spakowanym
manifeście wobec listy dozwolonych. Naturalne miejsce to siódmy punkt
`libs/components/check-package.mjs`
**Kontrola:** brak — luka: manifest z dopisaną zależnością spoza listy musi bramkę zapalić
**Wiąże przy:** pierwszej zależności dodanej odruchowo — dziś nic nie odróżnia
`@angular/cdk` od czegokolwiek innego, co ktoś zainstaluje

**Nie-cele:** [`@angular/animations`](api.md#req-api-animations),
[`zone.js`](#req-project-angular) — patrz [00-axis.md](../00-axis.md#jawne-nie-cele)

---

### <a id="req-project-apps"></a>`req-project-apps` — Co powstaje w workspace

**Obietnica.** W workspace żyją: biblioteka komponentów, aplikacja dokumentacji
(publikowalna jako strona biblioteki), aplikacja „sandbox" (playground i baza dla e2e)
oraz testy e2e oparte o sandbox.

**Bramka:** brak — luka: `apps/docs` nie istnieje, więc bramka opisywałaby stan, który
nie zachodzi. Po powstaniu: obecność projektu w grafie + jego target `build` w CI
**Kontrola:** brak — luka: patrz wyżej
**Wiąże przy:** pierwszym zewnętrznym użytkowniku — bez dokumentacji nie ma adopcji

> Rozstrzygnięcie z review: **spis części i tokenów musi być generowany i bramkowany
> niezależnie od `apps/docs`.** Ładna strona, która go renderuje, może przyjść później —
> te dwie rzeczy zostały rozdzielone ([`req-api-parts`](api.md#req-api-parts)).

---

### <a id="req-project-package"></a>`req-project-package` — Jeden pakiet npm

**Obietnica.** Biblioteka publikowana jest jako jeden pakiet npm `@pacit/components`
z secondary entrypoints per komponent.

**Bramka:** `libs/components/check-package.mjs` (target `check-package`, w CI) — bada
**spakowany artefakt**, nie źródła: mapa `exports`, osiągalność skórki, domknięcie tokenów
**Kontrola:** `tools/check-package.fixtures/` — spreparowany pakiet na każdy punkt bramki;
każdy musi zapalić na swoim. Przebieg opisany w [`lesson-36`](../lessons.md#lesson-36)
(usunięcie `libs/tokens/dist` → bramka zapala) był ręczny — tutaj jest zautomatyzowany
**Lekcje:** [`lesson-36`](../lessons.md#lesson-36)

---

### <a id="req-project-entrypoints"></a>`req-project-entrypoints` — Secondary entrypoints kanonicznie przez ng-packagr

**Obietnica.** Każdy entrypoint to folder z własnym `ng-package.json` i `index.ts`
(generator `@nx/angular:library-secondary-entry-point`). Wszystko trafia do jednego
pakietu npm, a entrypointy mogą od siebie zależeć.

**Bramka:** `libs/components/check-package.mjs` — mapa `exports` w spakowanym manifeście
**Kontrola:** `tools/check-package.fixtures/skorka-poza-exports/` — plik obecny w pakiecie,
ale bez wpisu w mapie `exports`, musi zapalić punkt 2. To jest ta wada, której punkt 1 nie
widzi: plik przecież jest, tylko konsument nie ma jak go zaimportować

---

### <a id="req-project-core"></a>`req-project-core` — Kod współdzielony w `core`

**Obietnica.** Kod współdzielony między komponentami trafia do wewnętrznego entrypointu
`@pacit/components/core` (klasy bazowe, helpery a11y, generowanie id,
`providePctConfig`), dystrybuowanego w tym samym pakiecie.

**Bramka:** `libs/components/field/src/field-controls.spec.ts` — wspólna logika
komunikatów jest testowana raz, nie w każdej kontrolce
**Kontrola:** brak — świadomie: naruszeniem jest **duplikacja**, a nie awaria; łapie ją
review, nie test. Bramką maszynową byłaby dopiero analiza podobieństwa
**Decyzja:** [0013 — bez podziału na rdzeń bezgłowy i skórkę](../decisions/0013-no-headless-split.md)
**Lekcje:** [`lesson-21`](../lessons.md#lesson-21)

---

### <a id="req-project-tokens-lib"></a>`req-project-tokens-lib` — Tokeny są osobną biblioteką

**Obietnica.** Tokeny mieszkają w lib `tokens` z targetem build (DTCG → CSS/SCSS/TS).
Wygenerowane motywy CSS trafiają do assetów pakietu, tak by działało
`@pacit/components/themes/…`.

**Bramka:** `libs/components/project.json` → `implicitDependencies: ["tokens"]` +
`check-package` (punkt 3: domknięcie tokenów w artefakcie)
**Kontrola:** `tools/check-package.fixtures/brak-skorki/` — pakiet bez `themes/pct.css`
(czyli to, co zostawia zielony build z pustym `libs/tokens/dist`) musi zapalić punkt 1;
`tools/check-package.fixtures/token-bez-deklaracji/` — użyty token bez deklaracji w pakiecie
musi zapalić punkt 3
**Decyzja:** [0002 — skórka jedzie w pakiecie](../decisions/0002-skin-in-package.md)
**Lekcje:** [`lesson-36`](../lessons.md#lesson-36)

---

### <a id="req-project-tree-shaking"></a>`req-project-tree-shaking` — Primary entrypoint jest minimalny

**Obietnica.** `@pacit/components` eksportuje wyłącznie `providePctConfig`, wspólne typy
i wersję. Komponenty importuje się przez secondary entrypoints — co wymusza
tree-shaking i jawne importy.

**Bramka:** `tools/check-bundle.mjs` (target `check-bundle` w `components`, w CI) —
dziesięć punktów. Sondy bundlują **artefakt** przez `node_modules` i mapę `exports`,
czyli tą samą drogą co konsument: punkt 5 pilnuje, jakie entrypointy wciąga import
jednego z nich, punkt 7 — jakie dochodzą przy tym zależności zewnętrzne (CDK Overlay
ma prawo być wyłącznie w `./select`), punkt 8 — budżetu rozmiaru per entrypoint
(`libs/components/rozmiar.snapshot.md`, tolerancja dwustronna ±5%). Punkt 4 pilnuje,
że entrypoint główny nie wnosi ani jednego komponentu. Reszta to mianownik: dwa odczyty
listy entrypointów, obecność mierzonego entrypointu w sondzie, drugi odczyt izolacji po
tekście bundla, kontrola różnicowa i powtórzenie pomiaru **prawdziwym**
`@angular/build:application`
**Kontrola:** `tools/check-bundle.fixtures/` — 22 spreparowane wejścia, każde odrzucane
na swoim punkcie; wśród nich `entrypoint-wciaga-sasiada/` (import `./alfa` wciąga
`./beta`), `nowa-zaleznosc-zewnetrzna/` (entrypoint sięga po nakładkę CDK),
`sonda-bez-swojego-entrypointu/` (pomiar przestał cokolwiek wciągać) i
`para-nie-wieksza-od-pojedynczej/` — czyli wprost „aplikacja importująca dwa entrypointy
musi dać bundle zauważalnie większy"
**Lekcje:** [`lesson-51`](../lessons.md#lesson-51)

---

### <a id="req-project-files"></a>`req-project-files` — Stała struktura plików komponentu

**Obietnica.** Per komponent: `button.ts`, `button.html`, `button.scss`,
`button.spec.ts`, `button.types.ts`, `index.ts`, `ng-package.json`. Szablon i style
**zawsze** w osobnych plikach.

**Bramka:** brak — luka: kontrola układu katalogu entrypointu (skrypt w duchu
`check-package.mjs`, czytający `libs/components/*/src`)
**Kontrola:** brak — luka: entrypoint z szablonem inline musi bramkę zapalić
**Wiąże przy:** pierwszym komponencie dopisanym przez kogoś innego niż autor tej reguły
**Decyzja:** [0001 — szablony i style w osobnych plikach](../decisions/0001-separate-files.md)

> To **świadome odstępstwo** od oficjalnej wskazówki Angulara „prefer inline templates
> for smaller components" — podyktowane spójnością w bibliotece o dziesiątkach
> komponentów.

---

### <a id="req-project-prefix"></a>`req-project-prefix` — Prefiks `pct`

**Obietnica.** Prefiks selektorów i klas biblioteki: `pct`. Infrastruktura sandboxa
używa `sbx`, powłoka aplikacji — `app`.

**Bramka:** `libs/components/eslint.config.mjs` — reguły
`@angular-eslint/component-selector` i `directive-selector` z `prefix: "pct"`
**Kontrola:** brak — świadomie: reguła ESLint zapala przy pierwszym naruszeniu i nie ma
trybu, w którym „przechodzi po cichu" — nie należy do klasy [`req-axis`](../00-axis.md)

---

### <a id="req-project-language"></a>`req-project-language` — Repozytorium mówi jednym językiem: angielskim

**Obietnica.** Każdy tekst pisany ręką jest po angielsku: komentarz, JSDoc, nazwa testu,
komunikat bramki, nazwa pliku, targetu i reguły, dokumentacja, tytuł commita. Polszczyzna
istnieje wyłącznie jako **datowany wpis** w rejestrze wyjątków, każdy z powodem i zadaniem,
które go zdejmuje. Powierzchnia publiczna nie ma prawa mieć tam **ani jednego** wpisu, a są
nią **dwie rzeczy, nie jedna**: pakiet (`types/*.d.ts`, README, `description`, artefakty
w `themes/`) i **samo repozytorium**, które stoi publicznie na GitHubie — `README.md`,
`docs/` i nazwy widoczne w zakładce Actions.

**Bramka:** brak — luka: `tools/check-language.mjs` — dwa pomiary o różnym zasięgu.
Powierzchnia publiczna mierzona na **spakowanym artefakcie** (tam trafia to, co naprawdę
zobaczy konsument, a nie to, co stoi w źródle), reszta repozytorium — na plikach z indeksu
gita. Wykrywanie dwuczłonowe, bo diakrytyki same nie wystarczą (`Przycisk`, `Rozmiar`,
`domyslnie` nie mają ani jednego): znaki diakrytyczne **plus** lista polskich słów
funkcyjnych, których angielszczyzna nie zawiera (`jest`, `czyli`, `przez`, `oraz`, `albo`,
`wtedy`, `przy`, `bez`). Do tego własny mianownik — niepusty zbiór skanowanych plików
i niepusty pomiar, bo skan, który przestał cokolwiek czytać, przepuszcza wszystko
([`lesson-48`](../lessons.md#lesson-48))
**Kontrola:** brak — luka: polski komentarz w pliku spoza rejestru musi zapalić; wpis
rejestru wskazujący plik **już** przetłumaczony musi zapalić jako martwy; `description` po
polsku w spakowanym manifeście musi zapalić na punkcie powierzchni publicznej **mimo**
wpisu w rejestrze; skan z pustą listą plików musi zapalić na mianowniku
**Wiąże przy:** **pierwszym pushu do upstreamu** — repozytorium jest publiczne od tej
sekundy, bez etapu prywatnego, więc `README.md` (251 linii po polsku) i `docs/` (6 593) są
pierwszym, co ktokolwiek zobaczy. Wydanie pakietu wiąże drugą część: 24 pliki w zbudowanym
artefakcie, w tym komplet ośmiu `types/*.d.ts`

> Rejestr wyjątków jest tu tym, czym `przegladarki.policy.json` dla
> [`req-quality-browsers`](quality.md#req-quality-browsers): migracja przez kurczącą
> się listę, a nie przez jeden przebieg. Bez niego bramka byłaby czerwona przez wszystkie
> tygodnie tłumaczenia, czyli wyłączona pierwszego dnia.

> Reguła obowiązywała wcześniej **w połowie i tylko jako proza**: `docs/README.md` zapisywał
> podział „dokumentacja robocza po polsku, powierzchnia publiczna po angielsku". Podział nie
> miał bramki i nie był dotrzymany — `description` pakietu jest po polsku, a publiczny JSDoc
> cytuje **31 razy** wewnętrzne `wym-*` / `lekcja-*`, czyli identyfikatory dokumentacji,
> której konsument nie ma. To jest dokładnie klasa [`req-axis`](../00-axis.md): obietnica bez
> bramki nie jest obietnicą.

> Obietnica obejmuje też **identyfikatory**: `wym-` jest skrótem od „wymaganie", `lekcja-`
> mówi samo za siebie, a nazwy plików i katalogów (`requirements/`, `decisions/`, `tokens.md`)
> są cytowane w tych samych miejscach co treść. Przemianowanie prowadzi
> [H1](../plan.md#h-jeden-język-repozytorium) i to ono jest wyjątkiem od reguły „ID nigdy
> się nie zmienia" — jedynym, świadomym i datowanym.

---

### <a id="req-project-concise"></a>`req-project-concise` — Tekst w repozytorium jest nośny

**Obietnica.** Komentarz, JSDoc i akapit dokumentacji odpowiadają na pytanie „dlaczego nie
oczywiście?" — niosą pomiar, cenę wybranej drogi albo pułapkę, która już raz kosztowała.
To, co da się **wskazać odsyłaczem**, jest wskazywane, a nie streszczane: dokumentacja stoi
publicznie pod stabilnym adresem, więc nagłówek bramki linkuje decyzję i lekcję, zamiast
powtarzać je własnymi słowami. Narracja ma jedno miejsce: [`lessons.md`](../lessons.md)
i dziennik [planu](../plan.md).

Budżet obejmuje **prozę**, nie kod: `@example` i przykłady są poza nim w całości, bo
w publicznym API są najcenniejsze. Objętość jest problemem `tools/` (~590 linii samych
nagłówków bramek), nie JSDoc.

**Bramka:** brak — luka: budżet objętości prozy per plik, snapshot z tolerancją
**dwustronną**, w idiomie `libs/components/rozmiar.snapshot.md`. Granica jest zapisana
wprost, a nie przemilczana: maszyna mierzy **objętość, nie nośność** — wzrost staje się
linią w diffie, a ocena, czy akapit jest nośny, zostaje po stronie review
**Kontrola:** brak — luka: plik z dopisanym akapitem ponad tolerancję musi zapalić; plik
skrócony bez przepisania snapshotu — również
**Wiąże przy:** zamknięciu kompresji ([sekcja H](../plan.md#h-jeden-język-repozytorium)) —
**nie wcześniej**. Snapshot założony na dzisiejszych 76-liniowych nagłówkach zamroziłby je
jako stan zaakceptowany, dokładnie tak jak snapshot nazw tokenów założony przed
normalizacją ([`lesson-49`](../lessons.md#lesson-49))

---

### <a id="req-project-angular"></a>`req-project-angular` — Najnowsze mechanizmy Angulara

**Obietnica.** Standalone components, signals, signal forms, OnPush (domyślne w v22+,
nieustawiane jawnie), zoneless, SSR. `zone.js` jest **usunięty z zależności**, nie tylko
wyłączony.

**Bramka:** `tools/check-zoneless.mjs` (target `check-zoneless`, w CI) — trzy punkty na
jedną obietnicę, bo `zone.js` wraca trzema niezależnymi drogami: deklaracją
w którymkolwiek manifeście repozytorium (czytanym z indeksu gita, więc nowy projekt jest
objęty od pierwszego commita), instalacją w drzewie `package-lock.json` — także
zagnieżdżoną pod cudzym pakietem — oraz śladem runtime w zbudowanym pakiecie
(`import 'zone.js'`, `NgZone`, `__zone_symbol__`, globalny `Zone`). Punkty 1 i 2 pilnują
wejścia, punkt 3 wyjścia. Poza tym `apps/sandbox/src/app/app.config.ts` →
`provideZonelessChangeDetection()`; testy jednostkowe konfigurują zoneless w `TestBed`
**Kontrola:** `tools/check-zoneless.fixtures/` — spreparowane wejścia, po jednym na sposób
powrotu stref (manifest roota, manifest publikowanego pakietu, instalacja w locku,
instalacja zagnieżdżona, `NgZone` w bundlu, `__zone_symbol__` w bundlu, skan
niewidzący pakietu). Każde musi zostać odrzucone **przez ten punkt, który deklaruje**,
a wejście wzorcowe — przejść. Do tego dwa przebiegi na prawdziwym repozytorium:
`npm i -D zone.js` zapala punkt 1, a cofnięcie tego wpisu **w manifeście, ale nie
w locku** — punkt 2, czyli dokładnie ten wariant, którego nie widać w code review
**Lekcje:** [`lesson-7`](../lessons.md#lesson-7), [`lesson-8`](../lessons.md#lesson-8),
[`lesson-11`](../lessons.md#lesson-11)

---

### <a id="req-project-ssr"></a>`req-project-ssr` — Komponenty działają pod SSR

**Obietnica.** Każdy komponent renderuje się poprawnie po stronie serwera i hydruje bez
rozjazdu. Żaden stan modułowy nie przecieka między renderami — liczniki, cache i
rejestry idą przez DI albo są bezstanowe.

**Bramka:** `apps/sandbox-e2e/src/hydration.spec.ts` — sprawdzenie siedzi w pomocniku
`visit()`, więc obejmuje **każdy** widok naraz
**Kontrola:** `hydration.spec.ts › „bramka faktycznie wykrywa błąd hydracji (kontrola
bramki)"`
**Lekcje:** [`lesson-30`](../lessons.md#lesson-30), [`lesson-31`](../lessons.md#lesson-31)

---

### <a id="req-project-layout"></a>`req-project-layout` — Layout katalogów

**Obietnica.** `apps/` — `docs`, `sandbox`, `sandbox-e2e`. `libs/` — `components`
(publikowalny), `tokens` (źródło DTCG + build).

**Bramka:** brak — luka: wynika z [`req-project-apps`](#req-project-apps);
domknie się razem z nim
**Kontrola:** brak — luka: patrz wyżej
**Wiąże przy:** powstaniu `apps/docs`
**Lekcje:** [`lesson-1`](../lessons.md#lesson-1), [`lesson-2`](../lessons.md#lesson-2)
