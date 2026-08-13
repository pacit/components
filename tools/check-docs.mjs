#!/usr/bin/env node
/**
 * Bramka dokumentacji: sprawdza, czy każda obietnica z `docs/` wskazuje maszynę,
 * która potrafi na niej zapalić — i czy ta maszyna istnieje.
 *
 * Powód istnienia (`req-quality-registry`): rozjazd między dokumentacją a rzeczywistością
 * już wystąpił i już go raz łatano ręcznie. Nagłówek „Jak czytać ten dokument" istniał
 * dokładnie dlatego, że wymagania dawały się czytać jako opis stanu kodu, a odpowiedzią
 * było dopisanie 18 adnotacji `_(niezrealizowane)_` jednym commitem po fakcie. To ten sam
 * wzorzec co ręczny `node libs/tokens/build.mjs` w CI przed `lesson-36`: obejście, które
 * MASKUJE brak struktury zamiast go ujawnić — i rozjeżdża się przy pierwszym commicie
 * robiącym coś innego, niż mówi.
 *
 * Sprawdzane jest sześć rzeczy:
 *  1. kompletność — każde wymaganie ma `Obietnica`, `Bramka` i `Kontrola`; każda `luka`
 *     ma też `Wiąże przy`,
 *  2. istnienie — każda ścieżka cytowana w `Bramka`/`Kontrola` istnieje na dysku,
 *  3. wpięcie w CI — target wynikający z cytowanej ścieżki faktycznie biegnie
 *     w `nx affected -t …`; to ta sama kontrola co punkt 5 w `check-package.mjs`,
 *  4. brak wiszących cytowań — każde `req-*` / `lesson-*` w repo się rozwiązuje,
 *     a obie martwe przestrzenie (numeryczna i polska) są odrzucane,
 *  5. świeżość — `docs/registry.md` i wygenerowana unia ID zgadzają się ze źródłem,
 *  6. kontrola odniesienia — celowo wadliwe wymagania z `tools/check-docs.fixtures/`
 *     MUSZĄ zostać odrzucone.
 *
 * Punkt 6 nie jest ozdobnikiem: rejestr sam jest bramką, więc podlega
 * `req-quality-negative-control` tak samo jak każda inna. Bez niego byłby dokładnie tym, co
 * opisuje `lesson-39` — bramką urodzoną martwą.
 *
 * Użycie:
 *   node tools/check-docs.mjs           weryfikuje (CI)
 *   node tools/check-docs.mjs --write   regeneruje rejestr i unię ID
 */
