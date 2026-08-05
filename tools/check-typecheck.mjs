#!/usr/bin/env node
/**
 * Bramka typechecku: sprawdza, czy w workspace nie ma kodu TypeScriptu, którego
 * kompilator nie widzi — czyli czy obietnica `wym-jakosc-typecheck` ma za sobą pomiar,
 * a nie samą listę targetów w CI.
 *
 * Powód istnienia. `lekcja-42`: `sandbox-e2e` miał `lint` i `e2e`, ale ŻADNEGO targetu
 * typecheck, więc kilkanaście plików nie przeszło przez kompilator ani razu. Dodanie
 * targetu ujawniło w pierwszym przebiegu trzy błędy — i nie w testach, tylko w tsconfigu,
 * który opisywał projekt nieprawdziwie. Lint tego nie łapie: ESLint parsuje i sprawdza
 * reguły, ale nie zgłasza błędów typów ani niespójności konfiguracji modułów.
 *
 * Wada była cicha, bo nic nie pytało „a czy ten projekt w ogóle ma czym się sprawdzić".
 * `nx affected -t typecheck` uruchamia target tam, gdzie istnieje, i milczy tam, gdzie
 * go nie ma — więc nowy projekt rodzi się nietypecheckowany, a przebieg jest zielony.
 *
 * Sprawdzane są cztery rzeczy:
 *  1. MIANOWNIK: każdy plik TypeScriptu z indeksu gita należy do jakiegoś projektu,
 *  2. każdy projekt z plikami TypeScriptu ma target `typecheck`,
 *  3. polecenie tego targetu daje się zmierzyć i nie jest rozbrojone,
 *  4. POKRYCIE: każdy plik projektu jest w programie jego kompilatora.
 *
 * Punkt 4 jest tym, dla którego ta bramka w ogóle powstała w tej formie. Sam punkt 2
 * mierzy ISTNIENIE targetu, a nie jego zasięg — a `lekcja-42` mówi wprost, że tsconfig
 * potrafi kłamać o tym, co obejmuje. Target wskazujący konfigurację z `"include": []`
 * przechodziłby punkt 2 w komplecie i nie sprawdzał niczego. Tak samo nowy entrypoint
 * biblioteki: `libs/components/tsconfig.lib.json` wylicza katalogi po nazwie, więc
 * `dialog/` dopisany bez ruszania tego pliku wypadłby z kompilacji bez jednego czerwonego
 * przebiegu.
 *
 * Skąd bierze się „program kompilatora". Z uruchomienia POLECENIA Z TARGETU, rozszerzonego
 * o `--listFilesOnly`, a nie z odczytania `include`/`exclude` z tsconfiga. To rozróżnienie
 * jest treścią `lekcja-42`: deklaracja i rzeczywistość rozjechały się tam po cichu i dopiero
 * kompilator pokazał różnicę. Bramka czytająca `include` mierzyłaby drugi raz to samo
 * zdanie, które okazało się nieprawdziwe. `--showConfig` odpada z tego samego powodu:
 * rozwija `include` do listy plików, ale nie widzi plików wciągniętych przez import.
 *
 * Punkt 1 jest mianownikiem obu pozostałych i nie jest teoretyczny: `vitest.config.ts`
 * i `vitest.workspace.ts` leżą w korzeniu, nie należą do żadnej biblioteki ani aplikacji
 * i do 2026-08-05 nie widział ich żaden kompilator. Punkty 2–4 chodzą po projektach, więc
 * plik spoza któregokolwiek projektu byłby dla nich niewidzialny — czyli obietnica
 * „nie ma takiego kodu" byłaby prawdziwa dokładnie o tyle, o ile bramka nie potrafi go
 * zobaczyć.
 *
 * Do tego przebieg, który nie bada workspace'u, tylko TĘ BRAMKĘ: kontrola odniesienia
 * z `tools/check-typecheck.fixtures/`. Spreparowane wejścia, z których każde łamie
 * dokładnie jeden z czterech punktów i musi zostać odrzucone przez ten właśnie punkt
 * (`wym-jakosc-kontrola`).
 *
 * Użycie:
 *   node tools/check-typecheck.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-typecheck.fixtures');
const BAZA = '_poprawny.json';

/** Rozszerzenia, które kompilator TypeScriptu ma widzieć. */
const TYPESCRIPT = /\.(?:m|c)?tsx?$/;

/**
 * Czym bramka zamienia polecenie targetu w listę plików. `--listFilesOnly` wypisuje
 * program i zatrzymuje przetwarzanie przed sprawdzaniem typów, więc pomiar jest tani
 * i nie powiela pracy samego targetu. `--noEmit` jest tu na wszelki wypadek: część
 * konfiguracji ma `outDir` (schematics kompilują się do `dist/`), a bramka nie ma prawa
 * niczego zapisać po drodze.
 */
