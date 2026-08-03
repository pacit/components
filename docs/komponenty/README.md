# Komponenty

Poziom 3 dokumentacji. Jeden plik na komponent, **wypełniony wg
[`_szablon.md`](_szablon.md)** — nie proza.

Powód, dla którego to jest formularz, a nie opis: jakość każdego dotychczasowego
komponentu bierze się z tego, że budowała go ta sama osoba w tym samym trybie uwagi. To
nie skaluje się ani na drugą osobę, ani na dwudziesty komponent. Formularz z pustą rubryką
jest brakiem widocznym maszynowo; proza z pominiętym akapitem nie jest.

| komponent                    | entrypoint                   | rola                                |
| ---------------------------- | ---------------------------- | ----------------------------------- |
| [`PctButton`](button.md)     | `@pacit/components/button`   | przycisk                            |
| [`PctField`](field.md)       | `@pacit/components/field`    | obudowa kontrolki formularza        |
| [`PctText`](text.md)         | `@pacit/components/field`    | pole tekstowe na natywnym `<input>` |
| [`PctNumber`](number.md)     | `@pacit/components/field`    | pole liczbowe                       |
| [`PctCheckbox`](checkbox.md) | `@pacit/components/checkbox` | pole wyboru                         |
| [`PctRadioGroup`](radio.md)  | `@pacit/components/radio`    | grupa opcji wykluczających          |
| [`PctSelect`](select.md)     | `@pacit/components/select`   | lista wyboru z własnym panelem      |

## Kolejność kolejnych komponentów

Logika: **najpierw zbuduj maszynę, która czyni komponenty poprawnymi z konstrukcji, potem
produkuj komponenty szybko.** Odwrotna kolejność to powód, dla którego duże biblioteki
mają 90 komponentów i problemy a11y w połowie z nich.

Kolejność wynika z **długu architektonicznego**, nie z popularności:

1. **Dialog** — wymusza focus trap, blokadę scrolla, `inert`, powrót fokusu, stos Escape,
   bezpieczeństwo SSR. Najwyższy zysk architektoniczny na komponent.
2. **Tooltip + Popover** — wymusza rozróżnienie „opisuje vs nazywa", parytet
   hover/focus/touch i redukcję ruchu na realnym wejściu/wyjściu.
3. **Menu** — roving focus, podmenu, ponowne użycie typeaheadu.
4. **Domknięcie rodziny select** — rzutowane `pct-option`, szablon opcji, grupy,
   wielokrotny wybór, filtrowanie, czyszczenie, async, wirtualizacja. Świadomie **po**
   warstwie zachowań, inaczej budujemy to dwa razy.
5. **Switch, Textarea, Slider, Date picker.**
6. **Table / DataGrid** — musi stać na **headless rdzeniu** oddzielonym od renderowania.

Przed punktem 1 musi powstać **warstwa zachowań w `core`**: nawigacja po liście
(dziś prywatne metody w `PctSelect`), nakładka, fokus, live announcer, szablony
([`wym-api-szablony`](../wymagania/api.md#wym-api-szablony)) i ikony
([`wym-api-ikony`](../wymagania/api.md#wym-api-ikony)).

Maszyneria listy (typeahead, `enabledIndexes`, `moveActive`, `activeIndex`) siedzi dziś
jako prywatne metody w `PctSelect`. Tego samego potrzebują autocomplete, multiselect, menu,
combobox i paleta poleceń — **wyciągnąć do `core` przed drugim konsumentem, nie po nim**,
inaczej powtórzy się [`lekcja-21`](../lekcje.md#lekcja-21) na dużo większym kawałku.