import { readFileSync, writeFileSync, existsSync, globSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const REJESTR = 'docs/registry.md';
const REQ_IDS = 'apps/sandbox/src/app/ui/doc-ids.ts';

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

// ── źródła ────────────────────────────────────────────────────────────────────

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const REQ_FILES = [
  'docs/00-axis.md',
  ...globSync('docs/requirements/*.md', { cwd: ROOT }).sort(),
];

const trackedFiles = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

/**
 * Pliki, w których stare identyfikatory są treścią, a nie cytowaniem:
 * `docs/README.md` wiezie tabelę migracji, `docs/overview.md` jest drogowskazem po
 * rozbiciu, `docs/review.md` to datowana migawka zostawiona w swojej postaci.
 */
const CITATION_EXEMPT = new Set([
  'docs/README.md',
  'docs/overview.md',
  'docs/review.md',
  REJESTR,
]);

/** Indeks nazw plików — pozwala zweryfikować cytowanie `number.spec.ts` bez katalogu. */
const byBasename = new Map();
for (const f of trackedFiles) {
  const b = basename(f);
  if (!byBasename.has(b)) byBasename.set(b, []);
  byBasename.get(b).push(f);
}

// ── parser wymagań ────────────────────────────────────────────────────────────

const FIELD =
  /^\*\*(Promise|Gate|Control|Decision|Lessons|Binds at|Non-goals|Exceptions)[.:]\*\*/;
const HEADING = /^#{2,3} <a id="(req-[a-z0-9-]+)"><\/a>`\1` — (.+)$/;

/**
 * Zwraca listę wymagań. Pole kończy się dopiero na następnym polu ZE ZNANEJ LISTY —
 * nie na dowolnej linii zaczynającej się od `**`, bo zawinięty tekst potrafi zacząć
 * się od pogrubienia (np. „— bada\n**spakowany artefakt**, nie źródła").
 */
const parseRequirements = (text, file) => {
  const out = [];
  const lines = text.split('\n');
  let cur = null;
  let field = null;

  const push = () => {
    if (cur) out.push(cur);
  };

  for (const line of lines) {
    const h = line.match(HEADING);
    if (h) {
      push();
      cur = { id: h[1], title: h[2], file, fields: {} };
      field = null;
      continue;
    }
    if (!cur) continue;
    const f = line.match(FIELD);
    if (f) {
      field = f[1];
      cur.fields[field] =
        (cur.fields[field] ?? '') + line.slice(f[0].length).trim();
      continue;
    }
    if (field) cur.fields[field] += ' ' + line.trim();
  }
  push();
  return out;
};

const requirements = REQ_FILES.flatMap((f) => parseRequirements(read(f), f));

if (requirements.length === 0)
  fail('docs', 'nie znalazłem ani jednego wymagania');

const ids = new Set(requirements.map((r) => r.id));
const dupes = requirements
  .map((r) => r.id)
  .filter((id, i, a) => a.indexOf(id) !== i);
for (const d of new Set(dupes))
  fail('docs', `zduplikowany identyfikator \`${d}\``);

// ── lekcje ────────────────────────────────────────────────────────────────────

const lessonIds = new Set(
  [...read('docs/lessons.md').matchAll(/<a id="(lesson-\d+)"><\/a>/g)].map(
    (m) => m[1],
  ),
);

// ── 1. kompletność + klasyfikacja stanu ───────────────────────────────────────

const BRAK = /^none\s*[—-]\s*(deliberately|gap)\s*:\s*(.+)$/s;

/** `egzekwowane` | `świadomie` | `luka` | null (błąd) */
const classify = (value, req, fieldName) => {
  const v = (value ?? '').trim();
  if (!v) {
    fail(req.id, `pole **${fieldName}** jest puste`);
    return null;
  }
  if (/^not applicable\b/i.test(v)) return 'świadomie';
  if (/^none\b/.test(v)) {
    const m = v.match(BRAK);
    if (!m) {
      fail(
        req.id,
        `pole **${fieldName}** mówi „none", ale bez formy \`none — deliberately: <powód>\` ` +
          `albo \`none — gap: <co trzeba>\``,
      );
      return null;
    }
    if (m[2].trim().length < 10)
      fail(
        req.id,
        `pole **${fieldName}**: powód braku jest pusty albo zbyt ogólny`,
      );
    return m[1] === 'gap' ? 'luka' : 'świadomie';
  }
  return 'egzekwowane';
};

for (const req of requirements) {
  if (!req.fields.Promise?.trim()) fail(req.id, 'brak pola **Promise**');
  if (req.fields.Gate === undefined) fail(req.id, 'brak pola **Gate**');
  if (req.fields.Control === undefined) fail(req.id, 'brak pola **Control**');

  req.stanBramki = classify(req.fields.Gate, req, 'Gate');
  req.stanKontroli = classify(req.fields.Control, req, 'Control');

  req.stan =
    req.stanBramki === 'egzekwowane' && req.stanKontroli === 'egzekwowane'
      ? 'egzekwowane'
      : req.stanBramki === 'luka' || req.stanKontroli === 'luka'
        ? 'luka'
        : req.stanBramki === null || req.stanKontroli === null
          ? 'BŁĄD'
          : 'częściowo';

  if (req.stan === 'luka' && !req.fields['Binds at']?.trim())
    fail(
      req.id,
      'stan `luka`, ale brak pola **Binds at** — luka bez terminu jest życzeniem',
    );
}

// ── 2. istnienie cytowanych ścieżek ───────────────────────────────────────────

const PATHISH = /`([^`\n]+)`/g;
const ROOTS = /^(libs|apps|tools|\.github|\.verdaccio)\//;

/** Rozwiązuje cytowanie na listę realnych plików albo zwraca null, gdy to nie ścieżka. */
const resolveCitation = (raw) => {
  // „plik.spec.ts › nazwa testu" — ścieżką jest część przed strzałką
  const path = raw
    .split('›')[0]
    .trim()
    .replace(/[.,;]$/, '');
  if (ROOTS.test(path)) {
    if (path.includes('*')) {
      const hits = globSync(path, { cwd: ROOT });
      return hits.length ? hits : [];
    }
    return existsSync(join(ROOT, path)) ? [path] : [];
  }
  // Goła nazwa pliku — tylko dla kształtów, które w tej dokumentacji ZNACZĄ ścieżkę
  // (`number.spec.ts`, `playwright.config.mts`). Celowo wąsko: `zone.js` i `pct.css`
  // padają w tekście jako nazwy rzeczy, nie jako cytowania plików, a szeroka reguła
  // zgłaszałaby je jako brakujące pliki.
  if (/\.(spec|config)\.(ts|mts)$/.test(path))
    return byBasename.get(path) ?? [];
  return null;
};

const citedPaths = new Map(); // ścieżka -> Set(id wymagań)

for (const req of requirements) {
  for (const fieldName of ['Gate', 'Control']) {
    const value = req.fields[fieldName] ?? '';
    if (/^\s*(none|not applicable)\b/.test(value)) continue;
    for (const [, raw] of value.matchAll(PATHISH)) {
      const hits = resolveCitation(raw);
      if (hits === null) continue; // nie wygląda na ścieżkę (nazwa targetu, token, …)
      if (hits.length === 0) {
        fail(
          req.id,
          `pole **${fieldName}** wskazuje na nieistniejącą ścieżkę \`${raw}\``,
        );
        continue;
      }
      for (const h of hits) {
        if (!citedPaths.has(h)) citedPaths.set(h, new Set());
        citedPaths.get(h).add(req.id);
      }
    }
  }
}