const POMIAR = '--listFilesOnly --noEmit';

/** Polecenie jest wywołaniem `tsc` — inaczej `--listFilesOnly` nic nie znaczy. */
const TSC = /(?:^|[/\\])tsc(?:\s|$)/;

/**
 * Konfiguracja wskazana WPROST. Nie jest to czystoformalny wymóg: bez `-p` tsc szuka
 * `tsconfig.json` w górę od katalogu roboczego, więc zasięg targetu zależy od `cwd`
 * ustawionego gdzie indziej w `project.json` — i nie widać go w miejscu wywołania.
 * Wyklucza to też `tsc --build`, który dla listy plików jest nieprzezroczysty: buduje
 * referencje po kolei i `--listFilesOnly` nie ma jak go opisać. Jedna konfiguracja
 * na polecenie, tyle poleceń, ile programów.
 */
const PROJEKT = /(?:^|\s)(?:-p|--project)\s+\S/;

/**
 * Operatory powłoki. `nx:run-commands` puszcza polecenie przez shell, więc
 * `tsc --noEmit -p x || true` jest targetem, który przechodzi ZAWSZE i wygląda
 * w `project.json` dokładnie jak bramka. Kosztuje jeden znak, a rozbraja typecheck
 * całego projektu.
 */
const OPERATORY = /[;|&]/;

/**
 * Flagi wyłączające sprawdzanie. `--noCheck` (TS 5.6+) zostawia tylko błędy parsowania
 * i emisji, `--listFilesOnly` zatrzymuje tsc przed sprawdzaniem typów — czyli obie
 * zamieniają target w kosztowny no-op. Bramka używa drugiej z nich do POMIARU, więc
 * musi wprost zabronić jej w mierzonym poleceniu: inaczej rozbrojony target i pomiar
 * wyglądałyby identycznie.
 */
const BEZ_SPRAWDZANIA = [
  ['--noCheck', /(?:^|\s)--noCheck(?:\s|=|$)/],
  ['--listFilesOnly', /(?:^|\s)--listFilesOnly(?:\s|$)/],
];

/**
 * Naruszenie jednej z czterech kontroli. Niesie identyfikator kontroli, a nie tylko
 * komunikat: kontrola odniesienia musi sprawdzić, że spreparowane wejście zapaliło
 * NA SWOIM punkcie — fixture wywalający się z innego powodu niż wpisany w nim samym
 * dowodzi czegoś innego, niż deklaruje.
 */
class BladTypecheck extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

/**
 * Wada polecenia albo `null`. Jedno miejsce dla dwóch wywołań: punktu 3 i warstwy
 * wejścia, która musi odrzucić polecenie z operatorem powłoki ZANIM je uruchomi.
 */
const wadaPolecenia = (polecenie) => {
  if (typeof polecenie !== 'string')
    return (
      `nie jest łańcuchem znaków (${JSON.stringify(polecenie)}) — ` +
      `\`commands\` przyjmuje też obiekty, a taki wpis bez pola \`command\` wypadłby z pomiaru`
    );
  if (OPERATORY.test(polecenie))
    return `zawiera operator powłoki — polecenie w rodzaju \`tsc … || true\` przechodzi zawsze`;
  if (!TSC.test(polecenie))
    return `nie jest wywołaniem \`tsc\` — bramka nie ma jak zmierzyć, jakie pliki widzi`;
  if (!PROJEKT.test(polecenie))
    return (
      `nie wskazuje konfiguracji przez \`-p\` — zasięg zależy wtedy od \`cwd\`, ` +
      `a \`tsc --build\` dodatkowo nie daje się opisać listą plików`
    );
  const wylaczone = BEZ_SPRAWDZANIA.filter(([, wzorzec]) =>
    wzorzec.test(polecenie),
  ).map(([nazwa]) => nazwa);
  if (wylaczone.length)
    return (
      `ma flagę wyłączającą sprawdzanie typów (${wylaczone.join(', ')}) — ` +
      `target biegnie, kosztuje czas CI i nie sprawdza niczego`
    );
  return null;
};

/**
 * Projekt, do którego należy plik: najgłębszy korzeń będący jego przedrostkiem.
 * Projekt roota (`.`) jest przedrostkiem wszystkiego, więc przegrywa z każdym innym
 * i zbiera wyłącznie to, czego nie wziął nikt.
 */
