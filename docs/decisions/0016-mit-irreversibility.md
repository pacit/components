# 0016 — Wydanie na MIT jest nieodwracalne, więc kolejność jest decyzją

**Status:** przyjęta
**Realizuje:** [`req-project-package`](../requirements/project.md#req-project-package)
**Dowód:** brak pomiaru w repozytorium — decyzja stoi na precedensie zewnętrznym
(Terraform → OpenTofu, Redis → Valkey, Elasticsearch → OpenSearch). Bramki nie ma i mieć
nie może, patrz „Konsekwencje"

## Kontekst

[0015](0015-license-and-model.md) rozstrzygnęło **czym** jest licencja: MIT wszędzie, prawa
na podmiot, bez CLA. Nie rozstrzygnęło **kiedy** dany komponent na tę licencję wychodzi —
a to jest osobne pytanie, bo MIT działa w jedną stronę.

Wydanej wersji nie da się cofnąć. Ostatnia opublikowana pod MIT zostaje wolna na zawsze
i każdy może ją forkować oraz utrzymywać. Zmiana warunków dla kodu, który jeszcze nie
wyszedł, nie kosztuje nic; ta sama zmiana dla kodu wydanego kosztuje fork — tym pewniej,
im więcej ludzi go używa.

Plan fazy E porządkował komponenty „wg długu architektonicznego, nie wg popularności".
To jest dobre kryterium na dług i puste na tę oś: nie mówi nic o tym, czego lepiej
**jeszcze** nie wydawać.

## Decyzja

**Zbiór wydany pod MIT może rosnąć i nie może maleć. Komponent, którego warunki
dystrybucji nie są przesądzone, nie wchodzi do wydania — powstaje po tym, jak biblioteka
ma użytkowników.**

Wynikają z tego trzy reguły operacyjne:

1. **Domyślną odpowiedzią przy wątpliwości jest „jeszcze nie".** Komponent niewydany nie
   kosztuje nic i można go wydać w dowolnej chwili; komponent wydany pod MIT jest wydany
   na zawsze. Koszt pomyłki jest jednostronny, więc domyślna odpowiedź też.
2. **Granica przesuwa się tylko na zewnątrz.** Wolno przenieść rzecz nierozstrzygniętą do
   MIT. W drugą stronę nie wolno — i nie chodzi o dyscyplinę, tylko o to, że to fizycznie
   nie działa.
3. **Kolejność budowy jest częścią tej decyzji, nie preferencją.** Komponenty o najwyższym
   koszcie budowy i największej mocy różnicującej powstają **na końcu**, gdy jest już kto
   ich używa. Wcześniej rozstrzygnięcie o ich dystrybucji zapadałoby bez jedynej danej,
   która cokolwiek by o nim mówiła.

Model dystrybucji dla takiego komponentu **nie jest tą decyzją podjęty**. Podjęte jest
tylko to, że da się go podjąć później — a to wymaga wyłącznie tego, żeby ten kod nie
wyszedł wcześniej pod MIT.

## Konsekwencje

- Faza E kończy się na **E6 (table/datagrid)** zamiast mieć go w środku listy. To jedyna
  pozycja planu, której koszt budowy liczy się w miesiącach, a nie w dniach.
- **„Zbudować, ale nie publikować" nie jest obejściem.** Plik `LICENSE` w korzeniu obejmuje
  całe repozytorium, nie tylko `dist` — kod wepchnięty do publicznego repozytorium jest
  wydany pod MIT niezależnie od tego, czy pojechał do npm. Odłożony komponent jest odłożony
  także jako commit.
- Ochroną nie jest kod, tylko **nazwa i bycie upstreamem**: zakres npm `@pacit`,
  organizacja `github.com/pacit` i domena `pacit.pl` — wszystkie w rękach podmiotu z linii
  `Copyright` (zakres sprawdzony 2026-08-07, nie założony). Formalne zgłoszenie znaku
  towarowego jest świadomie odłożone — nazwa jest nazwą firmy, a rejestracja przed
  pierwszym użytkownikiem to koszt bez zastosowania.
- Drugą połową „bycia upstreamem" jest **provenance**, a npm wystawia je wyłącznie przy
  polu `repository` zgodnym z repozytorium, z którego leci publikacja. To czyni
  `repository` warunkiem tej decyzji, nie tylko metadaną wydania —
  [`req-release-metadata`](../requirements/release.md#req-release-metadata).
- **Bramki na to nie ma i nie będzie.** Nie da się maszynowo sprawdzić, czy komponent
  „powinien był" wyjść. Wymaganie z bramką pozorną jest dokładnie tym, co opisuje
  [`lesson-39`](../lessons.md#lesson-39) — bramką urodzoną martwą — więc ta decyzja
  **nie zostaje wymaganiem**. Egzekwuje ją przegląd listy w [planie](../plan.md), nie CI.
- 0015 zostaje w mocy w całości. Ta decyzja niczego w niej nie odwraca; dokłada oś, której
  tam nie było.

## Co przez to tracimy

- **Wolniejsze dojście do kompletu.** Biblioteka bez tabeli jest w oczach części odbiorców
  niekompletna, a to jest dokładnie ten komponent, po którym część zespołów wybiera.
  Płacimy adopcją za zachowanie opcji.
- **Ryzyko, że opcja nigdy się nie przyda.** Jeśli adopcja nie przyjdzie, kolejność nie
  ochroniła niczego, a opóźniła najbardziej pożądany komponent. Ten koszt jest realny
  i akceptujemy go, bo pomyłka w drugą stronę jest nieodwracalna, a ta nie.
- **Decyzję trzeba będzie podjąć jeszcze raz**, przy danych, których dziś nie ma. Ta
  decyzja nie jest odpowiedzią — jest zachowaniem prawa do odpowiedzi.

## Rozważane alternatywy

| alternatywa                                       | dlaczego odrzucona                                                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wydać wszystko pod MIT od razu                    | maksymalna adopcja, ale zamyka każdą inną opcję bezwarunkowo i na zawsze — cena płacona z góry za korzyść, która może nie przyjść                                                 |
| Rozstrzygnąć model dystrybucji teraz              | rozstrzygnięcie zapadłoby przy zerowej bazie użytkowników, czyli bez jedynej danej, która cokolwiek by o nim mówiła                                                               |
| Zapisać to jako wymaganie z bramką                | nie istnieje maszyna, która to zmierzy; wymaganie z bramką pozorną jest gorsze niż jego brak ([`lesson-39`](../lessons.md#lesson-39))                                             |
| Trzymać nierozstrzygnięte komponenty w tym repo   | `LICENSE` w korzeniu obejmuje całe repozytorium — commit do publicznego repo **jest** wydaniem pod MIT, więc obejście nie istnieje                                                |
| Odwrócić 0015 i wybrać licencję pozwalającą cofać | (A)GPL i source-available oblewają przegląd prawny konsumenta korporacyjnego, czyli kasują adopcję — a bez adopcji nie ma czego chronić (patrz [0015](0015-license-and-model.md)) |