// ── 3. wpięcie w CI ───────────────────────────────────────────────────────────

const ci = read('.github/workflows/ci.yml');
const ciTargets = new Set(
  [...ci.matchAll(/nx affected -t ([a-z0-9:\-\s]+)/g)]
    .flatMap((m) => m[1].trim().split(/\s+/))
    .filter(Boolean),
);

/** Z jakiego targetu biegnie plik. `null` = nie da się wywnioskować i to jest w porządku. */
const impliedTarget = (path) => {
  if (path.startsWith('apps/sandbox-e2e/')) return 'e2e';
  if (path.startsWith('apps/sandbox/') && path.endsWith('.spec.ts'))
    return 'vite:test';
  if (path.startsWith('libs/components/') && path.endsWith('.spec.ts'))
    return 'test';
  if (path.endsWith('eslint.config.mjs')) return 'lint';
  return null;
};

for (const [path, reqIds] of citedPaths) {
  const target = impliedTarget(path);
  if (target && !ciTargets.has(target))
    fail(
      [...reqIds][0],
      `\`${path}\` jest bramką, ale target \`${target}\` nie biegnie w CI ` +
        `(\`nx affected -t\` w ci.yml) — bramka poza CI nie jest bramką`,
    );
}

// Jawne wzmianki „target `X`" — tylko w polach, które faktycznie deklarują bramkę.
// W treści `none — gap: …` nazwa targetu bywa opisem stanu („target `local-registry`
// istnieje i nie jest przez nic używany"), a nie deklaracją, że coś biegnie w CI.
for (const req of requirements) {
  const declared = ['Gate', 'Control']
    .map((f) => req.fields[f] ?? '')
    .filter((v) => !/^\s*(none|not applicable)\b/.test(v));
  const text = declared.join(' ');
  for (const [, name] of text.matchAll(/target `([a-z0-9:\-]+)`/g)) {
    if (name.includes(':')) continue; // np. `tokens:build` — biegnie przez `^build`
    if (!ciTargets.has(name))
      fail(
        req.id,
        `wskazany target \`${name}\` nie biegnie w \`nx affected -t\` w CI`,
      );
  }
}

// ── 4. wiszące cytowania w całym repo ─────────────────────────────────────────

/**
 * Dwie martwe przestrzenie nazw, obie odrzucane. Numeryczna jest z migracji
 * 2026-07-27, polska (`wym-…`, `lekcja-N`) — z 2026-08-06; obie rozwiązuje tabela
 * w `docs/README.md`. Wzorzec polski wymaga litery po myślniku, więc zdanie
 * o samym prefiksie (`wym-*`, `wym-…`) nie jest cytowaniem i nie zapala.
 */