const wlasciciel = (plik, projekty) =>
  projekty
    .filter((p) => p.korzen === '.' || plik.startsWith(`${p.korzen}/`))
    .sort((a, b) => b.korzen.length - a.korzen.length)[0] ?? null;

/**
 * Komplet kontroli na gotowym wejściu:
 *   `projekty` — `[{ nazwa, korzen, typecheck: { cwd, polecenia } | null }]`,
 *   `pliki`    — ścieżki plików TypeScriptu z indeksu gita, względem korzenia repo,
 *   `widziane` — `{ [projekt]: [pliki] }`, program kompilatora zmierzony `--listFilesOnly`.
 * Rzuca `BladTypecheck` przy pierwszym naruszeniu — kontrole idą od mianownika, więc
 * dalsze i tak nie miałyby czego badać.
 */
const sprawdzTypecheck = ({ projekty, pliki, widziane }) => {
  // 1. MIANOWNIK. Najpierw obie listy muszą w ogóle istnieć: pusta którakolwiek daje
  // bramkę, która przechodzi zawsze, bo nie ma czego porównywać.
  if (!projekty.length)
    throw new BladTypecheck(
      'mianownik',
      `graf Nx nie zwrócił ani jednego projektu — punkty 2–4 przeszłyby wtedy zawsze, ` +
        `bo chodzą po tej właśnie liście`,
    );
  if (!pliki.length)
    throw new BladTypecheck(
      'mianownik',
      `nie znalazłem ani jednego pliku TypeScriptu w indeksie gita — ` +
        `bramka porównywałaby program kompilatora z pustym zbiorem, czyli z niczym`,
    );

  const wlasnosc = new Map(projekty.map((p) => [p.nazwa, []]));
  const sieroty = [];
  for (const plik of pliki) {
    const projekt = wlasciciel(plik, projekty);
    if (projekt) wlasnosc.get(projekt.nazwa).push(plik);
    else sieroty.push(plik);
  }
  if (sieroty.length)
    throw new BladTypecheck(
      'mianownik',
      `${sieroty.length} plików TypeScriptu nie należy do żadnego projektu:\n` +
        sieroty.map((s) => `      ${s}`).join('\n') +
        `\n    Punkty 2–4 chodzą po projektach, więc taki plik jest dla nich niewidzialny — ` +
        `a to znaczy, że nie sprawdza go nikt. Lek: projekt obejmujący ten katalog albo ` +
        `przeniesienie pliku do istniejącego (wym-jakosc-typecheck).`,
    );

  // Projekty bez ani jednego pliku TypeScriptu są poza resztą bramki świadomie:
  // `tokens` generuje CSS/SCSS/TS z JSON-ów skryptem `.mjs` i wymaganie od niego
  // targetu `typecheck` byłoby żądaniem sprawdzenia pustego zbioru.
  const zKodem = projekty.filter((p) => wlasnosc.get(p.nazwa).length);

  // 2. Istnienie targetu. To punkt z `lekcja-42` wprost.
  const bezTargetu = zKodem.filter((p) => !p.typecheck);
  if (bezTargetu.length)
    throw new BladTypecheck(
      'target',
      `${bezTargetu.length} projektów ma pliki TypeScriptu i żadnego targetu \`typecheck\`:\n` +
        bezTargetu
          .map(
            (p) =>
              `      ${p.nazwa} (${p.korzen}): ${wlasnosc.get(p.nazwa).length} plików`,
          )
          .join('\n') +
        `\n    \`nx affected -t typecheck\` milczy tam, gdzie targetu nie ma, więc ` +
        `przebieg jest zielony, a kompilator nie widział tych plików ani razu (lekcja-42).`,
    );

  // 3. Mierzalność polecenia. Bez tego punktu rozbrojony target i target sprawdzany
  // wyglądałyby dla punktu 4 tak samo — pomiar zwróciłby pustkę albo śmieci.
  // `?.` nie jest tu ostrożnością na wyrost: po przejściu punktu 2 `typecheck` na pewno
  // istnieje, ale to znaczy dokładnie tyle, że ten punkt polega na poprzednim. Bez tego
  // zapisu ROZBROJENIE punktu 2 zamienia bramkę w wyjątek zamiast w komunikat — czyli
  // kontrola odniesienia przestaje umieć zbadać punkt, który miała zbadać.
  const wadliwe = zKodem.flatMap((p) => {
    const polecenia = p.typecheck?.polecenia ?? [];
    if (!polecenia.length)
      return [`${p.nazwa}: target \`typecheck\` nie ma ani jednego polecenia`];
    return polecenia.flatMap((polecenie) => {
      const wada = wadaPolecenia(polecenie);
      return wada ? [`${p.nazwa}: \`${polecenie}\` — ${wada}`] : [];
    });
  });
  if (wadliwe.length)
    throw new BladTypecheck(
      'polecenie',
      `${wadliwe.length} poleceń targetu \`typecheck\` nie da się zmierzyć albo jest rozbrojonych:\n` +
        wadliwe.map((w) => `      ${w}`).join('\n') +
        `\n    Punkt 4 porównuje pliki projektu z programem TEGO polecenia, więc ` +
        `polecenie, którego nie da się odczytać, zabiera mu mianownik.`,
    );

  // 4. POKRYCIE. Punkt 2 mierzy istnienie targetu, ten mierzy jego zasięg — a między
  // jednym a drugim mieści się cała `lekcja-42`.
  const nieobjete = zKodem.flatMap((p) => {
    const program = new Set(widziane[p.nazwa] ?? []);
    return wlasnosc
      .get(p.nazwa)
      .filter((plik) => !program.has(plik))
      .map((plik) => `${p.nazwa}: ${plik}`);
  });
  if (nieobjete.length)
    throw new BladTypecheck(
      'pokrycie',
      `${nieobjete.length} plików nie wchodzi do programu kompilatora swojego projektu:\n` +
        nieobjete.map((n) => `      ${n}`).join('\n') +
        `\n    Target \`typecheck\` istnieje i przechodzi, ale tych plików nie ogląda: ` +
        `najczęściej dlatego, że tsconfig wylicza katalogi po nazwie, a doszedł nowy. ` +
        `Lek: rozszerzyć \`include\` albo dołożyć polecenie z drugą konfiguracją.`,
    );

  return (
    `${pliki.length} plików TypeScriptu w ${zKodem.length} projektach ` +
    `(${projekty.length - zKodem.length} bez kodu TS), ` +
    `każdy w programie swojego kompilatora`
  );
};

