# 0015 — MIT wszędzie, prawa na podmiot, bez CLA

**Status:** przyjęta
**Realizuje:** [`req-release-metadata`](../requirements/release.md#req-release-metadata)
**Dowód:** `check-package` (punkt 6, kontrola `licencja`) i `check-consumer` (punkt 1,
reguła `brak-licencji`) — plik LICENSE mierzony w katalogu **i** w archiwum

## Kontekst

Manifest deklarował `"license": "MIT"` od początku, ale pliku LICENSE nie było nigdzie —
ani w repozytorium, ani w zbudowanym pakiecie. To formalnie licencja niepełna, a
repozytorium ma stać publicznie od pierwszego pushu, więc pytanie „czym to właściwie jest
prawnie" pada wcześniej niż pierwsze `npm install`.

Przy okazji trzeba było rozstrzygnąć, czy licencja rdzenia ma zostawiać otwartą drogę do
zarobku — i czy wymaga to maszynerii kontrybutorskiej.

## Decyzja

**Wszystko na MIT. Prawa autorskie na podmiot (`PacIT - Marek Pac`). Bez CLA, bez DCO,
bez dual-licensingu.**

Wybór MIT nie jest domyślny z rozpędu, tylko wynika z tego, na czym ta biblioteka wygrywa.
Jej wyróżnikiem jest **dowód** — bramki, [rejestr](../registry.md), a docelowo ACR/VPAT
generowany z CI. Dowód działa dopiero przy adopcji, a odbiorcą jest korporacja, w której
pierwszą bramką jest dział prawny: MIT przechodzi tam bez przeglądu, licencja spoza listy
OSI nie przechodzi wcale. Ekosystem trzyma ten sam standard — Angular, CDK, Material
i PrimeNG są na MIT.

**Brak CLA jest rozstrzygnięciem, nie przeoczeniem.** Pierwotna rekomendacja była
odwrotna i została cofnięta po sprawdzeniu, co CLA faktycznie kupuje:

- kod na MIT wolno włożyć do **zamkniętego, płatnego pakietu**, i dotyczy to również cudzych
  kontrybucji — warunkiem jest zachowanie noty. Otwarcie płatnego poziomu nie wymaga więc
  żadnej zgody kontrybutorów;
- kontrybucje przychodzą na licencji repozytorium z automatu (regulamin GitHuba), więc
  „rdzeń zostaje MIT" nie potrzebuje niczyjego podpisu;
- CLA kupuje dokładnie jedno: prawo sprzedaży licencji komercyjnej **na ten sam kod, bez
  zobowiązań MIT**. Zobowiązaniem MIT jest jedna linijka noty — nikt nie zapłaci za
  wypisanie się z niej. Dual-licensing działa przy (A)GPL, gdzie jest z czego się wykupić.

Cena CLA — tarcie przy każdym zewnętrznym PR — byłaby więc płacona za nic.

## Konsekwencje

- `LICENSE` stoi w korzeniu i w `libs/components/`, skąd ng-packagr kopiuje go do pakietu
  bez wpisu w `assets` (sprawdzone przebiegiem, nie założone).
- Pole `author` w manifeście wskazuje ten sam podmiot co linia `Copyright`.
- Rozjazd pola `license` z treścią pliku jest od teraz **błędem bramki**, a nie
  ostrzeżeniem: obie strony da się zmienić osobno i nic ich dotąd nie wiązało.
- Otwarcie płatnego poziomu w przyszłości nie wymaga zmiany tej decyzji ani niczyjej zgody
  — wymaga tylko, żeby te komponenty **nie zostały wydane na MIT**.

## Co przez to tracimy

- **Rdzeń jest nieodwracalnie forkowalny.** Nawet trzymając komplet praw, ostatnia wydana
  wersja MIT zostaje wolna na zawsze. Przy próbie zmiany licencji fork powstaje w tygodnie —
  Terraform → OpenTofu, Redis → Valkey, Elasticsearch → OpenSearch. MIT na rdzeń traktujemy
  jako stan trwały, nie etap.
- **Każdy może wziąć ten kod i go sprzedawać**, i jest to zgodne z licencją. Jedyną ochroną
  pod MIT jest **znak towarowy i bycie upstreamem** — nazwa `pacit` oraz zakres `@pacit`,
  nie kod. Rezerwacja zakresu i ewentualne zgłoszenie znaku są poza tą decyzją, ale są tym,
  co realnie chroni.
- **Prawdziwy dual-licensing przestaje być dostępny.** Gdyby kiedyś okazał się potrzebny,
  wymagałby zgody każdego kontrybutora z osobna.
- **Zarobek nie jest tą decyzją przesądzony ani zapewniony.** MIT jest warunkiem adopcji,
  a nie modelem biznesowym; wszystko, co może zarabiać, powstaje **obok** rdzenia i wymaga
  osobnej decyzji, gdy będzie z czego wybierać.

## Rozważane alternatywy

| alternatywa                    | dlaczego odrzucona                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apache-2.0                     | jawna licencja patentowa i zastrzeżenie znaku, ale przy bibliotece komponentów ryzyko patentowe jest bliskie zeru — zostaje rozjazd z ekosystemem |
| (A)GPL, SSPL, BSL, FSL         | kod ląduje w bundlu klienta, więc copyleft odstrasza korporacje, a licencje source-available oblewają wymóg „OSI-approved" w przetargach          |
| MIT + dual-licensing od razu   | maszyneria (CLA, dwie ścieżki licencyjne) za lever, który pod MIT nic nie waży — nie ma z czego się wykupywać                                     |
| MIT + CLA „na wszelki wypadek" | tarcie przy każdym PR za opcję, której realizacja i tak nie wymaga CLA                                                                            |
