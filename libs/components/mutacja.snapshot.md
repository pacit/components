# Snapshot przebiegu mutacyjnego

> **Ten plik jest generowany.** Nie edytuj go ręcznie —
> `node tools/check-mutation.mjs --write`. Bramka `check-mutation` odrzuca rozjazd.

Komplet zielonych testów nie jest dowodem, że testy cokolwiek łapią — to jedyne
pytanie, na które odpowiada przebieg mutacyjny
([`req-quality-unit`](../../docs/requirements/quality.md#req-quality-unit)).
Stryker psuje kod na tysiąc drobnych sposobów i pyta, ile z nich zauważy zestaw
testów. Mutant **przeżywający** to zmiana zachowania, po której CI dalej świeci
na zielono.

Ten plik jest listą, wobec której mierzy się zmianę. Sam `thresholds.break`
w `stryker.config.json` jest PODŁOGĄ i nic nie mówi o pliku, który spadł
o dwadzieścia punktów, dopóki reszta go wyrównuje. Snapshot pilnuje każdego pliku
z osobna i pilnuje go **w obie strony**: w dół, bo tak wygląda usunięta asercja,
w górę, bo podłoga stojąca dziesięć punktów pod pomiarem przestaje mierzyć.

Kolumny: plik · wynik · zabite (w tym zegarem) · przeżywające · bez pokrycia ·
zignorowane. Tolerancja: ±2 punktu procentowego.

```
libs/components/core/src/config.ts 100.00 8(0) 0 0 0
libs/components/core/src/field.ts 96.43 27(0) 1 0 0
libs/components/core/src/id.ts 100.00 5(0) 0 0 0
libs/components/core/src/texts.ts 100.00 15(0) 0 0 0
libs/components/field/src/number.ts 80.43 185(0) 43 2 11
libs/components/select/src/select.ts 79.48 213(0) 52 3 5
RAZEM 81.77 453/554
```
