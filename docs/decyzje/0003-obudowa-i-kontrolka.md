# 0003 — Obudowa i kontrolka

**Status:** przyjęta
**Realizuje:** [`wym-api-obudowa`](../wymagania/api.md#wym-api-obudowa),
[`wym-api-ramka`](../wymagania/api.md#wym-api-ramka),
[`wym-api-bez-obudowy`](../wymagania/api.md#wym-api-bez-obudowy),
[`wym-api-czesci-unikalne`](../wymagania/api.md#wym-api-czesci-unikalne)
**Dowód:** [`lekcja-21`](../lekcje.md#lekcja-21), [`lekcja-22`](../lekcje.md#lekcja-22),
[`lekcja-24`](../lekcje.md#lekcja-24), [`lekcja-25`](../lekcje.md#lekcja-25),
[`lekcja-27`](../lekcje.md#lekcja-27), [`lekcja-28`](../lekcje.md#lekcja-28),
[`lekcja-34`](../lekcje.md#lekcja-34)

## Kontekst

Pole formularza to co najmniej sześć rzeczy naraz: etykieta, kontrolka, podpowiedź,
komunikat błędu, znacznik wymagalności i dekoracje po bokach. Pytanie brzmi, **kto jest
właścicielem czego** — bo od tego zależy, gdzie mieszka typowanie wartości, kto rysuje
ramkę i kto odbiera kliknięcie.

Pierwsza wersja (`PctInput`) trzymała wszystko w jednym komponencie. Rozpadła się na
dwóch rzeczach: wspólna logika komunikatów została **skopiowana do czterech kontrolek**
([`lekcja-21`](../lekcje.md#lekcja-21)), a checkbox i grupa radiów nie mieściły się
w modelu „kontrolka z ramką".

## Decyzja

**Obudowa (`pct-field`) i kontrolka są osobnymi komponentami, rozmawiającymi przez token
`PCT_FIELD`.**

- **Kontraktu formularza nie implementuje obudowa, lecz kontrolka.** Dzięki temu
  typowanie zostaje przy rodzaju pola (`string`, `number`, `Date`, `string[]`) zamiast
  wyciekać do obudowy jako `unknown`.
- **Ramkę rysuje obudowa**, nie kontrolka — inaczej dekoracje `prefix`/`suffix`
  znalazłyby się poza polem. Kontrolka w środku jest przezroczysta i bez obramowania,
  a focus ring obejmuje cały rząd (`:has(:focus-visible)`), także gdy fokus trafi na
  przycisk w slocie.
- **Kontrolka zgłasza, czy chce ramkę** (`fieldAppearance`: `boxed` / `bare`) i **jaki
  kursor** ma pokazywać ramka (`PctFieldControl.fieldCursor`).
- **Wspólna logika komunikatów mieszka w `core`** — tekst błędu, bramkowanie na
  `touched`, składanie `aria-describedby`.

### Cała powierzchnia ramki ma właściciela

To jest najdroższa część tej decyzji i wzięła się z dwóch nieudanych podejść.

Rząd **nie ma własnego `padding` ani `gap`** — odstępy niosą trzy kolumny w środku
(`field-prefix`, `field-control`, `field-suffix`), rozciągnięte na jego pełną wysokość.
Pusty slot dekoracji nie znika, tylko zwija się do samego paddingu krawędzi. Klik w tło
rzędu jest przekazywany kontrolce: `focus()` na `mousedown` i `activate()` na `click`.

Powód jest w [`lekcja-27`](../lekcje.md#lekcja-27): po pierwszej poprawce padding i `gap`
zostały na rzędzie, a kolumny były w nim wyśrodkowane — **ok. 60% powierzchni ramki nie
należało do żadnego elementu wewnętrznego**. Kliknięcie działało (załatała to
[`lekcja-22`](../lekcje.md#lekcja-22)), ale kursor kłamał: pole wyłączone zapraszało
kursorem tekstowym do pisania po całym paddingu.

### Dopasowanie dekoracji zgłasza autor, nie arkusz

`pctPrefix` / `pctSuffix` przyjmują `inset` (domyślne) albo `fill`.

- `inset` leży **na powierzchni pola**: jest wpisane w padding ramki, dziedziczy jej
  kursor, a klik w nie fokusuje kontrolkę.
- `fill` bierze **cały** slot i jest **własną powierzchnią**: ma własne tło, własny
  kursor i sam przyjmuje kliknięcie, więc obudowa do niego nie sięga.

Poprzednia wersja wnioskowała o intencji z zawartości slotu (`:has(button, a, [tabindex])`
⇒ „wypełnia slot"). [`lekcja-34`](../lekcje.md#lekcja-34) pokazała, że to wiąże dwie
niezależne rzeczy: przycisk czyszczenia **nie mógł** być mniejszy od slotu, a kafelek
z tłem **nie mógł** być większy, bo nie jest interaktywny.

## Konsekwencje

- Nowa kontrolka dostaje etykietę, komunikaty i `aria-describedby` **przez samo
  zaimplementowanie kontraktu** — nie przez skopiowanie kodu.
- Poprawka w logice komunikatów jest jedną zmianą, nie czterema.
- Wielkość należy do obudowy: kontrolka z własnym `size` oddaje ją polu, tak jak oddaje
  ramkę. Inaczej dwa `size` w jednym polu dawałyby ramkę jednej wielkości i tekst innej.
- Nazwy części kontenera muszą mieć przedrostek (`field-label`, `field-row`, …), bo
  inaczej kolidują z częściami kontrolki w środku ([`lekcja-24`](../lekcje.md#lekcja-24)).
- Obudowa gwarantuje minimalny obszar dotyku kolumny kontrolki — po oddaniu jej ramki
  trigger selecta stracił własny padding i spadł do 19,6 px
  ([`lekcja-25`](../lekcje.md#lekcja-25)).

## Co przez to tracimy

- **Dwa komponenty zamiast jednego** w każdym pełnym polu — więcej DOM-u i jeden token DI
  więcej do zrozumienia przy pierwszym kontakcie z biblioteką.
- **Kontrolka musi działać w dwóch trybach** (w obudowie i bez niej), co podwaja liczbę
  przypadków testowych każdej kontrolki.
- **Symetryczne ograniczenie po stronie autora, nieusuwalne:** przycisk `inset` musi być
  o stopień mniejszy od pola, bo wysokości obu w tej samej wielkości są z założenia równe
  ([0004](0004-wysokosc-wprost.md)). W najmniejszej wielkości nie ma już stopnia niżej.

## Rozważane alternatywy

| alternatywa                                    | dlaczego odrzucona                                                                                                                              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Jeden komponent na pole (`PctInput`)           | wymusza kopiowanie logiki komunikatów do każdej kontrolki ([`lekcja-21`](../lekcje.md#lekcja-21))                                               |
| Obudowa implementuje `FormValueControl`        | typowanie wartości wycieka do obudowy jako `unknown`; pole traci związek z rodzajem danych                                                      |
| Ramkę rysuje kontrolka, obudowa tylko etykietę | dekoracje `prefix`/`suffix` lądują poza ramką, a focus ring nie obejmuje przycisku w slocie                                                     |
| Arkusz wnioskuje o wypełnieniu slotu           | reguła CSS wnioskująca o zamiarze z zawartości jest **ukrytym API** — tanim, dopóki przykład jest jeden ([`lekcja-34`](../lekcje.md#lekcja-34)) |
