# 0005 — Signal forms bez `ControlValueAccessor`

**Status:** przyjęta
**Realizuje:** [`wym-api-signal-forms`](../wymagania/api.md#wym-api-signal-forms),
[`wym-api-kontener`](../wymagania/api.md#wym-api-kontener)
**Dowód:** [`lekcja-9`](../lekcje.md#lekcja-9), [`lekcja-20`](../lekcje.md#lekcja-20),
[`lekcja-26`](../lekcje.md#lekcja-26), [`lekcja-12`](../lekcje.md#lekcja-12)

## Kontekst

Założenie wyjściowe brzmiało: kompatybilność z reactive forms i template-driven forms
**wymaga** `ControlValueAccessor`. Rozważaliśmy osobną dyrektywę-adapter.

Eksperyment na kontrolce implementującej wyłącznie `FormValueControl`
z `@angular/forms/signals` pokazał, że `[formControl]` i `[(ngModel)]` synchronizują
wartość w obie strony **bez żadnego kodu kompatybilności**
([`lekcja-9`](../lekcje.md#lekcja-9)).

## Decyzja

**Kontrolki implementują wyłącznie kontrakty signal forms** — `FormValueControl` (lub
`FormCheckboxControl`), czyli `value = model<T>()` plus opcjonalne pola `FormUiControl`
(`disabled`, `readonly`, `invalid`, `errors`, `required`, `name`, `touch`).

**`ControlValueAccessor` nie jest implementowany nigdzie.** Rdzeń biblioteki nie importuje
klasycznego API formularzy.

W komponentach złożonych kontrakt implementuje **wyłącznie kontener** — z punktu widzenia
formularza edytowana jest jedna wartość, a elementy składowe komunikują się z kontenerem
przez DI.

### Współistnienie z natywnym elementem

Dwa przypadki wyszły dopiero z użycia i są dziś warunkiem w kodzie:

- **`[formControl]` na `<input pctText>`** jest obsługiwany przez wbudowany
  `DefaultValueAccessor`, który sam pisze do DOM. Dwóch autorów wartości to konflikt —
  kontrolka wykrywa `NgControl` na tym samym elemencie i oddaje własność wartości,
  pozostając przy obudowie i stanie ([`lekcja-20`](../lekcje.md#lekcja-20)).
- **Ta heurystyka była za szeroka.** `FormField` sam rejestruje interop-owy `NgControl`
  dla zgodności ze starymi akcesorami — a przy **własnej** kontrolce nie pisze do DOM.
  Warunek rozróżnia więc `NgControl` **bez** `FormField`
  ([`lekcja-26`](../lekcje.md#lekcja-26)).

## Konsekwencje

- Będziemy ~2 lata przed Material w tym jednym wymiarze.
- Zero warstwy kompatybilności do utrzymania — jest o jedną warstwę mniej, w której coś
  może się rozjechać.
- **Testy muszą startować z niepustą wartością początkową.** Wada z
  [`lekcja-26`](../lekcje.md#lekcja-26) przetrwała, bo wszystkie testy i sandbox
  startowały z pustym modelem.
- `FormCheckboxControl` wymaga `checked`, nie `value` (definiowanie `value` jest
  zabronione), a `model()` nie przyjmuje `booleanAttribute` — stąd `[checked]="true"`
  nawiasami ([`lekcja-12`](../lekcje.md#lekcja-12)).

## Co przez to tracimy

- **Zakład na przyszłość Angulara.** Signal forms są młodsze niż klasyczne API; gdyby ich
  kontrakt się zmienił, nie mamy warstwy pośredniej, która by to zaabsorbowała.
- Konsument na bardzo starej wersji Angulara nie zainstaluje biblioteki — ale to i tak
  wyklucza [`wym-projekt-angular`](../wymagania/projekt.md#wym-projekt-angular).
- Heurystyka współistnienia z `DefaultValueAccessor` jest **subtelna** i już raz była za
  szeroka. To najbardziej krucha część tej decyzji.

## Rozważane alternatywy

| alternatywa                           | dlaczego odrzucona                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `ControlValueAccessor` obok kontraktu | zweryfikowano eksperymentem, że jest **zbędne** ([`lekcja-9`](../lekcje.md#lekcja-9))  |
| Osobna dyrektywa-adapter              | ta sama zbędność, plus druga powierzchnia API do udokumentowania i przetestowania      |
| Każdy element składowy jako kontrolka | z punktu widzenia formularza grupa radiów to **jedna** wartość, nie N wartości boolean |
