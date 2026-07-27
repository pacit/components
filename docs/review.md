# Review kierunkowy — `@pacit/components`

**Data:** 2026-07-27 · **Stan:** 28 commitów, 7 komponentów, wszystkie bramki zielone
**Zakres:** `docs/opis.md`, `libs/components`, `libs/tokens`, `apps/sandbox`, `apps/sandbox-e2e`, CI, wydanie
**Metoda:** lektura całości źródeł + przebieg `nx run-many -t lint test build check-package --skip-nx-cache` (zielony; dwa ostrzeżenia budżetu SCSS: `select.scss` +337 B, `field.scss` +8 B)

Ten dokument odpowiada na trzy pytania: **czy kierunek jest dobry**, **co zmienić**, **co robić dalej** — plus osobno decyzję o RTL. Jest dokumentem roboczym, nie powierzchnią publiczną, więc zostaje po polsku (patrz ryzyko E, które dotyczy czego innego).

---

## 1. Werdykt

Kierunek jest dobry — lepszy niż u konkurencji na osi, którą wybraliście. Ale **ta oś nigdzie nie jest nazwana wprost**, a bez tego „lepsza niż PrimeNG" jest celem nieosiągalnym z definicji: PrimeNG ma ~90 komponentów i dekadę przewagi. Na liczbę komponentów nie wygracie nigdy i nie ma sensu próbować.

Wygrać można na czymś innym — i już to robicie, tylko bez zapisu:

> **To jest biblioteka, która każdą swoją obietnicę egzekwuje bramką potrafiącą nie przejść.**

Contrast gate blokuje build. `check-package` bada spakowany artefakt, nie źródła. Bramka hydracji siedzi w `visit()`, więc obejmuje każdy widok naraz zamiast czekać na dopisanie do kolejnych speców. `wym-real-39` mówi wprost: _„nowa bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie przejść"_.

Żadna z wymienionych bibliotek tego nie ma. Material ma dokumentację a11y; nikt nie faila builda na współczynniku kontrastu. PrimeNG ma silnik motywów w JS z problemami SSR/FOUC — wasze CSS-first zero-runtime jest po prostu lepszym rozwiązaniem tego samego problemu.

**Do zrobienia:** zapisać to jako `wym-proj-0` w `opis.md`. Z tej tezy wynika cała reszta priorytetów, a nienazwana teza nie potrafi rozstrzygać sporów o kolejność.

---

## 2. Co już jest światowej klasy — i czego nie wolno rozmienić

