# 0014 — Teksty jako sygnał, czytane przy renderowaniu

**Status:** przyjęta
**Realizuje:** [`req-api-texts`](../requirements/api.md#req-api-texts)
**Dowód:** [`lesson-54`](../lessons.md#lesson-54) — celowa regresja: przy odczycie
z konstrukcji przełączenie języka daje `expected 'Select…' to be 'Wybierz…'`

## Kontekst

[Decyzja 0007](0007-config-and-texts.md) zostawiła jedno pytanie otwarte i sama
zapisała, że musi ono zostać **rozstrzygnięte, zanim `PCT_TEXTS` urośnie**:

```ts
export const PCT_TEXTS = new InjectionToken<PctTexts>(…); // wartość, nie sygnał
readonly placeholder = input<string>(this.texts.selectPlaceholder); // odczyt RAZ
```

`providePctTexts` zwracał `{ provide, useValue }`, czyli statyczny obiekt, a komponent
czytał go przy konstrukcji. Aplikacja przełączająca język bez przeładowania strony —
bardzo częsty wzorzec — **nie zobaczyłaby nowych napisów**.

Wada jest trudniejsza, niż wygląda, bo `input()` **jest** sygnałem: wiązanie z zewnątrz
przerysowuje widok normalnie. Zamrożona jest wyłącznie wartość **domyślna**, a tej nikt
nie ogląda w diffie jako „odczytu" ([`lesson-54`](../lessons.md#lesson-54)).

## Decyzja

**`PCT_TEXTS` niesie `Signal<PctTexts>`, a komponent czyta napis przy renderowaniu.**

```ts
export const PCT_TEXTS = new InjectionToken<Signal<PctTexts>>('PCT_TEXTS', {
  factory: () => signal(PCT_DEFAULT_TEXTS).asReadonly(),
});

export function providePctTexts(texts: Partial<PctTexts> | Signal<Partial<PctTexts>>): Provider;
```

Trzy reguły uzupełniające:

- **Odczyt idzie przez `computed()`**, nigdy przez wartość domyślną wejścia. Wejście,
  które ma napis biblioteki jako zapasowy, deklaruje się bez wartości
  (`input<string>()`), a zapas dokłada `computed(() => this.placeholder() ?? this.texts().selectPlaceholder)`.
- **Brak wartości i wartość pusta znaczą co innego.** `placeholder=""` zostaje pustym
  tekstem zastępczym; dopiero brak wiązania oddaje napis bibliotece. Odwrotna
  konwencja („pusty znaczy domyślny") odbierałaby autorowi widoku decyzję, której nie
  da się wyrazić inaczej.
- **Scalanie zawsze wobec `PCT_DEFAULT_TEXTS`**, a nie wobec tekstów z injektora
  nadrzędnego: poddrzewo deklaruje język, a nie różnicę wobec sąsiada — inaczej ten sam
  `providePctTexts` znaczyłby co innego zależnie od miejsca w drzewie.

Fabryka jako argument (druga rozważana opcja) nie wystarcza: DI rozwiązuje dostawcę
raz, więc `useFactory` daje dokładnie ten sam zamrożony obiekt, tylko liczony leniwie.

## Konsekwencje

- Aplikacja przełączająca język podaje sygnał:
  `providePctTexts(computed(() => SLOWNIKI[jezyk()]))` — i napisy biblioteki jadą
  razem z resztą interfejsu, bez przeładowania.
- Podanie zwykłego obiektu działa dalej i jest dalej najkrótszą drogą — sygnał jest
  rozszerzeniem sygnatury, nie zastąpieniem.
- Odczyt w szablonie ma nawiasy (`texts().selectEmpty`). To jest **cena widoczna**:
  zapis mówi wprost, że napis jest czytany za każdym razem.
- Bramka [`check-texts`](../../tools/check-texts.mjs) pilnuje tego regułą
  `napis-przy-konstrukcji` — wartość domyślna `input`/`model`/`signal` nie może czytać
  `PCT_TEXTS`. Bez niej ten sam zapis wróciłby przy pierwszym komponencie pisanym
  z rozpędu, znowu bez czerwonego testu.

## Co przez to tracimy

- **Zmiana łamiąca w publicznym typie.** `inject(PCT_TEXTS)` zwraca teraz sygnał, więc
  kod konsumenta czytający token wprost przestaje się kompilować. Cena jest zapłacona
  teraz, bo biblioteka nie ma jeszcze pierwszego wydania — po nim ta sama zmiana
  wymagałaby codemodu i majora.
- **Jeden pośrednik więcej w każdym odczycie.** `texts().selectEmpty` zamiast
  `texts.selectEmpty` — koszt liczony w niczym, ale widoczny w każdym szablonie.
- **Reguła „nie w wartości domyślnej" jest łatwa do złamania z rozpędu** i nie widać
  jej w review. Dlatego jest punktem bramki, a nie zdaniem w przewodniku.

## Rozważane alternatywy

| alternatywa                                   | dlaczego odrzucona                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Zapisać „zmiana języka wymaga przeładowania"  | obronne i tanie, ale przenosi koszt na każdą aplikację z przełącznikiem języka — a to wzorzec, nie egzotyka            |
| `providePctTexts` przyjmuje fabrykę           | DI rozwiązuje dostawcę raz, więc wynik jest tak samo zamrożony — zmienia się moment obliczenia, nie jego jednorazowość |
| `Subject`/`Observable` jak `MatPaginatorIntl` | druga oś reaktywności w bibliotece, która nie ma ani jednego `Observable` w publicznym API                             |
| Pusty napis (`''`) znaczy „weź domyślny"      | odbiera autorowi widoku możliwość wyłączenia tekstu zastępczego, której nie da się wyrazić inaczej                     |