// ── wejście z dysku ───────────────────────────────────────────────────────────

/**
 * Projekty z grafu Nx, a nie z listy `project.json` na dysku: targety bywają
 * INFEROWANE przez wtyczki (`@nx/vite/plugin` dokłada `typecheck`), więc lista czytana
 * z plików pokazywałaby braki tam, gdzie ich nie ma, i odwrotnie — nie pokazywałaby
 * projektu, który wtyczka dopiero utworzyła.
 */
const projektyGrafu = async () => {
  const { createProjectGraphAsync } = await import('@nx/devkit');
  const graf = await createProjectGraphAsync({ exitOnError: false });

  return Object.entries(graf.nodes).map(([nazwa, wezel]) => {
    const target = wezel.data.targets?.typecheck;
    if (!target) return { nazwa, korzen: wezel.data.root, typecheck: null };

    const { command, commands, cwd } = target.options ?? {};
    const lista = commands ?? (command === undefined ? [] : [command]);
    return {
      nazwa,
      korzen: wezel.data.root,
      typecheck: {
        cwd: cwd ?? '.',
        // Obiekty zostają obiektami: `wadaPolecenia` powie, czego nie umie odczytać.
        // Milczące odsianie ich tutaj zmniejszałoby liczbę mierzonych programów.
        polecenia: lista.map((c) =>
          typeof c === 'string' ? c : (c?.command ?? c),
        ),
      },
    };
  });
};

/**
 * Pliki z indeksu gita, a nie ze skanu katalogów: artefakty generowane
 * (`libs/tokens/dist/tokens.ts`) są gitignorowane i nie są niczyim kodem źródłowym —
 * powstają przy każdym buildzie i nikt ich nie utrzymuje.
 */
const plikiRepo = () =>
  execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((plik) => TYPESCRIPT.test(plik))
    .sort();

/**
 * Program kompilatora każdego projektu: polecenie z targetu rozszerzone o `--listFilesOnly`.
 * Suma po wszystkich poleceniach, bo projekt bywa kilkoma rozłącznymi programami naraz
 * (biblioteka: pakiet, specyfikacje, schematics) i dopiero razem pokrywają jego pliki.
 */
