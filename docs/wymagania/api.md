# Wymagania — API komponentów

Kontrakt, który widzi konsument: nazwy, wejścia, wyjścia, sloty, części i konfiguracja.
Obszar wchłonął dawną sekcję ikon oraz kontrakt `data-pct-part`, który leżał wśród
tokenów, choć jest API stylowania, a nie tokenem. Mapowanie starych identyfikatorów jest
w [tabeli migracji](../README.md#migracja-identyfikatorów-2026-07-27).

> Kształt wpisu i znaczenie pól **Bramka** / **Kontrola** opisuje
> [README](../README.md#kształt-wymagania).

---

## Fundament

### <a id="wym-api-nazwy"></a>`wym-api-nazwy` — Nazewnictwo wg nowego style guide

**Obietnica.** Klasa `PctButton` (bez sufiksu `Component`), plik `button.ts` (bez
`.component.`), selektor elementu kebab-case (`pct-field`), selektor atrybutowy
camelCase (`[pctButton]`).

**Bramka:** `libs/components/eslint.config.mjs` — `@angular-eslint/component-selector`,
`directive-selector`, `component-class-suffix`
**Kontrola:** brak — świadomie: reguła ESLint nie ma trybu cichego przejścia

---

### <a id="wym-api-fundament"></a>`wym-api-fundament` — Standalone, OnPush, zoneless-safe

**Obietnica.** Każdy komponent jest standalone, OnPush i zoneless-safe (stan wyłącznie
przez signals, zero polegania na `zone.js`). Zamiast `ngOnChanges` → `computed`/`effect`.
**Ani `standalone: true`, ani `changeDetection` nie są ustawiane jawnie** — w Angularze
v22+ oba są domyślne, a oficjalny przewodnik zabrania ich powtarzania.

**Bramka:** `tools/check-zoneless.mjs` (target `check-zoneless`, w CI) — pomiar
`ɵcmp.onPush === true` i `ɵcmp.standalone === true` dla **każdego** komponentu ze
zbudowanego pakietu, do tego mianownik (każdy `@Component` ze źródeł musi być w pakiecie
— inaczej „każdy" liczy się na próbce, która cicho się kurczy) i zakaz powtarzania obu
wartości domyślnych w dekoratorze. Odczyt idzie z `dist`, nie ze źródeł, i to nie jest
wygoda: deklaracja częściowa **pomija** `changeDetection`, gdy jest domyślne, więc
wartość powstaje dopiero przy linkowaniu i tylko tam da się ją zmierzyć
([`lekcja-46`](../lekcje.md#lekcja-46)). Poza tym testy jednostkowe biblioteki
konfigurują zoneless w `TestBed` (`libs/components/*/src/*.spec.ts`), więc komponent
polegający na `zone.js` przewraca własny test
**Kontrola:** `tools/check-zoneless.fixtures/` — spreparowane wejścia, po jednym na sposób
rozbrojenia pomiaru (pusty zbiór komponentów źródłowych, komponent poza pakietem,
`onPush: false`, `standalone: false`, dekorator powtarzający domyślne). Każde musi zostać
odrzucone **przez ten punkt, który deklaruje**, a wejście wzorcowe — przejść. Do tego
przebieg na prawdziwym repozytorium: `ChangeDetectionStrategy.Default` dopisane do
`PctButton` zapala punkt 6 od razu (skan źródeł), a po przebudowie pakietu punkt 5 —
pomiar `ɵcmp` na `dist`; osobno przebieg dowodzący, że parser dekoratorów zgłasza własny
rozjazd (7 rozpoznanych z 8) zamiast po cichu pomniejszać mianownik
**Lekcje:** [`lekcja-7`](../lekcje.md#lekcja-7), [`lekcja-11`](../lekcje.md#lekcja-11),
[`lekcja-46`](../lekcje.md#lekcja-46)

---

### <a id="wym-api-sygnaly"></a>`wym-api-sygnaly` — Wejścia i wyjścia przez signals

**Obietnica.** `input()` / `input.required()` / `output()`, dwukierunkowe przez
`model()`. Boolean przez `booleanAttribute`, liczby przez `numberAttribute`. Nazwy
zgodne z natywnym HTML tam, gdzie to możliwe (`disabled`, `readonly`, `size`, `variant`,
`loading`, `invalid`) — bez prefiksu `pct`.

**Bramka:** `libs/components/button/src/button.spec.ts`,
`libs/components/checkbox/src/checkbox.spec.ts` — wiązanie atrybutem i właściwością
**Kontrola:** brak — świadomie: błędna transformacja objawia się złym typem w szablonie,
czyli błędem kompilacji — nie należy do klasy [`wym-os`](../00-os.md)
**Lekcje:** [`lekcja-12`](../lekcje.md#lekcja-12)

---

### <a id="wym-api-atrybuty"></a>`wym-api-atrybuty` — Stan jako `data-pct-*`, nie klasy CSS

**Obietnica.** Stan reflektowany na hoście jako atrybuty `data-pct-*` (np.
`data-pct-size`, `data-pct-disabled`), nie jako klasy CSS.

**Bramka:** `apps/sandbox-e2e/src/states.spec.ts` — widok przekrojowy stanów odpytuje po
atrybutach
**Kontrola:** brak — świadomie: selektor trafiający w nic daje pusty locator, czyli
**czerwony** test, nie zielony
**Decyzja:** [0013 — bez podziału na rdzeń bezgłowy i skórkę](../decyzje/0013-bez-podzialu-na-rdzen-i-skorke.md)

---

### <a id="wym-api-konfiguracja"></a>`wym-api-konfiguracja` — Konfiguracja globalna `providePctConfig`

**Obietnica.** Konfiguracja globalna wzorcem `providePctConfig({…})` z tokenem DI,
nadpisywalna per komponent przez inputy.

**Bramka:** `libs/components/button/src/button.spec.ts` — domyślny `size` z konfiguracji
i jego nadpisanie inputem
**Kontrola:** brak — świadomie: test porównuje dwie **różne** wartości, więc nie może
przejść na wartościach domyślnych
**Wiąże przy:** rozstrzygnięciu, **czy domyślne per komponent idą przez konfigurację**
(`providePctConfig({ button: { variant: 'outline' } })`), **czy przez tokeny** — Material
i PrimeNG oba skończyły na dostawcach domyślnych. Decyzja przed piętnastym komponentem,
bo później to zmiana łamiąca w każdym z nich
**Decyzja:** [0007 — konfiguracja osobno od tekstów](../decyzje/0007-konfiguracja-i-teksty.md)

> Dziś `PctConfig` ma **jedno pole** (`defaultSize`). Mechanizm działa; kształt jest
> otwarty.

---

## Formularze

### <a id="wym-api-signal-forms"></a>`wym-api-signal-forms` — Kontrolki to natywne kontrolki signal forms

**Obietnica.** Kontrolki implementują `FormValueControl` (lub `FormCheckboxControl`)
z `@angular/forms/signals`. **`ControlValueAccessor` NIE jest implementowany** — mimo to
`[formControl]`, `formControlName` i `[(ngModel)]` działają bez warstwy kompatybilności.

**Bramka:** `libs/components/field/src/field-controls.spec.ts`,
`apps/sandbox-e2e/src/forms.spec.ts` — wszystkie trzy API formularzy na tej samej
kontrolce
**Kontrola:** testy startują z **niepustą** wartością początkową — z pustym modelem
regresja z [`lekcja-26`](../lekcje.md#lekcja-26) była niewidoczna
**Decyzja:** [0005 — signal forms bez CVA](../decyzje/0005-signal-forms-bez-cva.md)
**Lekcje:** [`lekcja-9`](../lekcje.md#lekcja-9), [`lekcja-20`](../lekcje.md#lekcja-20),
[`lekcja-26`](../lekcje.md#lekcja-26)

---

### <a id="wym-api-kontener"></a>`wym-api-kontener` — W komponencie złożonym kontrolką jest kontener

**Obietnica.** W grupie (`pct-radio-group` + `pct-radio`) kontrakt `FormValueControl`
implementuje wyłącznie kontener — z punktu widzenia formularza edytowana jest jedna
wartość. Elementy składowe komunikują się z kontenerem przez DI i nie mają własnego
stanu formularza.

**Bramka:** `libs/components/radio/src/radio.spec.ts`
**Kontrola:** brak — świadomie: naruszeniem byłby drugi `FormValueControl` w drzewie,
co Angular zgłasza sam
**Lekcje:** [`lekcja-16`](../lekcje.md#lekcja-16)

---

### <a id="wym-api-obudowa"></a>`wym-api-obudowa` — Kontrolki formularza to obudowa + kontrolka

**Obietnica.** `pct-field` dostarcza etykietę, podpowiedź, komunikat błędu, znacznik
wymagalności i sloty `[pctPrefix]` / `[pctSuffix]`. Kontraktu formularza **nie
implementuje obudowa**, lecz kontrolka w środku — dzięki czemu typowanie zostaje przy
rodzaju pola. Kontrolka rejestruje się przez token `PCT_FIELD`; obudowa oddaje jej
identyfikatory opisów do `aria-describedby`.

**Bramka:** `libs/components/field/src/field.spec.ts`,
`apps/sandbox-e2e/src/field.spec.ts`, `apps/sandbox-e2e/src/field-hitarea.spec.ts`
**Kontrola:** `field-hitarea.spec.ts` — mapa kursora po siatce punktów
(`elementFromPoint` × `getComputedStyle().cursor`); test mierzy **całą** powierzchnię
ramki, więc nie może przejść przy niepokrytym pasie
**Decyzja:** [0003 — obudowa i kontrolka](../decyzje/0003-obudowa-i-kontrolka.md)
**Lekcje:** [`lekcja-21`](../lekcje.md#lekcja-21),
[`lekcja-22`](../lekcje.md#lekcja-22), [`lekcja-24`](../lekcje.md#lekcja-24),
[`lekcja-27`](../lekcje.md#lekcja-27), [`lekcja-28`](../lekcje.md#lekcja-28),
[`lekcja-34`](../lekcje.md#lekcja-34)

---

### <a id="wym-api-bez-obudowy"></a>`wym-api-bez-obudowy` — Obudowa jest opcjonalna

**Obietnica.** Kontrolki działają też bez `pct-field` (wtedy bez etykiety i
komunikatów) — np. w komórce tabeli. Kontrolki z własnym układem etykiety (checkbox,
radiogroup) rysują ją samodzielnie, a wewnątrz `pct-field` oddają obudowie.

**Bramka:** `libs/components/field/src/field-controls.spec.ts` — każda kontrolka
testowana w obu trybach
**Kontrola:** brak — świadomie: tryb samodzielny jest **domyślny**, więc jego awaria
wywraca komplet testów kontrolki

---

### <a id="wym-api-ramka"></a>`wym-api-ramka` — Kontrolka zgłasza obudowie, czy chce ramkę

**Obietnica.** `fieldAppearance`: `boxed` dla pól tekstowych, selecta i daty; `bare` dla
checkboxa i grupy radiów. Obudowa gwarantuje **minimalny obszar dotyku** kolumny
kontrolki (`--pct-target-min`) niezależnie od wariantu.

**Bramka:** `apps/sandbox-e2e/src/field.spec.ts`,
[`wym-a11y-dotyk`](a11y.md#wym-a11y-dotyk)
**Kontrola:** test progu dotyku wychwycił regresję opisaną w
[`lekcja-25`](../lekcje.md#lekcja-25) (select w obudowie: 19,6 px) — bramka ma
udokumentowany przebieg, w którym zapaliła
**Lekcje:** [`lekcja-25`](../lekcje.md#lekcja-25)

---

### <a id="wym-api-natywne-pole"></a>`wym-api-natywne-pole` — Pole tekstowe stoi na natywnym `<input>`

**Obietnica.** `input[pctText]` to komponent na natywnym `<input>`, nie własny element —
zachowujemy `type`, autouzupełnianie przeglądarki i tryby klawiatury mobilnej.
Komponent, a nie dyrektywa, bo dyrektywy nie mogą mieć styli.

**Bramka:** `libs/components/field/src/field-controls.spec.ts`
**Kontrola:** brak — świadomie: podmiana `<input>` na własny element wywraca komplet
testów autouzupełniania i typu

---

### <a id="wym-api-platforma"></a>`wym-api-platforma` — Nie implementujemy tego, co daje platforma

**Obietnica.** Zachowania klawiatury nie piszemy sami, jeśli daje je przeglądarka. Grupa
radiów stoi na natywnych `<input type="radio">` ze wspólnym `name`, więc nawigacja
strzałkami, zawijanie i „jedno miejsce w kolejności Taba" pochodzą od platformy.
Własną obsługę dodajemy tylko tam, gdzie nie ma natywnego odpowiednika.

**Bramka:** `apps/sandbox-e2e/src/radio.spec.ts` — nawigacja klawiaturą
**Kontrola:** brak — świadomie: test nawigacji nie ma trybu, w którym przechodzi bez
działającej klawiatury
**Wyjątki:** [`wym-api-liczba`](#wym-api-liczba) (natywne `type="number"` nie zna
lokalnego separatora), `PctSelect` (natywny `<select>` nie daje panelu)

---

### <a id="wym-api-liczba"></a>`wym-api-liczba` — Pole liczbowe nie stoi na `<input type="number">`

**Obietnica.** `[pctNumber]` stoi na `<input type="text">` z `role="spinbutton"`,
`aria-valuenow` / `aria-valuetext` i własnym parsowaniem opartym o `Intl.NumberFormat`.
Wartość to `number | null` (puste to `null`, nigdy `0` ani `NaN`). Granice `min`/`max`
biorą się z walidatorów schematu, nie z powtórzenia w szablonie.

**Bramka:** `libs/components/field/src/number.spec.ts`,
`apps/sandbox-e2e/src/number.spec.ts`
**Kontrola:** brak — luka: testy własnościowe parsera (`parse(format(n)) === n` dla
dowolnego `n` i dowolnego locale). Parsowanie jest **szersze** niż formatowanie, więc
przypadków jest więcej, niż da się wymyślić ręcznie
**Wiąże przy:** pierwszym locale spoza `pl`/`en` zgłoszonym przez konsumenta
**Decyzja:** [0009 — pole liczbowe na `type="text"`](../decyzje/0009-pole-liczbowe.md)
**Lekcje:** [`lekcja-32`](../lekcje.md#lekcja-32)

---

### <a id="wym-api-generyk"></a>`wym-api-generyk` — Wartość kontrolki wyboru jest typu `T`, nie napisem

**Obietnica.** `PctSelect<T>`, `PctSelectOption<T>` i `PctRadioGroup<T>` są generyczne
(`T = string` domyślnie). Równość zgłasza aplikacja (`compareWith`), brak wyboru jest
osobnym stanem (`T | null`, z `emptyValue` dla modeli nienullowalnych), a atrybut `value`
natywnego radia opisuje opcję, ale **nie bierze udziału w wyborze**.

**Bramka:** `libs/components/select/src/select.spec.ts`, target `typecheck` projektu
`sandbox-e2e`
**Kontrola:** sonda z [`lekcja-37`](../lekcje.md#lekcja-37) — pięć celowo sprzecznych
wiązań, z których cztery **muszą** wywalić build. Bez `NoInfer<T>` kompilator przepuszczał
wszystkie pięć
**Decyzja:** [0010 — generyczna wartość i `NoInfer`](../decyzje/0010-generyk-noinfer.md)
**Lekcje:** [`lekcja-37`](../lekcje.md#lekcja-37)

> Piąty przypadek sondy zostaje otwarty i jest **ograniczeniem Angulara**:
> `PctRadioGroup` nie ma inputu z opcjami, więc jedynym źródłem `T` jest `value` —
> i `$event` z `(valueChange)` nadal nie jest tam sprawdzane.

---

## Rozszerzalność

### <a id="wym-api-czesci"></a>`wym-api-czesci` — Kontrakt `data-pct-part` jest publicznym API stylowania

**Obietnica.** Elementy wewnętrzne komponentów mają stabilne, **spisane i wersjonowane**
atrybuty `data-pct-part="…"`, pozwalające celować w nie selektorem odpornym na
aktualizacje.

**Bramka:** brak — luka: generowany inwentarz części per komponent + bramka na
niezaakceptowaną zmianę. Dziś atrybuty są wystawiane, ale **ani spisane, ani
wersjonowane** — konsument poznaje je z czytania szablonów, a biblioteka nie ma czym
odróżnić zmiany łamiącej od kosmetycznej
**Kontrola:** brak — luka: zmiana nazwy części bez aktualizacji inwentarza musi zapalić
**Wiąże przy:** natychmiast — to jedyne miejsce, w którym projekt zachowuje się jak
zwykła biblioteka: obietnica sprzedażowa („możesz bezpiecznie stylować wnętrze") bez
maszyny potrafiącej na niej zapalić
**Decyzja:** [0013 — bez podziału na rdzeń bezgłowy i skórkę](../decyzje/0013-bez-podzialu-na-rdzen-i-skorke.md)

> Inwentarz jest **niezależny od `apps/docs`**. Ładna strona, która go renderuje, może
> przyjść później — samo generowanie i bramkowanie nie może
> ([`wym-projekt-aplikacje`](projekt.md#wym-projekt-aplikacje)).

---

### <a id="wym-api-czesci-unikalne"></a>`wym-api-czesci-unikalne` — Nazwy części są jednoznaczne w zagnieżdżeniu

**Obietnica.** W komponentach złożonych części kontenera mają własny przedrostek
(`group-label`, `group-hint`, `group-error`); obudowa nazywa swoje `field-*`
(`field-header`, `field-label`, `field-label-aux`, `field-row`, `field-prefix`,
`field-control`, `field-suffix`, `field-footer`, `field-hint`, `field-error`,
`field-message-aux`). Selektor konsumenta nie może przypadkiem trafić w części elementów
składowych.

**Bramka:** `apps/sandbox-e2e/src/radio.spec.ts`, `apps/sandbox-e2e/src/field.spec.ts` —
asercje na **liczebność** kolekcji, nie na pierwszy element
**Kontrola:** kolizja z [`lekcja-15`](../lekcje.md#lekcja-15) i
[`lekcja-24`](../lekcje.md#lekcja-24) jest udokumentowanym przebiegiem, w którym ta
bramka zapaliła — testy jednostkowe jej **nie** widziały, bo odpytywały konkretny element
**Lekcje:** [`lekcja-15`](../lekcje.md#lekcja-15), [`lekcja-24`](../lekcje.md#lekcja-24)

---

### <a id="wym-api-szablony"></a>`wym-api-szablony` — Customizacja przez projekcję i szablony

**Obietnica.** Projekcja treści `<ng-content select="…">` oraz przekazywanie szablonów
jako `TemplateRef` / dyrektywa `*pctTemplate` dla elementów typu szablon itemu.

**Bramka:** brak — luka: projekcja działa (sloty obudowy), ale **`TemplateRef` nie pada
nigdzie w bibliotece** — opcji selecta nie da się dziś ostylować własnym szablonem
**Kontrola:** brak — luka: szablon opcji podany przez konsumenta, który nie zostaje użyty, musi zapalić
**Wiąże przy:** pierwszym realnym użyciu selecta (szablon opcji) oraz przy
[`wym-api-ikony`](#wym-api-ikony) — szablon jest najprostszym mechanizmem podmiany ikony

---

### <a id="wym-api-ikony"></a>`wym-api-ikony` — Łatwe użycie cudzych ikon

**Obietnica.** Biblioteka umożliwia użycie ikon z popularnych zestawów (FontAwesome,
PrimeIcons, Material) oraz dostarczenie własnych (SVG / fonty ikon).

**Bramka:** brak — luka: dziś każda ikona jest **wpisana w szablon** jako SVG
w `currentColor`. Działa i nie wnosi zależności, ale nie jest mechanizmem — konsument nie
ma jak podmienić strzałki selecta
**Kontrola:** brak — luka: podmiana ikony przez `PCT_ICONS`, która nie dociera do komponentu, musi zapalić
**Wiąże przy:** drugim komponencie potrzebującym podmienialnej ikony
**Decyzja:** [0011 — ikony przez szablon i `PCT_ICONS`](../decyzje/0011-ikony.md)

---

### <a id="wym-api-ikony-wlasne"></a>`wym-api-ikony-wlasne` — Biblioteka nie dostarcza własnego zestawu ikon

**Obietnica.** Nie-cel. Zestaw ikon to osobny produkt o osobnym cyklu życia; biblioteka
dostarcza **mechanizm podmiany**, nie ikony.

**Bramka:** `libs/components/check-package.mjs` — brak plików ikon w spakowanym
artefakcie byłby wykrywalny na liście zawartości
**Kontrola:** brak — świadomie: naruszeniem jest **dodanie** czegoś, a nie ciche
zniknięcie; nie należy do klasy [`wym-os`](../00-os.md)

---

### <a id="wym-api-teksty"></a>`wym-api-teksty` — Napisy biblioteki są wystawione do tłumaczenia

**Obietnica.** Teksty, które komponent wypisuje sam, idą przez token `PCT_TEXTS`
i `providePctTexts({…})`; podane pola nadpisują domyślne, reszta zostaje. Domyślne są
**angielskie**. Ostrzeżenia deweloperskie (`console.warn`) do tego kanału **nie
należą** — są po angielsku na stałe i gasną poza `isDevMode()`.

**Bramka:** `libs/components/select/src/select.spec.ts` — nadpisanie częściowe zostawia
resztę domyślną
**Kontrola:** brak — luka: nic nie sprawdza, że **każdy** napis komponentu idzie przez
token. Nowy string wpisany w szablon przechodzi po cichu
**Wiąże przy:** natychmiast — koszt to grep po literałach w szablonach
**Decyzja:** [0007 — konfiguracja osobno od tekstów](../decyzje/0007-konfiguracja-i-teksty.md)

> **Otwarte:** `providePctTexts` zwraca statyczny obiekt, a `PctSelect` czyta go raz przy
> konstrukcji. Aplikacja przełączająca język bez przeładowania **nie zobaczy nowych
> napisów**. Do rozstrzygnięcia zanim `PCT_TEXTS` urośnie: token niesie
> `Signal<PctTexts>`, fabryka zamiast wartości, albo zapisujemy wprost, że zmiana języka
> wymaga przeładowania. Trzecia opcja jest obronna, ale musi być **decyzją, nie
> przeoczeniem**.

---

## Nakładki i ruch

### <a id="wym-api-nakladka"></a>`wym-api-nakladka` — Nakładka wychodzi z widocznej krawędzi kontrolki

**Obietnica.** Obudowa udostępnia kontrolkom swój wiersz jako powierzchnię odniesienia
(`PctFieldApi.surface`); bez obudowy kotwicą jest sam trigger. Szerokość panelu jest osią
API (`panelWidth="field" | "auto" | <długość CSS>`), krawędź przylegania — `panelAlign`.
**Panel nie dziedziczy niczego po hoście**: motyw, krój i wielkość pisma są odczytywane
z triggera przy otwarciu i przenoszone jawnie.

**Bramka:** `apps/sandbox-e2e/src/select.spec.ts` — pomiar szerokości i przesunięcia
panelu wobec pola, oraz kroju i wielkości pisma w panelu
**Kontrola:** pomiar z [`lekcja-35`](../lekcje.md#lekcja-35) (pole 301 px ⇒ panel
275 px, przesunięcie 13 px; `Times New Roman` w panelu wobec `system-ui` w kontrolce) —
test porównuje **konkretne wartości**, więc nie przechodzi na „mniej więcej pasuje"
**Decyzja:** [0006 — kotwica i dziedziczenie w nakładce](../decyzje/0006-nakladka.md)
**Lekcje:** [`lekcja-18`](../lekcje.md#lekcja-18), [`lekcja-35`](../lekcje.md#lekcja-35)

---

### <a id="wym-api-wielkosc"></a>`wym-api-wielkosc` — Wielkość jest jedną osią dla całej biblioteki

**Obietnica.** Każdy komponent przyjmujący `size` (`sm`/`md`/`lg`) bierze wysokość
z tokenu `--pct-control-height-{rozmiar}`. Wysokość jest wartością **wprost**
(`min-height`), nie wynikiem paddingu i wysokości linii. Wariant rozmiaru **podmienia
tokeny bazowe**, zamiast powtarzać reguły wyglądu. W obudowie wielkość należy do obudowy.

**Bramka:** `apps/sandbox-e2e/src/size.spec.ts` — pomiar w przeglądarce
**Kontrola:** test sprawdza równość wysokości **i jej konkretną wartość** — przy samej
równości oba komponenty mogłyby spaść do wysokości linii tekstu i nadal „przechodzić"
**Decyzja:** [0004 — wysokość wprost, nie z paddingu](../decyzje/0004-wysokosc-wprost.md)
**Lekcje:** [`lekcja-29`](../lekcje.md#lekcja-29), [`lekcja-34`](../lekcje.md#lekcja-34)

---

### <a id="wym-api-animacje"></a>`wym-api-animacje` — Animacje bez `@angular/animations`

**Obietnica.** Animacje realizowane na CSS + Web Animations API. `@angular/animations`
nie jest zależnością.

**Bramka:** brak — luka: zakaz jest dotrzymany, ale **nic go nie pilnuje** — jedyne, co
obowiązuje, to nieobecność pakietu w `package.json`. Naturalne miejsce to bramka
zależności z [`wym-projekt-zaleznosci`](projekt.md#wym-projekt-zaleznosci)
**Kontrola:** brak — luka: import `@angular/animations` dodany do pakietu musi zapalić
**Wiąże przy:** pierwszym komponencie z wejściem/wyjściem (panel, dialog, toast) — wtedy
trzeba też sprawdzić, że ruch bierze czas z tokenu ([`wym-a11y-ruch`](a11y.md#wym-a11y-ruch)),
a nie z arkusza

> Z WAAPI nie korzysta dziś nic; jedyne przejścia to `transition` w arkuszach.