const LEGACY =
  /wym-(proj|tech|ws|sbx|api|a11y|styl|theme|token|ikon|test|wer|real)-\d+|\bwym-[a-z][a-z0-9-]*[a-z0-9]\b|\blekcja-\d+\b/g;
/**
 * Cytowanie nie jest **segmentem ścieżki**: `req-` jest przedrostkiem tak zwyczajnym, że
 * trafia się w nazwach plików (`req-ids.ts` zapalało tę bramkę jako wiszące cytowanie).
 * Stąd wykluczenie ukośnika przed i rozszerzenia po.
 */
const REF =
  /(?<![\w/-])(req-[a-z][a-z0-9-]*[a-z0-9]|lesson-\d+)(?![\w-]|\.[a-z])/g;

for (const rel of trackedFiles) {
  if (CITATION_EXEMPT.has(rel)) continue;
  if (rel.startsWith('tools/check-docs.fixtures/')) continue;
  if (rel === 'tools/check-docs.mjs') continue;
  let text;
  try {
    text = readFileSync(join(ROOT, rel), 'utf8');
  } catch {
    continue;
  }
  if (
    !text.includes('req-') &&
    !text.includes('lesson-') &&
    !text.includes('wym-') &&
    !text.includes('lekcja-')
  )
    continue;

  for (const [old] of text.matchAll(LEGACY))
    fail(
      rel,
      `stary identyfikator \`${old}\` — patrz tabele migracji w docs/README.md`,
    );

  for (const [, ref] of text.matchAll(REF)) {
    if (ref.startsWith('lesson-')) {
      if (!lessonIds.has(ref))
        fail(rel, `cytowanie \`${ref}\` nie rozwiązuje się`);
    } else if (!ids.has(ref)) {
      fail(rel, `cytowanie \`${ref}\` nie rozwiązuje się do żadnego wymagania`);
    }
  }
}

// ── generowanie rejestru i unii ID ────────────────────────────────────────────

const AREA = (id) => id.split('-')[1];
const AREA_LABEL = {
  axis: 'axis',
  project: 'project',
  api: 'API',
  a11y: 'accessibility',
  token: 'tokens',
  quality: 'quality',
  release: 'release',
};

const STAN_ICON = {
  egzekwowane: '✅ enforced',
  częściowo: '🟡 partial',
  luka: '⛔ gap',
  BŁĄD: '❌ ERROR',
};

/**
 * Skrót do komórki tabeli. Linki markdown są spłaszczane do samego tekstu: ścieżki
 * względne pochodzą z `docs/requirements/*.md`, więc w `docs/registry.md` wskazywałyby
 * o katalog za wysoko — a obcięcie potrafiłoby dodatkowo urwać je w połowie.
 */