const widzianePrzezKompilator = (projekty) => {
  const widziane = {};

  for (const projekt of projekty) {
    if (!projekt.typecheck) continue;
    const program = new Set();

    for (const polecenie of projekt.typecheck.polecenia) {
      // Sprawdzenie PRZED uruchomieniem: polecenie z operatorem powłoki trafiłoby
      // stąd wprost do shella, a bramka nie ma prawa uruchomić czegoś, czego nie
      // rozpoznaje. Punkt 3 zgłosi to samo, tylko z pełną listą.
      if (wadaPolecenia(polecenie)) continue;

      let wynik;
      try {
        wynik = execSync(`${polecenie} ${POMIAR}`, {
          cwd: join(ROOT, projekt.typecheck.cwd),
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          // Programy Angulara wciągają kilka tysięcy plików `.d.ts` — domyślny
          // megabajt bufora nie starcza, a przepełnienie objawiłoby się jako
          // pusty program, czyli jako fałszywe trafienie punktu 4.
          maxBuffer: 64 * 1024 * 1024,
          env: {
            ...process.env,
            PATH: `${join(ROOT, 'node_modules/.bin')}:${process.env.PATH}`,
          },
        });
      } catch (blad) {
        throw new BladTypecheck(
          'polecenie',
          `nie udało się zmierzyć programu dla \`${projekt.nazwa}\`:\n` +
            `      ${polecenie} ${POMIAR}\n` +
            `    ${String(blad.stderr || blad.stdout || blad.message)
              .trim()
              .split('\n')
              .slice(0, 5)
              .join('\n    ')}`,
        );
      }

      for (const linia of wynik.split('\n')) {
        const sciezka = linia.trim();
        if (!sciezka) continue;
        const wzgledna = relative(ROOT, sciezka).split('\\').join('/');
        if (wzgledna.startsWith('..') || wzgledna.includes('node_modules/'))
          continue;
        program.add(wzgledna);
      }
    }

    widziane[projekt.nazwa] = [...program].sort();
  }

  return widziane;
};

// ── kontrola odniesienia ──────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

/**
 * Składa wejście przypadku NA KOPII wzorcowego, więc plik przypadku zawiera wyłącznie
 * swoją wadę — nie da się zepsuć czegoś przy okazji i nie zauważyć.
 */
const zlozFixture = (fx) => {
  const baza = wczytajFixture(BAZA);
  const wejscie = structuredClone({
    projekty: baza.projekty,
    pliki: baza.pliki,
    widziane: baza.widziane,
  });

  if (fx.wyczyscProjekty) wejscie.projekty = [];
  if (fx.wyczyscPliki) wejscie.pliki = [];
  wejscie.projekty = wejscie.projekty.filter(
    (p) => !(fx.usunProjekty ?? []).includes(p.nazwa),
  );
  wejscie.pliki.push(...(fx.dopiszPliki ?? []));
  for (const projekt of wejscie.projekty) {
    if ((fx.usunTypecheck ?? []).includes(projekt.nazwa))
      projekt.typecheck = null;
    if (fx.podmienPolecenia?.[projekt.nazwa])
      projekt.typecheck.polecenia = fx.podmienPolecenia[projekt.nazwa];
  }
  for (const nazwa of fx.wyczyscWidziane ?? []) wejscie.widziane[nazwa] = [];

  return wejscie;
};

// ── przebieg ──────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  const projekty = await projektyGrafu();
  opis = sprawdzTypecheck({
    projekty,
    pliki: plikiRepo(),
    widziane: widzianePrzezKompilator(projekty),
  });
} catch (blad) {
  if (!(blad instanceof BladTypecheck)) throw blad;
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== BAZA)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-typecheck.fixtures: brak spreparowanych wejść — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (wym-jakosc-kontrola)`,
  );

// Wejście wzorcowe MUSI przejść. Gdyby samo było wadliwe, każdy przypadek zapalałby
// z jego powodu, a nie z powodu swojej wady — i wszystkie „zapaliło" byłyby fałszywe.
try {
  sprawdzTypecheck(zlozFixture({}));
} catch (blad) {
  if (!(blad instanceof BladTypecheck)) throw blad;
  problems.push(
    `${BAZA}: wejście wzorcowe NIE przechodzi (${blad.kontrola}) — ` +
      `każdy spreparowany przypadek zapala teraz z jego powodu.\n    ${blad.message}`,
  );
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzTypecheck(zlozFixture(fx));
    problems.push(
      `${nazwa}: spreparowane wejście PRZESZŁO, a miało nie przejść — ` +
        `punkt ${fx.punkt} (\`${fx.kontrola}\`) przestał cokolwiek badać`,
    );
  } catch (blad) {
    if (!(blad instanceof BladTypecheck)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: zapaliła kontrola \`${blad.kontrola}\`, a miał punkt ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) — fixture dowodzi czegoś innego, niż deklaruje`,
      );
  }
}

// ── wynik ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Bramka typechecku — ${problems.length} naruszeń:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Typecheck: ${opis}. Kontrola odniesienia: wejście wzorcowe przechodzi, ` +
    `${przypadki.length} spreparowanych odrzuconych na swoich punktach.`,
);