| Rzecz                                                    | Dlaczego to przewaga                                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `wym-token-13` — domknięcie przechodnie nadpisań         | Realny błąd, który PrimeNG miał latami. Rozwiązany poprawnie, z testem regresyjnym porównującym token komponentowy w `:root` i w scope. |
| Bramka kontrastu jako policy skórki (`wym-token-11`)     | Nikt tego nie robi. `wym-token-12` (zakaz `opacity`) domyka lukę, przez którą matematyka na hexach kłamie o kompozycji z tłem.          |
| Signal forms bez `ControlValueAccessor` (`wym-real-9`)   | Zakład na przyszłość Angulara, zweryfikowany eksperymentem, nie założeniem. Będziecie ~2 lata przed Material.                           |
| `check-package` badający artefakt (`wym-real-36`)        | „Zielony build nie jest dowodem, że artefakt da się użyć" — zdanie warte całego rozdziału podręcznika.                                  |
| Kontrole odniesienia bramek (`wym-a11y-4`, `-38`, `-39`) | Metodyka wyższa niż w bibliotekach komercyjnych. Bramka, która zawsze przechodzi, jest groźniejsza niż jej brak.                        |
| Mapa kursora × `elementFromPoint` (`wym-real-27`)        | Wykryła klasę wad („widać, że da się kliknąć"), której nie widzi żaden audyt automatyczny.                                              |
| Oś ruchu w tokenach (`wym-a11y-5`)                       | Redukcja ruchu obowiązuje z jednej reguły, a nowy komponent dziedziczy ją przez samo użycie tokenu — zamiast startować od jej braku.    |
| Log `wym-real-*`                                         | **Klejnot projektu.** ADR z empirycznym dowodem przy każdej decyzji. Przy onboardingu ludzi wart więcej niż kod.                        |

Te rzeczy są przewagą **strukturalną** — konkurencja nie dogoni ich funkcją, tylko przepisaniem fundamentu. Każda decyzja o przyspieszeniu kosztem którejś z nich jest złym interesem.

---

## 3. Gdzie kierunek jest zagrożony

### A. Brak warstwy zachowań — największe ryzyko architektoniczne

Dziś każdy komponent jest budowany ręcznie, a `core` to 5 małych plików. Kolejne komponenty (dialog, menu, tooltip, popover, tabs, drawer, autocomplete, date picker, tree) potrzebują **tego samego zestawu**: focus trap, powrót fokusu, roving tabindex / `aria-activedescendant`, stos zamykania (kolejność Escape przy zagnieżdżonych nakładkach!), blokada scrolla, `inert` tła, live announcer, pozycjonowanie.

`wym-api-6` mówi, że CDK a11y „wiąże dopiero przy dialogu". To za późno o jeden komponent. Decyzja do podjęcia **teraz**: czy semantyka nakładek i fokusu należy do CDK, czy do was?

**Rekomendacja: mechanika z CDK, API własne.** Owinąć `Overlay`, `FocusTrap`, `LiveAnnouncer`, `Directionality` w warstwę `@pacit/components/core` tak, by typy CDK **nigdy** nie wyciekły do publicznego API. Wtedy CDK zostaje jedną wymienną zależnością, a nie wrasta w kontrakt.

Wzorzec macie gotowy — `PCT_FIELD` jest dokładnie tym: kontraktem, przez który obudowa i kontrolka rozmawiają, nie wiedząc o sobie nic ponad interfejs. Powtórzcie go dla nakładek.

### B. Select jest komponentem zamkniętym

`options: PctSelectOption<T>[]` to model PrimeNG i to jest jego sufit. Brakuje: rzutowanych `pct-option`, szablonu opcji, grup, wielokrotnego wyboru, filtrowania, czyszczenia, stanu ładowania/async, wirtualizacji.

Ważniejsze jest jednak co innego: **maszyneria listy** (typeahead, `enabledIndexes`, `moveActive`, `activeIndex`) siedzi jako prywatne metody w `PctSelect`. Tego samego potrzebują autocomplete, multiselect, menu, combobox i paleta poleceń.

**Wyciągnąć do `core` przed drugim konsumentem, nie po nim** — inaczej powtórzy się `wym-real-21` (ta sama logika skopiowana do czterech kontrolek), tylko na dużo większym kawałku i przy dużo droższej poprawce.

### C. Nic nie dowodzi, że biblioteka skaluje

Brak budżetu wydajności, benchmarku i testu na dużych danych. `@for` po wszystkich opcjach, zero wirtualizacji. Biblioteka mająca bić Telerika musi odpowiedzieć na „co się dzieje przy 10 000 wierszy / 5 000 opcji". To legalny wybór dla v0 — ale musi być **wyborem zapisanym**, bo zmienia wnętrze selecta i determinuje architekturę tabeli.

### D. Publiczne API nie jest kontrolowane maszynowo

`wym-token-7` obiecuje wersjonowany kontrakt `data-pct-part`. Dziś: nie ma spisu części, nie ma snapshotu publicznych eksportów, nie ma testu zapalającego, gdy ktoś zmieni nazwę inputu.

Dla biblioteki, której argumentem sprzedażowym jest „możesz bezpiecznie stylować wnętrze", to jest **obietnica bez bramki** — czyli dokładnie ten wzorzec, który sami krytykujecie w `wym-real-36`. To jedyne miejsce, w którym projekt zachowuje się jak zwykła biblioteka.

### E. Dokumentacja jest po polsku — łącznie z JSDoc

Najpoważniejsze pojedyncze znalezisko wobec celu „najlepsza znana biblioteka Angulara".

```ts
/** Wybrana wartość — wymagane pole kontraktu `FormValueControl`. */
readonly value = model<NoInfer<T> | null>(null);
```

Ten tekst wyświetla się **w podpowiedzi edytora u każdego konsumenta biblioteki** — nie w waszym repo, tylko u nich, przy każdym najechaniu na input.

Podział, który nic nie kosztuje:

- `opis.md`, `review.md`, log `wym-real-*` — **zostają po polsku.** Tam się myśli, a myśli się we własnym języku. To nie jest powierzchnia publiczna.
- README, docs app, **JSDoc na publicznym API**, CHANGELOG, komunikaty ostrzeżeń deweloperskich, szablony issue, komunikaty bramek widoczne dla konsumenta — **angielski.**

Ostrzeżenia w `[pctNumber]` już są angielskie i uzasadnienie w `wym-api-21` jest właściwe („czyta je programista, nie użytkownik"). JSDoc podlega tej samej zasadzie, tylko o krok dalej.

### F. Jedna przeglądarka, jedna platforma

`playwright.config.mts`: wyłącznie chromium, reszta zakomentowana. Dla biblioteki chwalącej się a11y to za mało — Safari ma najwięcej wad CSS (`:has()`, `inert`, `dialog`, `field-sizing`), a `forced-colors` testujecie wyłącznie emulacją.

Minimum: **webkit + firefox w macierzy funkcjonalnej.** Zrzuty wizualne zostają na linux/chromium — rasteryzacja i tak by je rozjechała, co sami zapisaliście w `snapshotPathTemplate`.

### G. Brak testu konsumenta

`.verdaccio/config.yml` i target `local-registry` w root `project.json` **istnieją i nie są przez nic używane**. Skoro własna lekcja brzmi „zielony build nie jest dowodem, że artefakt da się użyć", to logicznym następnym krokiem po `check-package` jest: `npm pack` → instalacja do świeżej aplikacji → build z SSR → jeden e2e. `check-package` bada artefakt statycznie; to sprawdziłoby go w użyciu.

---

## 4. RTL — decyzja

**Nie rezygnować. Ale też nie „wspierać" RTL — uczynić go ograniczeniem, nie funkcją.**

Uzasadnienie, bo pytanie było postawione uczciwie i zasługuje na liczby, nie na opinię.

**Uproszczenie, o które chodziło, nie istnieje.** `padding-inline-start` nie jest trudniejsze ani dłuższe od `padding-left`. Nie ma dywidendy do zainkasowania na warstwie CSS — arkusze i tak już konsekwentnie używają właściwości logicznych, więc rezygnacja nie oszczędziłaby ani jednej linii, tylko odebrała gwarancję, że tak zostanie.

**Realny koszt RTL leży gdzie indziej** i jest ograniczony: strzałki Lewo/Prawo muszą się zamieniać w układach poziomych (radiogroup, tabs, slider, carousel), nakładki muszą się odbijać (CDK `Directionality` to robi), `scrollLeft` ma inny znak. To praca przy **przyszłych** komponentach, nie przy obecnych.

**Koszt retrofitu jest nieliniowy.** Dziś: reguła lintu + oś w sandboxie + garść zrzutów ≈ 1–2 dni. Po 40 komponentach: tygodnie, plus polowanie na każdą strzałkę i animację o zaszytym kierunku.

**Rynkowo to bramka przetargowa, nie preferencja.** Material, PrimeNG, Telerik i Ant mają RTL. Biblioteka bez RTL wypada z postępowań w Zatoce, Izraelu i u części organizacji publicznych **odhaczeniem checkboxa, zanim ktokolwiek spojrzy na jakość** — czyli dokładna odwrotność strategii „wygrywamy jakością".

### Co zrobić

1. Zapisać jako wymaganie (`wym-styl-3`): _arkusze biblioteki używają wyłącznie właściwości logicznych_.
2. **Bramka:** reguła lintu (stylelint albo własny skrypt w duchu `check-package.mjs`) zakazująca `left`/`right`, `margin-left`, `padding-right`, `text-align: left|right`, `border-*-left` w `libs/components/**/*.scss`. Wyjątki wyłącznie z komentarzem uzasadniającym — macie już dwa dobre (`border-right-color` spinnera, symetryczne `left: 50%` w strefach trafienia).
3. **Oś `dir` w powłoce sandboxa** — tej samej postaci co istniejące osie motywu, skórki i wielkości. Wtedy każdy widok staje się przy okazji testem RTL, bez pisania osobnych przykładów. To ta sama sztuczka, którą już zastosowaliście w `wym-sbx-2` dla motywu.
4. Jeden zrzut wizualny RTL per komponent + audyt axe w RTL.
5. **Wytyczyć granicę wprost:** _„układ się odbija; pełnego bidi (mieszane kierunki w jednym ciągu tekstu, izolacja przy skracaniu etykiet) nie rozwiązujemy w v1"_.

Świadomie wyłączyć należy **pełne bidi**, nie RTL. To jest ta uczciwa rezygnacja, o którą pytanie chodziło.

---

## 5. Znaleziska w kodzie

### 5.1 Brak `aria-label` na kontrolkach z rolą wewnątrz — realna luka a11y

`<pct-select aria-label="Kraj">` ląduje na hoście `<pct-select>`, który nie ma roli. `role="combobox"` jest na wewnętrznym `<button>`. Samodzielny select bez `label` i bez obudowy jest **nienazwanym comboboxem**, a konsument nie ma jak tego naprawić.

Potrzebne: jawne inputy `ariaLabel` / `ariaLabelledby` przenoszone na element z rolą. Dla biblioteki tej klasy to obowiązkowa furtka — dotyczy `pct-select` i każdego przyszłego komponentu, w którym rola nie siedzi na hoście.

### 5.2 `PCT_TEXTS` nie przeżyje zmiany języka w runtime

`providePctTexts` zwraca `{ provide, useValue }` — statyczny obiekt. `PctSelect` czyta go raz:

```ts
protected readonly texts = inject(PCT_TEXTS);
readonly placeholder = input<string>(this.texts.selectPlaceholder); // odczyt przy konstrukcji
```

Aplikacja przełączająca język bez przeładowania strony (bardzo częsty wzorzec) **nie zobaczy nowych napisów** — nawet gdyby podmieniła zawartość tokenu, `placeholder` ma już wartość domyślną z chwili konstrukcji.

Do rozstrzygnięcia zanim `PCT_TEXTS` urośnie: albo token niesie `Signal<PctTexts>`, albo `providePctTexts` przyjmuje fabrykę, albo zapisujemy wprost, że zmiana języka wymaga przeładowania. Trzecia opcja jest obronna, ale musi być decyzją, nie przeoczeniem — dziś nie jest nigdzie zapisana.

### 5.3 `_tokens.scss` jest generowany, wieziony w pakiecie i używany przez zero linii kodu

Komponenty piszą `var(--pct-*)` surowymi łańcuchami (159 unikalnych, zero `@use` w arkuszach komponentów). `wym-token-2` wymaga map SCSS „do użytku wewnętrznego" — użytku nie ma.

Albo usunąć z wymagania i z pakietu, albo uczynić obowiązkową drogą odwołania do tokenu. Za drugim przemawia `wym-real-43` (literówka ma być błędem kompilacji), choć akurat tu `check-package` łapie literówkę post factum — więc to nie żywa wada, tylko martwy artefakt w publikowanym pakiecie.

### 5.4 `track option.value` w `select.html`

Dla `T` nieprymitywnego to śledzenie po referencji, a dwie opcje o tej samej wartości dają NG0955 w dev mode. Przy generycznym `T` nic tego nie broni. Albo `track $index`, albo udokumentowany wymóg unikalności z ostrzeżeniem pod `isDevMode()`.

### 5.5 `PctField.attach()` — ostatni wygrywa po cichu

`private readonly control = signal<PctFieldControl | null>(null)`; `attach` po prostu nadpisuje. Dwie kontrolki w jednej obudowie to cicha wada z gatunku tych, które projekt zwykle łapie. Tani `console.warn` pod `isDevMode()`.

### 5.6 Brak `LICENSE` w repo i `repository` w manifeście

Wiecie o tym (`check-package` ostrzega, tabela „Czego jeszcze nie ma" to wymienia), ale `"license": "MIT"` w manifeście bez pliku LICENSE to formalnie niepełna licencja — a to pierwsza rzecz, którą sprawdza dział prawny konsumenta korporacyjnego.

### 5.7 Próg 80% pokrycia jest zadeklarowany i nieegzekwowany

`wym-proj-4` / `wym-real-5`. To jedyne miejsce, gdzie projekt łamie własną naczelną zasadę: obietnica bez bramki. Zarazem najstarszy dług — im dłużej, tym więcej do nadrobienia.

---

## 6. Mapa drogowa

Logika kolejności: **najpierw zbuduj maszynę, która czyni komponenty poprawnymi z konstrukcji, potem produkuj komponenty szybko.** Odwrotna kolejność to powód, dla którego PrimeNG ma 90 komponentów i problemy a11y w połowie z nich.

### Faza 0 — domknąć obietnice już złożone

Wszystko tutaj drożeje z każdym kolejnym komponentem.

| Zadanie                                                                        | Zamyka                     |
| ------------------------------------------------------------------------------ | -------------------------- |
| `coverageInclude` + egzekwowany próg pokrycia                                  | `wym-proj-4`, `wym-real-5` |
| Snapshot publicznego API TS (`api-extractor` → `.api.md` w repo)               | ryzyko D                   |
| Generowany inwentarz `data-pct-part` + bramka na niezaakceptowaną zmianę       | `wym-token-7`, ryzyko D    |
| Snapshot nazw tokenów (już generujecie `tokens.ts` — dołożyć bramkę)           | `wym-token-2`              |
| JSDoc publicznego API + README na angielski                                    | ryzyko E                   |
| RTL: wymaganie + lint + oś `dir` w sandboxie + zrzuty                          | sekcja 4                   |
| Domknięcie kształtu `PctConfig` **wraz ze strategią domyślnych per komponent** | `wym-api-8`                |
| Macierz przeglądarek: + webkit, + firefox (funkcjonalnie)                      | ryzyko F                   |
| `LICENSE`, `repository`                                                        | gotowość do publikacji     |
| Test konsumenta na Verdaccio (`pack` → install → build SSR → e2e)              | ryzyko G                   |
| Naprawy 5.1–5.5                                                                | —                          |

Uwaga do `PctConfig`: pytanie nie brzmi „jakie pola dołożyć", tylko **„czy domyślne per komponent idą przez konfigurację (`providePctConfig({ button: { variant: 'outline' } })`), czy przez tokeny"**. Material i PrimeNG oba skończyły na dostawcach domyślnych. Zdecydować przed piętnastym komponentem, bo później to zmiana łamiąca w każdym z nich.

### Faza 1 — warstwa zachowań w `core`

To, co czyni Fazę 2 szybką.

- **Nawigacja po liście**: `activeIndex`, typeahead, pomijanie wyłączonych — wyciągnąć z `PctSelect`.
- **Nakładka**: pozycjonowanie, stos zamykania (kolejność Escape przy zagnieżdżeniu), klik na zewnątrz, `inert` tła, blokada scrolla, dziedziczenie motywu i pisma. To ostatnie jest **rozwiązane raz w `wym-real-35` — uogólnić**, bo lekcja brzmiała „każda właściwość dziedziczona jest po cichu zerwana w nakładce", a więc to reguła, nie osobliwość selecta.
- **Fokus**: trap, powrót, fokus początkowy, roving tabindex jako alternatywa dla `aria-activedescendant`.
- **Live announcer**: jeden kanał `polite`, jeden `assertive`, z deduplikacją — nie region per komponent.
- **`*pctTemplate` / `TemplateRef`** (`wym-api-7`) — odblokowuje też ikony.
- **Ikony** (`wym-ikon-2`): `pct-icon` przyjmujący rzutowany SVG **plus** token `PCT_ICONS` mapujący nazwy semantyczne (`chevron-down`, `check`, `close`, `calendar`) na szablony, z wbudowanymi wpisanymi domyślnymi. Spełnia naraz „zero zależności" i „podmień na swój zestaw", bez zmuszania nikogo do jednego i drugiego.

### Faza 2 — komponenty w kolejności długu architektonicznego

1. **Dialog** — wymusza focus trap, blokadę scrolla, `inert`, powrót fokusu, stos Escape, bezpieczeństwo SSR. Najwyższy zysk architektoniczny na komponent.
2. **Tooltip + Popover** — wymusza rozróżnienie „opisuje vs nazywa", parytet hover/focus/touch (tooltip to najczęściej zepsuty komponent w _każdej_ bibliotece) i redukcję ruchu na realnym wejściu/wyjściu, na co `wym-api-9` czeka.
3. **Menu** — roving focus, podmenu, ponowne użycie typeaheadu z Fazy 1.
4. **Domknięcie rodziny select** — rzutowane `pct-option`, szablon opcji, grupy, wielokrotny wybór, filtrowanie, czyszczenie, async/ładowanie, wirtualizacja. Świadomie **po** warstwie zachowań, inaczej budujecie to dwa razy.
5. **Switch, Textarea (autosize), Slider, Date picker** — date picker jest najbardziej pożądany i najtrudniejszy; wymusza głębokie i18n (kalendarze, pierwszy dzień tygodnia, formaty locale), co `[pctNumber]` już zaczęło.
6. **Table / DataGrid** — prawdziwy różnicownik wobec wszystkich. Musi stać na **headless rdzeniu** (model kolumn, sortowanie, filtrowanie, grupowanie, zaznaczenie — wszystko jako sygnały) oddzielonym od renderowania. Inaczej stanie się tym komponentem, który wszyscy forkują.
7. Toast, Tabs, Accordion, Drawer, Pagination, Progress, Skeleton, Chips, Avatar, Badge, Breadcrumb, Stepper, Tree.

### Faza 3 — powierzchnia zaufania

`apps/docs` renderujący **wygenerowane** inwentarze części i tokenów (nie pisane ręcznie), przewodniki migracji, macierz kompatybilności, opublikowane benchmarki, raport zgodności a11y i log testów z czytnikami ekranu.

Uwaga do kolejności: `opis.md` umieszcza `apps/docs` przy „pierwszym zewnętrznym użytkowniku". To za późno w jednym konkretnym aspekcie — **spis części i tokenów musi być generowany i bramkowany od Fazy 0**. Ładna strona, która to renderuje, może przyjść w Fazie 3. Te dwie rzeczy trzeba rozdzielić.

---

## 7. Co odróżnia „bardzo dobrą" od „najlepszej na świecie"

Fazy 0–3 dają bibliotekę lepszą technicznie od konkurencji. Poniższe rzeczy decydują o tym, czy ktokolwiek to zauważy i czy da się na tym zbudować adopcję. Wszystkie są wykonalne dopiero po Fazie 1, ale planować trzeba je teraz, bo część wpływa na kształt API.

### 7.1 „Definition of Done" komponentu — najważniejszy pojedynczy artefakt do napisania

Dziś jakość każdego komponentu bierze się z tego, że budowała go ta sama osoba w tym samym trybie uwagi. To nie skaluje się ani na drugą osobę, ani na dwudziesty komponent. Potrzebna jest lista, którą komponent musi przejść, żeby wejść do wydania — w maksymalnym stopniu **sprawdzana maszynowo**, nie ludzkim okiem:

| Kryterium                                                          | Jak sprawdzane                   |
| ------------------------------------------------------------------ | -------------------------------- |
| Wzorzec z ARIA APG wskazany wprost w JSDoc klasy                   | review                           |
| Mapa klawiatury spisana i przetestowana klawisz po klawiszu        | e2e                              |
| `forced-colors: active` — stan nie niesiony samą barwą             | e2e (macie już wzorzec)          |
| `prefers-reduced-motion` — czas z tokenu, nie z arkusza            | e2e + grep na `@media` w arkuszu |
| RTL — brak właściwości fizycznych, zrzut w `dir="rtl"`             | lint + zrzut                     |
| SSR + hydracja bez `NG05xx`                                        | bramka w `visit()` (macie)       |
| Formularze: signal forms **i** `[formControl]` **i** `[(ngModel)]` | testy jednostkowe                |
| Oś wielkości `sm`/`md`/`lg` wyrównana do `--pct-control-height-*`  | e2e pomiarowy (macie)            |
| Oś gęstości                                                        | po `wym-token-8`                 |
| Obszar dotyku ≥ 24×24 px wprost, nie przez wyjątek odstępu         | e2e (macie)                      |
| Części `data-pct-part` zarejestrowane w inwentarzu                 | bramka z Fazy 0                  |
| Tokeny zarejestrowane + wpis w `contrast.policy.json`              | build tokenów                    |
| Zrzut wizualny + audyt axe na własnym widoku sandboxa              | e2e (macie)                      |
| Log testu z czytnikiem ekranu                                      | ręcznie, patrz 7.2               |
| Strona docs z żywymi przykładami                                   | Faza 3                           |
| Budżet rozmiaru entrypointu                                        | patrz 7.2                        |

Połowa tego już istnieje jako rozproszone praktyki. Wartość polega na spisaniu i wymuszeniu — inaczej dwudziesty komponent dostanie tylko te kontrole, o których ktoś akurat pamiętał.

### 7.2 Bramki, których jeszcze nie ma

Konsekwentnie z tezą `wym-proj-0` — każda z poniższych obietnic potrzebuje maszyny, która potrafi na niej zapalić:

- **Budżet rozmiaru per entrypoint.** Dziś `field` to 62 kB, `select` 43 kB w FESM. Bez budżetu nikt nie zauważy, kiedy się podwoi. Śledzić w czasie, failować na skoku.
- **Weryfikacja tree-shakingu.** `wym-ws-5` obiecuje, że primary entrypoint jest minimalny i że importuje się przez secondary. Nic tego nie sprawdza: test powinien zbudować aplikację importującą **wyłącznie** `@pacit/components/button` i sprawdzić, że w bundlu nie ma ani `PctField`, ani CDK Overlay.
- **Testowanie mutacyjne rdzenia** (Stryker na `core`, `number`, `select`). To jedyna metoda, która odpowiada na pytanie „czy te testy w ogóle coś łapią" — czyli dokładnie pytanie, które projekt zadaje sobie przy każdej bramce. 136 zielonych testów nie jest jeszcze dowodem.
- **Testy własnościowe parsera liczb.** `[pctNumber]` ma parsowanie szersze od formatowania, wiele locale i domykanie do granic. To idealny kandydat na fuzz: „dla dowolnego `n` i dowolnego locale, `parse(format(n)) === n`". Ta jedna własność pokryje przypadki, których nikt nie wymyśli ręcznie.
- **Wykrywanie wycieków pamięci.** Wyciek timera w `PctSelect` złapaliście czytaniem kodu. Przy dwudziestu komponentach z nakładkami potrzebny jest test montujący i niszczący komponent N razy i sprawdzający liczbę detached nodes.
- **Bramka zoneless.** `wym-real-8` usunęło `zone.js` i chwali się, że „powrót jest niemożliwy przez przypadek". Nic tego nie pilnuje: test powinien failować, gdy `zone.js` pojawi się w drzewie zależności albo `window.Zone` w bundlu.
- **Zautomatyzowane testy z czytnikiem ekranu.** Istnieją narzędzia sterujące NVDA i VoiceOver z poziomu testów (guidepup). Nawet kilka scenariuszy — „co czytnik ogłasza po otwarciu selecta", „co po zmianie wartości" — daje wam coś, czego nie ma **żadna** biblioteka Angulara. Axe bada strukturę; on nie słyszy.

### 7.3 Zgodność formalna — najkrótsza droga do adopcji korporacyjnej

W 2026 to nie jest ozdobnik, tylko warunek wejścia:

- **European Accessibility Act** jest egzekwowalny od czerwca 2025. Produkty cyfrowe sprzedawane konsumentom w UE muszą być dostępne. Firmy panicznie szukają komponentów, którymi da się to udowodnić.
- **EN 301 549** — norma przywoływana w każdym europejskim przetargu publicznym.
- **VPAT / ACR** — dokument, którego dział zakupów wymaga zanim ktokolwiek zobaczy kod.

Nikt w ekosystemie Angulara nie dostarcza biblioteki z gotowym ACR-em i z **maszynowym dowodem** stojącym za każdym punktem. Wy macie ten dowód wcześniej niż dokument — to odwrotność normy w branży i najmocniejszy możliwy materiał sprzedażowy. Wygenerowanie ACR-a z istniejących bramek jest w dużej mierze pracą redakcyjną.

Do tego: przewodnik CSP (Angular emituje style inline — konsument z restrykcyjnym `style-src` musi wiedzieć, co zrobić), SBOM przy wydaniu, opisana polityka bezpieczeństwa. Provenance już macie.

### 7.4 Most do narzędzi projektowych

Źródłem prawdy jest DTCG (`wym-token-1`) i to jest **niewykorzystany atut**. Format jest czytany i zapisywany przez Figmę / Tokens Studio. Dwukierunkowa synchronizacja — projektant zmienia token w Figmie, PR podnosi bramkę kontrastu, build wypuszcza skórkę — to workflow, którego nie ma żadna biblioteka Angulara, a który sprzedaje się sam każdemu zespołowi z designerem.

Wiąże się to z `wym-theme-5` (ścieżka budowania skórki przez osobę z zewnątrz). Zrobione razem, dają kompletną historię: _„twój projektant definiuje motyw w Figmie, nasza bramka nie pozwoli mu wypuścić motywu o za niskim kontraście"_. To jest zdanie, które wygrywa prezentacje.

### 7.5 Powierzchnia dla agentów AI

W 2026 znaczna część kodu powstaje z udziałem asystentów. Biblioteka, której agent używa poprawnie za pierwszym razem, wygrywa z biblioteką lepszą technicznie, którą agent stale używa źle. Konkretnie:

- `llms.txt` w pakiecie i na stronie docs — zwięzły katalog komponentów, inputów i wzorców użycia.
- Maszynowo czytelny katalog (JSON) generowany z tego samego źródła co docs — komponenty, inputy, typy, części, tokeny.
- Kilkanaście kanonicznych przykładów per komponent, oznaczonych jako referencyjne.
- Ewentualnie serwer MCP dla biblioteki — macie już MCP Angular CLI w `.mcp.json`, więc wzorzec jest wam znajomy.

Koszt jest niski, bo wszystkie te dane i tak generujecie na potrzeby docsów i bramek z Fazy 0. To głównie kwestia drugiego formatu wyjścia.

### 7.6 i18n na poważnie

`PCT_TEXTS` to dobry początek i dobra decyzja (osobny token, nadpisywanie częściowe). Do domknięcia:

- reaktywność przy zmianie języka w runtime (znalezisko 5.2),
- liczba mnoga / ICU tam, gdzie napis zawiera liczbę („wybrano 3 z 17"),
- zgodność z `$localize` dla aplikacji używających natywnego i18n Angulara,
- formaty dat, liczb i walut per locale (`[pctNumber]` zaczęło, date picker to domknie),
- **pierwszy dzień tygodnia, kalendarze niegregoriańskie** — to jest dokładnie ta praca, która razem z RTL otwiera rynki Bliskiego Wschodu.

### 7.7 Wydajność jako opublikowana liczba

Jeśli jesteście szybsi od PrimeNG i Material — udowodnijcie to publicznie, powtarzalnym harnessem w repo: czas pierwszego renderu, czas aktualizacji przy 1 000 wierszy, rozmiar bundla dla typowego formularza, koszt hydracji. Benchmark, który konkurencja może u siebie uruchomić, jest wiarygodny; wykres w README nie jest.

To jest też bramka: regresja wydajności ma failować CI, a nie być zauważona przez konsumenta.

### 7.8 Zarządzanie projektem jako sygnał zaufania

Firma nie kupuje biblioteki na podstawie kodu, tylko na podstawie przewidywalności:

- polityka wersjonowania i **okno wsparcia** (ile wersji Angulara wstecz, jak długo),
- polityka deprecacji (ile minorów ostrzeżenia przed usunięciem),
- kolekcja migracji **z realnymi migracjami** — dziś jest pusta, i słusznie jest w pakiecie od pierwszego wydania (`wym-wer-2`), ale pierwsza zmiana łamiąca musi przyjechać z codemodem, nie z akapitem w CHANGELOG-u,
- publiczna mapa drogowa i proces RFC dla zmian API,
- CONTRIBUTING z „Definition of Done" z 7.1,
- kanały `beta`/`rc` z `dist-tag` (`wym-wer-1` zostawia to do doprecyzowania).

---

## 8. Kolejność scalona

```
Faza 0  ──  bramki i obietnice          (2–3 tyg.)   blokuje wszystko
Faza 1  ──  warstwa zachowań w core     (3–4 tyg.)   blokuje Fazę 2
Faza 2  ──  dialog → tooltip → menu → select → pola → tabela
             └─ równolegle: 7.1 DoD, 7.2 bramki (każda przy pierwszym komponencie, który jej potrzebuje)
Faza 3  ──  apps/docs, ACR, benchmarki, most Figma, powierzchnia AI
```

Jedyna kolejność, której nie wolno odwrócić: **7.1 („Definition of Done") musi powstać przed pierwszym komponentem Fazy 2**, bo inaczej dialog zostanie zbudowany bez części kontroli i stanie się wzorcem dla następnych.

---

## 9. Oś i jej bramka

Pierwsza wersja tej sekcji brzmiała: _„nazwać oś, na której wygrywacie, i napisać dla niej bramkę"_ — i skleiła dwie różne rzeczy, sugerując, że bramką dla osi jest bramka na `data-pct-part`. Nieprawda; to dwie sprawy o różnym rzędzie wielkości. Poniżej rozdzielone.

### 9.1 Czym jest oś

Oś to wymiar konkurencyjny, na którym wygrywacie. Konkurencja ma swoje: PrimeNG — liczba komponentów, Material — wierność specyfikacji i marka Google, Telerik — kontrakt wsparcia i głębia tabeli, Spartan — headless i własność kodu przez copy-paste.

Waszej nie da się zgadnąć z README, ale **da się ją wyczytać z `wym-real-*`**. Ten log wygląda na zbiór niezależnych lekcji, a jest dziewięcioma wystąpieniami jednej — patrz tabela w `wym-proj-0` (`opis.md`). Każda z nich mówi „po cichu", „nikt tego nie widział", „urodził się martwy", „przetrwała".

Stąd nazwa osi:

> **`wym-proj-0` — W tej bibliotece nic nie psuje się po cichu.**

Trzy powody, żeby nazwać ją przez **cichą wadę**, a nie przez „weryfikowalność" czy „jakość":

1. Jest wyprowadzona z waszych własnych dowodów, nie z ambicji marketingowej.
2. Wyjaśnia, **dlaczego** każda bramka potrzebuje kontroli odniesienia — bramka bez niej jest kolejną cichą wadą, tylko piętro wyżej.
3. Jest zdaniem, które człowiek trzyma w głowie **pisząc kod**. „Weryfikowalność obietnic" nie jest.

### 9.2 Czego oś dotyczy

Nie a11y, nie tokenów, nie testów. Dotyczy **klasy awarii przechodzącej przez wszystkie warstwy** — tej, w której platforma na błąd odpowiada milczeniem:

| warstwa       | co robi platforma zamiast błędu                       | gdzie u was                    |
| ------------- | ----------------------------------------------------- | ------------------------------ |
| CSS           | brak `var()` → wartość początkowa                     | `wym-real-36`, `check-package` |
| odczyt DOM    | nieistniejący token → `''`                            | `wym-real-43`                  |
| infra testowa | brak wzorca zrzutu → zapisz bieżący jako poprawny     | `wym-real-39`                  |
| infra testowa | emulacja nie dociera → test na wartościach domyślnych | `wym-real-38`                  |
| graf builda   | brak krawędzi → build się udaje, wyjście złe          | `wym-real-36`                  |
| SSR           | rozjazd id → cichy re-render, ARIA w próżnię          | `wym-real-31`                  |
| a11y          | stan samą barwą → znika w `forced-colors`             | `wym-real-40`                  |
| typy          | `T` za szerokie → sprzeczne wiązania kompilują się    | `wym-real-37`                  |

Wspólny mianownik: **domyślne zachowanie warstwy to „nic się nie stało"**. Dlatego brak bramki nigdy nie objawia się jako brak — objawia się jako zieleń.

### 9.3 Bramka dla samej osi

Bramka dla osi nie dotyczy części ani tokenów. Dotyczy **`opis.md`**.

Rozjazd dokumentu z rzeczywistością już wystąpił i już go raz łatano. Nagłówek „Jak czytać ten dokument" istnieje dokładnie dlatego, że wymagania dawały się czytać jako opis stanu kodu — a odpowiedzią było **ręczne dopisanie 18 adnotacji** (`495483d`). To ten sam wzorzec co ręczny `node libs/tokens/build.mjs` w CI sprzed `wym-real-36`: obejście maskujące brak struktury zamiast go ujawnić.

Bramką jest **rejestr, w którym każde wymaganie wskazuje swoją bramkę i jej kontrolę odniesienia** (`wym-proj-6`):

| kolumna    | znaczenie                                                              |
| ---------- | ---------------------------------------------------------------------- |
| `wym-*`    | obietnica                                                              |
| `bramka`   | ścieżka do targetu / testu / skryptu, który na niej zapala             |
| `kontrola` | test dowodzący, że ta bramka potrafi **nie** przejść                   |
| `stan`     | **wyprowadzony**, nie wpisany: `egzekwowane` / `brak (świadomie, bo…)` |

Skrypt czyta `opis.md` i sprawdza trzy rzeczy: (1) wymaganie ma wpis, (2) wskazany target/plik **istnieje i jest wpięty w CI**, (3) kontrola odniesienia istnieje. Punkt (2) to dokładnie ta sama kontrola, co punkt 5 w `check-package.mjs`, gdzie sprawdzacie, że fabryka schematica wskazuje na skompilowany plik, a nie na TS sprzed builda.

Świadomy brak bramki jest dozwolony — musi być wpisany **wraz z powodem**. Wtedy `_(niezrealizowane)_` przestaje być adnotacją, którą ktoś pamiętał dopisać, a staje się wyprowadzoną konsekwencją stanu rejestru: dokument przestaje kłamać z definicji, a nie z dyscypliny.

Efekt uboczny, właściwie główna korzyść: **dopisanie wymagania bez bramki przestaje być możliwe po cichu.** Oś zaczyna egzekwować samą siebie.

### 9.4 Kolejność — odwrotna, niż sugerowała pierwsza wersja

`data-pct-part` to nie jest bramka dla osi. To **pierwsza pozycja, którą rejestr zapali na czerwono** — razem z progiem pokrycia 80%, tree-shakingiem primary entrypointu (`wym-ws-5`), nieodwracalnością zoneless (`wym-real-8`), intencją RTL i kilkoma innymi.

Czyli: **najpierw rejestr, potem to, co rejestr wskaże.** Bo rejestr powie wam, ilu braków jeszcze nie widzicie — dziś szacuję 6–10, ale to zgadywanie i na tym polega problem. Policzy je dopiero maszyna.

To jest jedyne miejsce w repozytorium, w którym projekt zachowuje się jak zwykła biblioteka: obietnica w dokumentacji, bez maszyny potrafiącej na niej zapalić. Wszystko inne tutaj jest lepsze od tego standardu — i to jest właśnie powód, żeby ten jeden wyjątek zamknąć jako pierwszy.