const short = (v, n = 90) => {
  const t = (v ?? '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

const buildRejestr = () => {
  const byArea = new Map();
  for (const r of requirements) {
    const a = AREA(r.id);
    if (!byArea.has(a)) byArea.set(a, []);
    byArea.get(a).push(r);
  }

  const counts = { egzekwowane: 0, częściowo: 0, luka: 0, BŁĄD: 0 };
  for (const r of requirements) counts[r.stan]++;

  const L = [];
  L.push('# Registry — promise → gate → control');
  L.push('');
  L.push('> **This file is generated.** Do not edit it by hand —');
  L.push(
    '> `node tools/check-docs.mjs --write`. The `check-docs` gate rejects drift.',
  );
  L.push('');
  L.push(
    'The state is **derived** from the contents of the `Gate` and `Control` fields, not typed in.',
  );
  L.push('There is no „built, just unverified" state — see');
  L.push('[README](README.md#fields-gate-and-control).');
  L.push('');
  L.push('| state | means | count |');
  L.push('| --- | --- | ---: |');
  L.push(
    `| ✅ enforced | gate and control exist and run in CI | ${counts.egzekwowane} |`,
  );
  L.push(
    `| 🟡 partial | the gate is there, the negative control is not (deliberately) | ${counts.częściowo} |`,
  );
  L.push(
    `| ⛔ gap | gate or control missing, with a recorded deadline | ${counts.luka} |`,
  );
  L.push(`| **total** | | **${requirements.length}** |`);
  L.push('');

  L.push('## Gaps by urgency');
  L.push('');
  L.push(
    'The order comes from the **Binds at** field, not from a requirement number.',
  );
  L.push('');
  L.push('| requirement | what is missing | binds at |');
  L.push('| --- | --- | --- |');
  const luki = requirements
    .filter((r) => r.stan === 'luka')
    .sort((a, b) => {
      const na = /immediately/i.test(a.fields['Binds at'] ?? '') ? 0 : 1;
      const nb = /immediately/i.test(b.fields['Binds at'] ?? '') ? 0 : 1;
      return na - nb || a.id.localeCompare(b.id);
    });
  for (const r of luki) {
    const brak =
      r.stanBramki === 'luka'
        ? short(
            (r.fields.Gate ?? '').replace(/^none\s*[—-]\s*gap\s*:\s*/, ''),
            70,
          )
        : short(
            (r.fields.Control ?? '').replace(/^none\s*[—-]\s*gap\s*:\s*/, ''),
            70,
          ) + ' _(control)_';
    L.push(
      `| [\`${r.id}\`](${link(r)}) | ${brak} | ${short(r.fields['Binds at'], 60)} |`,
    );
  }
  L.push('');

  for (const [area, reqs] of byArea) {
    L.push(`## ${AREA_LABEL[area] ?? area}`);
    L.push('');
    L.push('| requirement | state | gate | control |');
    L.push('| --- | --- | --- | --- |');
    for (const r of reqs)
      L.push(
        `| [\`${r.id}\`](${link(r)}) | ${STAN_ICON[r.stan]} | ${short(r.fields.Gate, 70)} | ${short(r.fields.Control, 70)} |`,
      );
    L.push('');
  }

  L.push('## Reverse index — lesson → requirements');
  L.push('');
  L.push(
    'Which lesson feeds which requirement. Generated from the **Lessons** fields.',
  );
  L.push('');
  // Pole `Lessons` niesie linki markdown, więc ten sam identyfikator pada w nim dwa razy
  // (etykieta i kotwica) — stąd Set na wymaganie, nie lista.
  const rev = new Map();
  for (const r of requirements) {
    const cited = new Set(
      [...(r.fields.Lessons ?? '').matchAll(/lesson-\d+/g)].map((m) => m[0]),
    );
    for (const l of cited) {
      if (!rev.has(l)) rev.set(l, []);
      rev.get(l).push(r.id);
    }
  }
  const revRows = [...lessonIds].sort(
    (a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]),
  );
  L.push('| lesson | requirements |');
  L.push('| --- | --- |');
  for (const l of revRows) {
    const who = rev.get(l);
    L.push(
      `| [\`${l}\`](lessons.md#${l}) | ${who ? who.map((i) => `\`${i}\``).join(', ') : '— _(not cited)_'} |`,
    );
  }
  L.push('');
  return L.join('\n');
};

function link(r) {
  const rel = r.file.replace(/^docs\//, '');
  return `${rel}#${r.id}`;
}

const buildReqIds = () => {
  const reqs = [...ids].sort();
  const lessons = [...lessonIds].sort(
    (a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]),
  );
  return [
    '// PLIK GENEROWANY — nie edytuj.',
    '// Źródło: docs/00-axis.md + docs/requirements/*.md + docs/lessons.md',
    '// Generator: node tools/check-docs.mjs --write',
    '//',
    '// Po co: karta sandboxa deklaruje, czego dotyczy przykład. Dopóki było to `string[]`,',
    '// literówka dawała chip prowadzący donikąd — czyli cichą wadę (`req-axis`). Ten sam ruch',
    '// co `PctCssVar` w `lesson-43`, tylko na drugiej klasie nazw.',
    '',
    '/** Identyfikator wymagania z `docs/requirements/` albo osi z `docs/00-axis.md`. */',
    'export type PctReqId =',
    ...reqs.map((id) => `  | '${id}'`),
    '  ;',
    '',
    '/** Identyfikator lekcji z `docs/lessons.md`. Karta może wskazywać dowód, nie tylko obietnicę. */',
    'export type PctLessonId =',
    ...lessons.map((id) => `  | '${id}'`),
    '  ;',
    '',
    '/** Cokolwiek, na co karta sandboxa może się powołać. */',
    'export type PctDocId = PctReqId | PctLessonId;',
    '',
  ].join('\n');
};

