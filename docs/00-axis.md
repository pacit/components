# Oś — na czym wygrywamy

Ten plik zawiera **jedno** wymaganie. Jest osobno, bo z niego wynika kolejność
wszystkich pozostałych, a teza wmieszana w listę siedemdziesięciu punktów nie
potrafi rozstrzygać sporów o priorytet.

---

## <a id="req-axis"></a>`req-axis` — Nic nie psuje się po cichu

**Obietnica.** Każdy stan, w którym błędne zachowanie nie daje sygnału, jest wadą
**samą w sobie** — niezależnie od tego, czy ktoś już na niego trafił. Każda obietnica
z tej dokumentacji ma bramkę, która potrafi na niej zapalić, a każda bramka ma
kontrolę odniesienia dowodzącą, że potrafi **nie** przejść.

**Bramka:** [`req-quality-registry`](requirements/quality.md#req-quality-registry) — rejestr
obietnica → bramka → kontrola, czytany przez `tools/check-docs.mjs`
**Kontrola:** [`req-quality-negative-control`](requirements/quality.md#req-quality-negative-control) —
reguła, że bramka bez dowodu zapalenia jest niedokończona

### Dlaczego to nie jest hasło

Log [lekcji](lessons.md) wygląda na zbiór niezależnych obserwacji, a jest dziewięcioma
wystąpieniami **jednej**:

| lekcja                              | zdanie kluczowe                                                       |
| ----------------------------------- | --------------------------------------------------------------------- |
| [`lesson-36`](lessons.md#lesson-36) | „Awaria była **cicha w obie strony**"                                 |
| [`lesson-43`](lessons.md#lesson-43) | „nie jest błędem, tylko **pustym łańcuchem**"                         |
| [`lesson-38`](lessons.md#lesson-38) | „**po cichu nie działa** i test przechodzi"                           |
| [`lesson-39`](lessons.md#lesson-39) | „może **urodzić się martwy** na dwa niezależne sposoby"               |
| [`lesson-17`](lessons.md#lesson-17) | „był zepsuty i **nikt tego nie widział**"                             |
| [`lesson-31`](lessons.md#lesson-31) | „był niebezpieczny przy SSR i **nikt tego nie widział**"              |
| [`lesson-42`](lessons.md#lesson-42) | „nigdy nie był typecheckowany i **nikt tego nie zauważył**"           |
| [`lesson-40`](lessons.md#lesson-40) | „ani bramka kontrastu, ani axe **tego nie widzą**"                    |
| [`lesson-26`](lessons.md#lesson-26) | „wada **przetrwała**, bo wszystkie testy startowały z pustym modelem" |

Wspólnym mianownikiem jest to, że **domyślnym zachowaniem warstwy jest „nic się nie
stało"**:

| warstwa       | co robi platforma zamiast błędu                       | gdzie u nas                                          |
| ------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| CSS           | brak `var()` → wartość początkowa                     | [`lesson-36`](lessons.md#lesson-36), `check-package` |
| odczyt DOM    | nieistniejący token → `''`                            | [`lesson-43`](lessons.md#lesson-43)                  |
| infra testowa | brak wzorca zrzutu → zapisz bieżący jako poprawny     | [`lesson-39`](lessons.md#lesson-39)                  |
| infra testowa | emulacja nie dociera → test na wartościach domyślnych | [`lesson-38`](lessons.md#lesson-38)                  |
| graf builda   | brak krawędzi → build się udaje, wyjście złe          | [`lesson-36`](lessons.md#lesson-36)                  |
| SSR           | rozjazd id → cichy re-render, ARIA w próżnię          | [`lesson-31`](lessons.md#lesson-31)                  |
| a11y          | stan samą barwą → znika w `forced-colors`             | [`lesson-40`](lessons.md#lesson-40)                  |
| typy          | `T` za szerokie → sprzeczne wiązania kompilują się    | [`lesson-37`](lessons.md#lesson-37)                  |

Dlatego **brak bramki nigdy nie objawia się jako brak — objawia się jako zieleń**.

### Dlaczego nazwana przez cichą wadę, a nie przez „jakość"

Trzy powody:

1. Jest wyprowadzona z własnych dowodów, nie z ambicji marketingowej.
2. Wyjaśnia, **dlaczego** każda bramka potrzebuje kontroli odniesienia — bramka bez
   niej jest kolejną cichą wadą, tylko piętro wyżej.
3. Jest zdaniem, które człowiek trzyma w głowie **pisząc kod**. „Weryfikowalność
   obietnic" nie jest.

### Konsekwencja dla kolejności prac

Wymaganie bez bramki jest **niedokończone**, a nie „zrealizowane, tylko niesprawdzone".
Nie chodzi o to, żeby każda bramka istniała od pierwszego dnia — chodzi o to, żeby jej
brak był **policzalny, a nie niewidoczny**.

---

## Czym oś nie jest

Nie jest to teza o a11y, o tokenach ani o testach. Dotyczy **klasy awarii przechodzącej
przez wszystkie warstwy** — tej, w której platforma na błąd odpowiada milczeniem. Bramka
kontrastu, `check-package`, bramka hydracji i kontrola odniesienia audytu axe to cztery
wystąpienia tego samego wzorca w czterech różnych warstwach, nie cztery niezależne
pomysły.

---

## Kryteria sukcesu

Oś działa wtedy, gdy prawdziwe są trzy zdania — każde sprawdzalne maszynowo, nie
w dyskusji:

1. **Rejestr nie ma pozycji w stanie `zadeklarowane`.** Każda obietnica ma bramkę albo
   jawnie zapisany powód jej braku wraz z tym, co wymusi domknięcie.
2. **Każda bramka ma kontrolę odniesienia.** Dla każdej istnieje test albo zapisany
   przebieg dowodzący, że po wprowadzeniu celowej regresji bramka **zapala**.
3. **Dokumentacja nie potrafi skłamać.** Stan wymagania jest wyprowadzany z zawartości
   rejestru, nie wpisywany ręcznie — a dopisanie wymagania bez bramki jest błędem CI,
   nie przeoczeniem.

Punkt 3 jest tym, którego brak sprawił, że ta dokumentacja wymagała rozdziału „jak ją
czytać" (patrz [`req-quality-registry`](requirements/quality.md#req-quality-registry)).

---

## Jawne NIE-cele

Rzeczy, których świadomie **nie** robimy. Zapisane, żeby nie wracały jako „brakujące
wymaganie" — nie-cel jest obietnicą tak samo jak cel i tak samo podlega bramce.

| nie-cel                            | wymaganie                                                            | dlaczego                                                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Własny zestaw ikon                 | [`req-api-icons-custom`](requirements/api.md#req-api-icons-custom)   | zestaw ikon to osobny produkt o osobnym cyklu życia; my dajemy mechanizm podmiany                                                                                     |
| Przewaga liczbą komponentów        | —                                                                    | PrimeNG ma ~90 i dekadę przewagi; tej osi nie da się dogonić i nie ma sensu próbować                                                                                  |
| Pełne bidi                         | [`req-token-logical`](requirements/tokens.md#req-token-logical)      | układ się odbija; mieszane kierunki w jednym ciągu tekstu i izolacja przy skracaniu — nie w v1                                                                        |
| Silnik motywów w JS                | [`req-token-css`](requirements/tokens.md#req-token-css)              | runtime JS dla motywu kupuje FOUC i rozjazdy hydracji; kaskada CSS robi to samo za darmo                                                                              |
| `ControlValueAccessor`             | [`req-api-signal-forms`](requirements/api.md#req-api-signal-forms)   | zweryfikowano eksperymentem, że jest zbędne ([`lesson-9`](lessons.md#lesson-9))                                                                                       |
| `@angular/animations`              | [`req-api-animations`](requirements/api.md#req-api-animations)       | zależność runtime wbrew [`req-project-dependencies`](requirements/project.md#req-project-dependencies)                                                                |
| `zone.js`                          | [`req-project-angular`](requirements/project.md#req-project-angular) | usunięty całkowicie, nie tylko wyłączony ([`lesson-8`](lessons.md#lesson-8))                                                                                          |
| Podział na rdzeń bezgłowy i skórkę | —                                                                    | kontrast, tryb wymuszonych kolorów i obszar dotyku mieszkają w szablonie i arkuszu — oddając je, oddajemy połowę dowodu ([0013](decisions/0013-no-headless-split.md)) |

---

## Jak z osi wyrasta reszta

```
POZIOM 0   req-axis                       ← ten plik
              │
              ├─ POZIOM 1  requirements/   obietnice: co ma być prawdą
              │              │
              │              ├─ POZIOM 2  decisions/     dlaczego akurat tak
              │              │
              │              └─ POZIOM 3  components/  czy ten komponent to spełnia
              │
              ├─ lessons.md              dowody, z których wzięły się poziomy 0–2
              └─ registry.md             GENEROWANY: czy każda obietnica ma bramkę
```

Kierunek czytania jest odwrotny do kierunku pisania: **wymagania powstają z lekcji**,
a nie odwrotnie. Log lekcji jest bazą dowodową, nie dodatkiem — to jedyne miejsce, gdzie
zapisano, **co się naprawdę stało**, zanim ktoś sformułował z tego regułę.