/**
 * Wyjście generatora przechodzi przez prettiera, bo `nx format:check` obejmuje `docs/`
 * i `apps/`. Bez tego dwie bramki chciałyby innego kształtu tego samego pliku: formatter
 * przepisywałby go po każdym `--write`, a kontrola świeżości (5) natychmiast zgłaszała
 * rozjazd. Wpisanie plików do `.prettierignore` byłoby obejściem — ukryłoby konflikt,
 * zamiast go usunąć.
 */
const prettier = await import('prettier');
const format = async (text, filepath) =>
  prettier.format(text, {
    ...(await prettier.resolveConfig(join(ROOT, filepath))),
    filepath,
  });

const rejestr = await format(buildRejestr(), REJESTR);
const reqIds = await format(buildReqIds(), REQ_IDS);

if (WRITE) {
  writeFileSync(join(ROOT, REJESTR), rejestr);
  writeFileSync(join(ROOT, REQ_IDS), reqIds);
  console.log(`v Zapisano ${REJESTR} i ${REQ_IDS}`);
} else {
  // ── 5. świeżość ─────────────────────────────────────────────────────────────
  for (const [rel, want] of [
    [REJESTR, rejestr],
    [REQ_IDS, reqIds],
  ]) {
    if (!existsSync(join(ROOT, rel)))
      fail(rel, 'plik nie istnieje — uruchom `--write`');
    else if (read(rel) !== want)
      fail(
        rel,
        'rozjazd ze źródłem — uruchom `node tools/check-docs.mjs --write`',
      );
  }
}

// ── 6. kontrola odniesienia ───────────────────────────────────────────────────

const FIXTURES = 'tools/check-docs.fixtures';

if (!WRITE) {
  const fixtures = globSync(`${FIXTURES}/*.md`, { cwd: ROOT })
    .filter((f) => basename(f) !== 'README.md')
    .sort();
  if (fixtures.length === 0) {
    fail(
      FIXTURES,
      'brak kontroli odniesienia — bramka bez dowodu, że potrafi nie przejść, ' +
        'jest kolejną cichą wadą (req-quality-negative-control)',
    );
  }
  for (const fx of fixtures) {
    const reqs = parseRequirements(read(fx), fx);
    if (reqs.length === 0) {
      fail(fx, 'fixture nie zawiera wymagania — nie ma czego odrzucić');
      continue;
    }
    const before = problems.length;
    for (const req of reqs) {
      if (!req.fields.Promise?.trim()) fail(fx, 'x');
      if (req.fields.Gate === undefined) fail(fx, 'x');
      if (req.fields.Control === undefined) fail(fx, 'x');
      const b = classify(req.fields.Gate, { id: fx }, 'Gate');
      const k = classify(req.fields.Control, { id: fx }, 'Control');
      if (b === 'luka' && !req.fields['Binds at']?.trim()) fail(fx, 'x');
      for (const fieldName of ['Gate', 'Control']) {
        const value = req.fields[fieldName] ?? '';
        if (/^\s*(none|not applicable)\b/.test(value)) continue;
        for (const [, raw] of value.matchAll(PATHISH)) {
          const hits = resolveCitation(raw);
          if (hits !== null && hits.length === 0) fail(fx, 'x');
        }
      }
      void k;
    }
    const rejected = problems.length > before;
    problems.length = before; // błędy fixture'a są OCZEKIWANE — nie liczą się do wyniku
    if (!rejected)
      fail(
        fx,
        'kontrola odniesienia PRZESZŁA, a miała nie przejść — bramka stopped examining anything',
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Documentation gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

const counts = requirements.reduce(
  (a, r) => ((a[r.stan] = (a[r.stan] ?? 0) + 1), a),
  {},
);
console.log(
  `v Bramka dokumentacji: ${requirements.length} wymagań, ${lessonIds.size} lekcji — ` +
    `egzekwowane ${counts.egzekwowane ?? 0}, częściowo ${counts.częściowo ?? 0}, luka ${counts.luka ?? 0}`,
);
