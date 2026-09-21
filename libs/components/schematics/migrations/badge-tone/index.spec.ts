import { vi } from 'vitest';
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { badgeTone } from './index';

/**
 * The migration runs on repositories nobody here can see, and no gate in this workspace
 * executes it: `check-package` asks whether the factory file exists, not whether it does the
 * right thing. So these cases are the instrument — and since 2026-09-21 the instrument is
 * measured, because a spec nothing measures is a spec whose gaps nobody can see. Stryker
 * mutates the file beside this one (`stryker.config.json`, `// mutate`); what a case here
 * is worth is the mutant it kills, and the way to find that out is to plant the mutant and
 * watch the case turn red.
 *
 * They are in two halves, and the halves are the design. What a `.html` file gets is a
 * rewrite; what a `.ts` file gets is a report and not one byte of change. The second half is
 * the one with history: five versions of this migration read TypeScript and five deleted a
 * consumer's code, so the cases below hold every input that ever did it and assert the file
 * comes back identical.
 */

/** Everything the rule touches on a `Tree`, and nothing else. A `Uint8Array` is the file */
/** `readText` refuses, which is how the decoding case is written. */
const drive = async (files: Record<string, string | Uint8Array>) => {
  const store = new Map<string, string | Uint8Array>(Object.entries(files));
  const logs: { level: 'info' | 'warn'; message: string }[] = [];
  const tree = {
    visit: (visitor: (path: string) => void) =>
      [...store.keys()].forEach((path) => visitor(path)),
    readText: (path: string) => {
      const held = store.get(path);
      if (typeof held !== 'string')
        throw new Error(`Failed to decode "${path}" as UTF-8 text.`);
      return held;
    },
    overwrite: (path: string, text: string) => store.set(path, text),
  } as unknown as Tree;
  const context = {
    logger: {
      info: (message: string) => logs.push({ level: 'info', message }),
      warn: (message: string) => logs.push({ level: 'warn', message }),
    },
  } as unknown as SchematicContext;

  await (
    badgeTone() as Rule & ((t: Tree, c: SchematicContext) => Promise<void>)
  )(tree, context);
  return { files: Object.fromEntries(store), logs };
};

/** One file in, the same path out. */
const rewrite = async (source: string, path = '/src/a.html'): Promise<string> =>
  (await drive({ [path]: source })).files[path] as string;

const warnings = (run: Awaited<ReturnType<typeof drive>>): string[] =>
  run.logs.filter((l) => l.level === 'warn').map((l) => l.message);

describe('badge-tone migration — what it rewrites in a template', () => {
  it.each([
    ['a static attribute', '<pct-badge tone="neutral">D</pct-badge>'],
    ['single quotes', "<pct-badge tone='neutral'>D</pct-badge>"],
    ['a binding on the literal', `<pct-badge [tone]="'neutral'">D</pct-badge>`],
    ['a binding with padding', `<pct-badge [tone]=" 'neutral' ">D</pct-badge>`],
    ['the `bind-` spelling', `<pct-badge bind-tone="'neutral'">D</pct-badge>`],
    ['spaces around the equals', '<pct-badge tone = "neutral">D</pct-badge>'],
  ])('removes %s', async (_label, source) => {
    expect(await rewrite(source)).toBe('<pct-badge>D</pct-badge>');
  });

  it('leaves every other attribute where it stood, and the tag`s own spacing', async () => {
    expect(
      await rewrite('<pct-badge tone="neutral" class="x">D</pct-badge>'),
    ).toBe('<pct-badge class="x">D</pct-badge>');
    expect(
      await rewrite('<pct-badge class="x" tone="neutral">D</pct-badge>'),
    ).toBe('<pct-badge class="x">D</pct-badge>');
    expect(
      await rewrite(
        '<pct-badge\n  tone="neutral"\n  class="x"\n>D</pct-badge>',
      ),
    ).toBe('<pct-badge\n  class="x"\n>D</pct-badge>');
  });

  it('leaves the i18n descriptor of a DIFFERENT attribute where it stands', async () => {
    // `i18n-tone` and `i18n-tone.<meaning>` describe the attribute that is going. Anything
    // else beginning with those letters describes another one: `i18n-tone-hint` belongs to
    // `tone-hint`, which survives this release, and taking it orphans a working attribute —
    // the same error one scope over from the one the case above prevents.
    expect(
      await rewrite(
        '<pct-badge tone="neutral" i18n-tone-hint="m" tone-hint="h">D</pct-badge>',
      ),
    ).toBe('<pct-badge i18n-tone-hint="m" tone-hint="h">D</pct-badge>');
  });

  it.each([
    [
      'plural',
      '{n, plural, =1 {<pct-badge tone="neutral">one</pct-badge>} other {many}}',
    ],
    ['select', '{g, select, other {<pct-badge tone="neutral">z</pct-badge>}}'],
  ])(
    'leaves a badge inside an ICU %s alone, because it is not the component there',
    async (_label, source) => {
      // The HTML parser calls this markup, and it is not the component. Measured through the
      // caller: `findMatchingDirectivesAndPipes` returns nothing for a badge inside an
      // expansion and the component for the same element outside one. In the template AST
      // the tag survives only as an i18n placeholder holding the raw string, which the
      // runtime puts into the DOM as a plain element — so no input was ever bound and there
      // is no tone to take off. An earlier version of this case asserted the rewrite.
      const run = await drive({ '/src/i.html': source });
      expect(run.files['/src/i.html']).toBe(source);
      // Named, though, because a badge wearing a word that is about to stop meaning anything
      // is worth one look even when nothing bound it.
      expect(warnings(run).join('')).toContain('were not');
    },
  );

  it.each([
    [
      'directly inside it',
      '<div ngNonBindable><pct-badge tone="neutral">x</pct-badge></div>',
    ],
    [
      'two levels down',
      '<div ngNonBindable><span><pct-badge tone="neutral">x</pct-badge></span></div>',
    ],
    [
      'wearing the binding spelling',
      `<div ngNonBindable><pct-badge bind-tone="'neutral'">x</pct-badge></div>`,
    ],
  ])('leaves a badge %s an ngNonBindable alone', async (_label, source) => {
    // Angular emits `disableBindings()` around the subtree, so no component is instantiated
    // and the attribute stays in the DOM exactly as written. Measured by RENDERING with a
    // component whose template is `[BOUND]`: the marker appears for a plain badge and not for
    // this one, while `tone="neutral"` is there in the output either way. Nothing earlier in
    // the compiler can be asked — `findMatchingDirectivesAndPipes` reports the component here
    // too, which is the blind spot `lesson-238` names in its own guard.
    expect(await rewrite(source)).toBe(source);
  });

  it.each([
    [
      'an ng-template holding it',
      '<ng-template ngNonBindable><pct-badge tone="neutral">x</pct-badge></ng-template>',
      '<ng-template ngNonBindable><pct-badge>x</pct-badge></ng-template>',
    ],
    [
      'an ng-container, which does disable',
      '<ng-container ngNonBindable><pct-badge tone="neutral">x</pct-badge></ng-container>',
      '<ng-container ngNonBindable><pct-badge tone="neutral">x</pct-badge></ng-container>',
    ],
  ])('reads %s the way rendering does', async (_label, source, want) => {
    // `ngNonBindable` is applied while Angular visits an ELEMENT, and a literal
    // `<ng-template>` is not one — so the attribute is inert there and the badge inside IS
    // the component, where inside an `<ng-container>` it is not. Measured by rendering both:
    // the marker appears in the first and not in the second. The first version of this rule
    // was measured on `<div>` alone and generalised, which is `lesson-238` again.
    expect(await rewrite(source)).toBe(want);
  });

  it('still removes the tone where the ngNonBindable does not reach', async () => {
    // Two edges of the same rule, and both were measured by rendering. `ngNonBindable` on the
    // badge ITSELF silences its content and leaves the badge bound, so that one is the
    // component and its tone comes off; and a sibling outside the subtree was never affected.
    expect(
      await rewrite('<pct-badge ngNonBindable tone="neutral">x</pct-badge>'),
    ).toBe('<pct-badge ngNonBindable>x</pct-badge>');
    expect(
      await rewrite(
        '<div ngNonBindable><pct-badge tone="neutral">a</pct-badge></div><pct-badge tone="neutral">b</pct-badge>',
      ),
    ).toBe(
      '<div ngNonBindable><pct-badge tone="neutral">a</pct-badge></div><pct-badge>b</pct-badge>',
    );
  });

  it('reads a colon that is not a namespace as part of the name', async () => {
    // `<pct-:q:badge>` parses with no error and no prefix — the prefix scan stops at the `-`,
    // so the name is `pct-:q:badge` whole — and Angular matches nothing against it. A pattern
    // that took `:q:` out of the middle would call this the component and cut a consumer's
    // attribute off somebody else's element.
    const source = '<pct-:q:badge tone="neutral">x</pct-:q:badge>';
    expect(await rewrite(source)).toBe(source);
  });

  it('takes the i18n descriptor of the attribute it removes', async () => {
    // Left behind, it describes an attribute that no longer exists — a template error the
    // consumer would get to debug on our behalf.
    expect(
      await rewrite('<pct-badge i18n-tone tone="neutral">D</pct-badge>'),
    ).toBe('<pct-badge>D</pct-badge>');
  });

  it('reads a self-closing tag, an unquoted value, and a second badge on the line', async () => {
    expect(await rewrite('<pct-badge tone="neutral" />')).toBe('<pct-badge />');
    // Angular reads `tone=neutral/` in a self-closing tag as `tone="neutral"`.
    expect(await rewrite('<pct-badge tone=neutral/>')).toBe('<pct-badge/>');
    expect(
      await rewrite(
        '<pct-badge tone="neutral">a</pct-badge><pct-badge tone="neutral">b</pct-badge>',
      ),
    ).toBe('<pct-badge>a</pct-badge><pct-badge>b</pct-badge>');
  });

  it.each([
    ['an output binding', '(click)="f()"'],
    ['an input binding', '[id]="i"'],
    ['a structural directive', '*ngIf="x"'],
    ['a reference', '#ref'],
    ['a plain attribute', 'class="x"'],
  ])(
    'keeps the separator when %s follows the tone with nothing between',
    async (_label, next) => {
      // Angular needs no whitespace after a quoted value, so this is two attributes. Taking
      // the space before the tone welds the tag name to the next one: the template stops
      // compiling, and it does so SILENTLY, because the rewrite carries away the word the
      // backstop looks for. The scan this replaced did exactly that — measured, 335 of 2899
      // clean templates came out broken — and the parser is what makes the boundary exact.
      expect(
        await rewrite(`<pct-badge tone="neutral"${next}>D</pct-badge>`),
      ).toBe(`<pct-badge ${next}>D</pct-badge>`);
    },
  );

  it('removes a tone written with a character entity', async () => {
    // `&#110;` is `n`. The parser decodes a value before this reads it, so the attribute is
    // `tone="neutral"` whatever the file spells. The scan this replaced compared raw text,
    // missed it, and — because the raw text holds no `neutral` — said "nothing to migrate":
    // the one miss it had that the backstop could not name.
    expect(await rewrite('<pct-badge tone="&#110;eutral">D</pct-badge>')).toBe(
      '<pct-badge>D</pct-badge>',
    );
  });

  it('leaves a tone written inside a comment in the tag alone', async () => {
    // Angular's tag reader consumes `/* … */` between attributes, so the tone in here is not
    // an attribute at all — it is a developer who commented it out. Rewriting it deletes text
    // from inside their comment, which the scan this replaced did.
    const source = '<pct-badge /* tone="neutral" */ class="x">D</pct-badge>';
    expect(await rewrite(source)).toBe(source);
  });

  it('reads a `.htm` file as a template too', async () => {
    expect(
      await rewrite('<pct-badge tone="neutral">D</pct-badge>', '/src/d.htm'),
    ).toBe('<pct-badge>D</pct-badge>');
  });

  it.each([
    [
      'a structural directive',
      '<pct-badge *ngIf="count > 0" tone="neutral">x</pct-badge>',
      '<pct-badge *ngIf="count > 0">x</pct-badge>',
    ],
    [
      'a binding',
      '<pct-badge [class.big]="n > 3" tone="neutral">x</pct-badge>',
      '<pct-badge [class.big]="n > 3">x</pct-badge>',
    ],
    [
      'a plain value',
      '<pct-badge aria-label="a > b" tone="neutral">x</pct-badge>',
      '<pct-badge aria-label="a > b">x</pct-badge>',
    ],
  ])('finds the tone past a `>` inside %s', async (_label, source, want) => {
    // An early cut ended the tag at the first `>`, never saw the attribute, and reported
    // nothing: a confident false negative, which is the failure mode that costs most.
    expect(await rewrite(source)).toBe(want);
  });
});

describe('badge-tone migration — what it must not touch in a template', () => {
  it.each([
    ['a tone that survives', '<pct-badge tone="danger">D</pct-badge>'],
    ['a bound expression', '<pct-badge [tone]="row.tone">D</pct-badge>'],
    ['a badge with no tone', '<pct-badge>D</pct-badge>'],
    ['another element', '<other tone="neutral">x</other>'],
    [
      'a longer tag name',
      '<pct-badge-group tone="neutral">x</pct-badge-group>',
    ],
    [
      'an attribute that merely starts with the name',
      '<pct-badge tone-hint="neutral">x</pct-badge>',
    ],
    [
      'the word inside another value',
      `<pct-badge title="a tone='neutral' b">x</pct-badge>`,
    ],
    [
      'a badge inside another tag`s value',
      `<div title="<pct-badge tone='neutral'>">x</div>`,
    ],
    ['an HTML comment', '<!-- <pct-badge tone="neutral">x</pct-badge> -->'],
    // Angular matches selectors and input names case-sensitively, so neither ever bound.
    [
      'an uppercase spelling that never bound',
      '<PCT-BADGE TONE="neutral">x</PCT-BADGE>',
    ],
  ])('leaves %s exactly as it was', async (_label, source) => {
    expect(await rewrite(source)).toBe(source);
  });
});

describe('badge-tone migration — TypeScript is read and never written', () => {
  // Every input below deleted a consumer's code in some version of this migration. They are
  // kept verbatim: each one is a version that was sure of itself.
  it.each([
    [
      'a `template:` in a JSDoc, reaching a field through an arrow`s `>`',
      [
        '/** Accepts a `template:` string. */',
        'export class Widget {',
        '  /** Wraps <pct-badge and counts. */',
        "  protected tone = 'neutral';",
        '  readonly big = (n: number) => n > 3;',
        '}',
        'const t = `x`;',
        '',
      ].join('\n'),
    ],
    [
      'a brace inside a string inside an interpolation',
      [
        '@Component({',
        "  template: `<code>${ show ? '{' : '' }{{ name }}</code>`,",
        '})',
        'export class C {',
        '  /** Falls back to <pct-badge with no tone at all. */',
        "  protected tone = 'neutral';",
        '  readonly isLarge = (n: number) => n > 3;',
        '  private id = `t`;',
        '}',
        '',
      ].join('\n'),
    ],
    [
      'a division after `--` read as a regular expression',
      [
        'const cfg = { template: `${n-- / 2}${`${a}/${b}`}` };',
        '/** <pct-badge */',
        "const { tone = 'neutral' } = props;",
        'const wide = n > 3;',
        'const id = `card`;',
        '',
      ].join('\n'),
    ],
    [
      'a regex literal holding a backtick',
      [
        'const r = /template:`/;',
        'class W {',
        '  /** see <pct-badge */',
        "  protected tone = 'neutral';",
        '  readonly big = (n: number) => n > 3;',
        '}',
        'const later = `tail`;',
        '',
      ].join('\n'),
    ],
  ])('does not touch a byte of %s', async (_label, source) => {
    expect(await rewrite(source, '/src/w.ts')).toBe(source);
  });

  it('does not rewrite even a plain, unambiguous inline template', async () => {
    // The line this design draws. Rewriting this one is easy; knowing it is this one and not
    // the four above means parsing TypeScript, and that is the thing that keeps going wrong.
    const source =
      '@Component({ template: `<pct-badge tone="neutral">D</pct-badge>` })';
    expect(await rewrite(source, '/src/c.ts')).toBe(source);
  });

  it('reports the line instead, with its number', async () => {
    const run = await drive({
      '/src/c.ts': [
        '@Component({',
        '  template: `<pct-badge tone="neutral">D</pct-badge>`,',
        '})',
        '',
      ].join('\n'),
    });
    expect(warnings(run).join('')).toContain('src/c.ts:2');
  });

  it('reports a surviving PctBadgeTone with its line', async () => {
    const run = await drive({
      '/src/t.ts':
        'x\nimport { PctBadgeTone } from "@pacit/components/badge";\n',
    });
    const said = warnings(run).join('');
    expect(said).toContain('PctBadgeTone');
    expect(said).toContain('src/t.ts:2');
  });

  it('reports a source file that names a badge and the word with no line to point at', async () => {
    // The line report wants the element and the attribute together, so a tag spread over
    // lines matches no line at all — and the file is named whole rather than passed over.
    // This case earns its place only since that narrowing: before it, line 2 matched on the
    // attribute alone and the case passed off the wrong warning while claiming this one.
    const run = await drive({
      '/src/s.ts':
        '@Component({ template: `<pct-badge\n  tone="neutral"\n>D</pct-badge>` })',
    });
    expect(warnings(run).join('')).toContain('src/s.ts');
  });
});

describe('badge-tone migration — with no parser to call', () => {
  /**
   * The safety rule of the whole design, and the only case here that has to reach past the
   * module boundary to test it: `@angular/compiler` is an OPTIONAL peer, so a workspace may
   * not have it, and what happens then decides whether this migration can be trusted at all.
   * The answer must be: write nowhere, name everything worth a look. `vi.doMock` is what makes
   * the dynamic `import()` fail on purpose — without it the three lines that answer for this
   * are the only ones in the file no test reaches, which the mutation run says out loud.
   */
  const driveWithoutCompiler = async (
    files: Record<string, string>,
  ): Promise<{ files: Record<string, string>; logs: string[] }> => {
    vi.resetModules();
    vi.doMock('@angular/compiler', () => {
      throw new Error("Cannot find module '@angular/compiler'");
    });
    const { badgeTone: withoutCompiler } = await import('./index');
    const store = new Map(Object.entries(files));
    const logs: string[] = [];
    const tree = {
      visit: (visitor: (path: string) => void) =>
        [...store.keys()].forEach((path) => visitor(path)),
      readText: (path: string) => store.get(path) as string,
      overwrite: (path: string, text: string) => store.set(path, text),
    } as unknown as Tree;
    const context = {
      logger: {
        info: (message: string) => logs.push(message),
        warn: (message: string) => logs.push(message),
      },
    } as unknown as SchematicContext;
    await (
      withoutCompiler() as Rule &
        ((t: Tree, c: SchematicContext) => Promise<void>)
    )(tree, context);
    vi.doUnmock('@angular/compiler');
    vi.resetModules();
    return { files: Object.fromEntries(store) as Record<string, string>, logs };
  };

  it('writes nothing and names the file that wears a tone', async () => {
    const held = '<pct-badge tone="neutral">D</pct-badge>';
    const run = await driveWithoutCompiler({ '/src/a.html': held });
    expect(run.files['/src/a.html']).toBe(held);
    expect(run.logs.join('')).toContain('were not');
    expect(run.logs.join('')).not.toContain('removed from');
  });

  it('still says "nothing to migrate" about a template with no tone in it', async () => {
    // The fallback names what LOOKS like it holds one and not every template in the
    // workspace — otherwise the absence of the compiler would print a consumer's whole
    // `src/` under a sentence saying each file is worth a look.
    const run = await driveWithoutCompiler({
      '/src/d.html': '<p>nothing here</p>',
    });
    expect(run.logs).toHaveLength(1);
    expect(run.logs[0]).toContain('nothing to migrate');
  });

  it('still reports the TypeScript lines, which never needed a parser', async () => {
    const run = await driveWithoutCompiler({
      '/src/n.ts': 'import { PctBadgeTone } from "@pacit/components/badge";',
    });
    expect(run.logs.join('')).toContain('want your hands');
  });
});

describe('badge-tone migration — what it does when it cannot be certain', () => {
  it('reports a template the parser rejects and writes nothing in it', async () => {
    // An error from the parser means the file does not compile as it stands, so there is
    // nothing to be certain about and the answer is a line for the consumer rather than an
    // edit. The scan this replaced had its own idea of what it could not read, which is how
    // it came to read things Angular does not.
    const source = '<pct-badge tone="neutral">D</pct-badge></div>';
    const run = await drive({ '/src/broken.html': source });
    expect(run.files['/src/broken.html']).toBe(source);
    expect(warnings(run).join('')).toContain('were not');
    // And it is not counted among the files that WERE rewritten. A run that reports a file
    // it did not touch is a run whose numbers cannot be read, and the consumer's one clue
    // that something needs a look is the warning the line above asks for.
    expect(run.logs.map((l) => l.message).join('')).not.toContain(
      'removed from',
    );
  });

  it.each([
    ['a tag with no end', '<pct-badge tone="neutral"'],
    [
      'an unterminated comment',
      '<!-- oops\n<pct-badge tone="neutral">d</pct-badge>',
    ],
    ['a close tag that opens nothing', '</pct-badge>'],
  ])('reports %s rather than editing around it', async (_label, source) => {
    const run = await drive({ '/src/b.html': source });
    expect(run.files['/src/b.html']).toBe(source);
    expect(warnings(run)).toHaveLength(1);
  });
});

describe('badge-tone migration — what it says', () => {
  it('skips a file it cannot decode instead of ending the run', async () => {
    // `readText` decodes as UTF-8 and throws on anything else, and `.ts` is also the
    // extension of an MPEG transport stream. One asset under `public/` would otherwise end
    // the migration with a decoding error the consumer cannot act on.
    const run = await drive({
      '/src/seg.ts': new Uint8Array([0x47, 0x40, 0x11, 0x10, 0xff]),
    });
    expect(warnings(run)).toHaveLength(0);
    expect(run.logs[0].message).toContain('nothing to migrate');
  });

  it.each([
    ['a tag with no end', '<pct-badge tone="neutral"'],
    [
      'an unterminated comment',
      '<!-- oops\n<pct-badge tone="neutral">d</pct-badge>',
    ],
  ])('reports %s rather than passing over it', async (_label, source) => {
    const run = await drive({ '/src/b.html': source });
    expect(run.files['/src/b.html']).toBe(source);
    expect(warnings(run).join('')).toContain('were not');
  });

  it('reports a template it could not read even when no tone is in the file', async () => {
    // The one case where only the parser's verdict can carry the warning: nothing here says
    // "neutral", so the backstop has nothing to see and the read is the report itself.
    const run = await drive({
      '/src/u.html': '<!-- oops\n<pct-badge tone="danger">d</pct-badge>',
    });
    expect(warnings(run)).toHaveLength(1);
  });

  it('reports a template it HALF rewrote, with nothing else wrong with it', async () => {
    // The backstop's first cut asked whether the file was UNTOUCHED and might hold a tone,
    // which exempted every file where something had been rewritten — a miss beside a hit was
    // reported by nothing. The badge in the `title` here is text and correctly left alone.
    const run = await drive({
      '/src/e.html': [
        '<pct-badge tone="neutral">a</pct-badge>',
        `<div title="<pct-badge tone='neutral'>">b</div>`,
      ].join('\n'),
    });
    expect(run.files['/src/e.html']).toContain('<pct-badge>a</pct-badge>');
    expect(warnings(run).join('')).toContain('were not');
  });

  it('names a file it DID rewrite when the word survives as text', async () => {
    // The backstop asks its question of the RESULT and asks it of the text, so a badge whose
    // own content is the word comes back rewritten AND named. That overlap is deliberate and
    // it is the cheap half of the arrangement: the exact question is answered by the parser,
    // which has already said this file holds no badge wearing a tone, while the text question
    // costs a consumer one look and catches the shapes nobody thought of. The warning says as
    // much in its own first clause — "that may be nothing, the word in a sentence".
    const run = await drive({
      '/src/a.html': '<pct-badge tone="neutral">neutral</pct-badge>',
    });
    expect(run.files['/src/a.html']).toBe('<pct-badge>neutral</pct-badge>');
    const said = run.logs.map((l) => l.message).join('');
    expect(said).toContain('removed from 1 template file(s)');
    expect(said).toContain('were not');
  });

  it('is quiet about a template whose badges it fully rewrote', async () => {
    const run = await drive({
      '/src/f.html': '<pct-badge tone="neutral">a</pct-badge>',
    });
    expect(warnings(run)).toHaveLength(0);
  });

  it('says nothing at all about a TypeScript file that names neither', async () => {
    // The backstop guards the `.ts` branch too, and without it EVERY readable TypeScript
    // file in a workspace is named in that warning — a consumer's whole `src/` printed
    // under a sentence saying each FILE is worth one look, which is the same as printing
    // nothing. Only the quiet path can see the guard, and the guard is a conjunction: every
    // other source case here carries the tag and the word, or else the deleted type, and a
    // file carrying none of the three is the file the guard is for.
    const run = await drive({ '/src/x.ts': 'export const a = 1;' });
    expect(warnings(run)).toHaveLength(0);
    expect(run.logs).toHaveLength(1);
    expect(run.logs[0].message).toContain('nothing to migrate');
  });

  it('says so once when there is nothing to do', async () => {
    const run = await drive({ '/src/d.html': '<p>nothing here</p>' });
    expect(run.logs).toHaveLength(1);
    expect(run.logs[0].message).toContain('nothing to migrate');
  });

  it('changes nothing on a second run over its own output', async () => {
    const once = await drive({
      '/src/a.html': '<pct-badge tone="neutral" class="x">D</pct-badge>',
    });
    const twice = await drive(once.files);
    expect(twice.files['/src/a.html']).toBe(once.files['/src/a.html']);
    expect(twice.logs.some((l) => l.message.includes('removed from'))).toBe(
      false,
    );
  });
});

describe('badge-tone migration — the report is per file, and reads what the rewrite reads', () => {
  it('names a source file whose attribute no single line carries — after another file reported', async () => {
    // The fallback used to be guarded by an accumulator over EVERY file seen so far, so the
    // first source naming `PctBadgeTone` switched it off for the rest of the walk. This
    // migration exists because that type was deleted, so nearly every consumer has such a
    // file, and the whole reporting side went quiet after it.
    const run = await drive({
      '/src/a.ts': 'import { PctBadgeTone } from "@pacit/components/badge";',
      '/src/b.ts':
        '@Component({ template: `<pct-badge tone=\n"neutral">D</pct-badge>` })',
    });
    const said = warnings(run).join('');
    expect(said).toContain('src/a.ts');
    expect(said).toContain('src/b.ts');
  });

  it.each([
    ['a static attribute', 'tone="neutral"'],
    ['single quotes', "tone='neutral'"],
    ['no quotes at all', 'tone=neutral'],
    ['a binding on the literal', `[tone]="'neutral'"`],
    ['the bind- spelling', `bind-tone="'neutral'"`],
  ])('reports %s in TypeScript', async (_label, spelling) => {
    const run = await drive({
      '/src/s.ts': `const t = \`<pct-badge ${spelling}>D</pct-badge>\`;`,
    });
    expect(warnings(run).join('')).toContain('src/s.ts:1');
  });

  it.each([
    [
      'an i18n descriptor, which names the attribute and is not it',
      'i18n-tone="neutral"',
    ],
    ['a binding to a property that still works', '[tone]="neutral"'],
    ['a tone that survives', 'tone="danger"'],
  ])('does not call %s something to fix by hand', async (_label, spelling) => {
    // Over-reporting is the safe direction, but advice that is wrong is not advice: the
    // template path leaves all three alone, so the report must agree with it.
    const run = await drive({
      '/src/s.ts': `const t = \`<pct-badge ${spelling}>D</pct-badge>\`;`,
    });
    expect(warnings(run).join('')).not.toContain('want your hands');
  });

  it('reads a `.tsx` source and an upper-case `.HTML` template', async () => {
    const run = await drive({
      '/src/x.tsx': 'import { PctBadgeTone } from "@pacit/components/badge";',
      '/src/u.HTML': '<pct-badge tone="neutral">D</pct-badge>',
    });
    expect(warnings(run).join('')).toContain('src/x.tsx');
    expect(run.files['/src/u.HTML']).toBe('<pct-badge>D</pct-badge>');
  });

  it('does not rewrite a backup left beside a template', async () => {
    // The same anchor one file-type over, and the dangerous one: `.ts.bak` costs a line of
    // advice, `.html.bak` costs the file. Without the `$` on the template pattern this
    // OVERWRITES a copy the consumer made by hand, and the run reports it as migrated.
    const held = '<pct-badge tone="neutral">D</pct-badge>';
    const run = await drive({ '/src/a.html.bak': held });
    expect(run.files['/src/a.html.bak']).toBe(held);
    expect(run.logs[0].message).toContain('nothing to migrate');
  });

  it.each([
    ['a backup left beside a source', '/src/badge.ts.bak'],
    ['a file with no extension at all', '/CREDITS'],
  ])('passes over %s, which is not TypeScript', async (_label, path) => {
    // The two anchors of the pattern, and each is the whole of what it does. Without the
    // `$` a merge leftover is read as a source; without the leading `.` any name whose last
    // two letters are those is one, and an extensionless `CREDITS` is a file that happens. Neither
    // could corrupt anything — this reads `.ts` and never writes it — but both put a file in
    // front of a consumer that has nothing to do with this release, and advice that is wrong
    // is read once and then the rest of the list is not. The content is a source line on
    // purpose: it is what the file would be reported FOR, were the pattern to reach it.
    const run = await drive({ [path]: 'const t: PctBadgeTone = "neutral";' });
    expect(warnings(run)).toHaveLength(0);
    expect(run.logs[0].message).toContain('nothing to migrate');
  });

  it('never opens anything under node_modules or dist', async () => {
    const held = '<pct-badge tone="neutral">D</pct-badge>';
    const run = await drive({
      '/node_modules/p/x.html': held,
      '/dist/y.html': held,
    });
    expect(run.files['/node_modules/p/x.html']).toBe(held);
    expect(run.files['/dist/y.html']).toBe(held);
    expect(run.logs[0].message).toContain('nothing to migrate');
  });
});

/**
 * The cases from here to the end of this block pin a DELEGATION, and it is worth saying what
 * that costs. Every one of them was a defect first: the migration read `.html` with a scan of
 * its own until 2026-09-21, and five reviews found seven ways that scan wrote where Angular
 * would not. The scan is gone and `HtmlParser` answers nearly all of it, so most of these
 * cases now assert the PARSER rather than anything this file decides.
 *
 * How much is "most" — carefully, because the obvious number is one the report cannot give.
 * Stryker records one killer per mutant and stops at the first failing test, so `killedBy`
 * cannot say which case kills NOTHING; what it can say is which ever appears as a killer.
 * Measured from the committed report: 41 distinct tests are recorded as killing a mutant of
 * this file, out of the 1425 the run executes, and a few of those 41 are in these two blocks.
 * Reading further would need a run per case, and this has not done one.
 *
 * They stay because the mutant they guard against is not one Stryker throws. It is a person
 * putting a reader back in front of the parser, and every one of these inputs is the shape
 * that caught the last seven. A fence is not measured by what it stops today (`lesson-236`).
 */
describe('badge-tone migration — text that is not markup', () => {
  it.each(['textarea', 'script', 'style', 'title'])(
    'leaves a badge written inside <%s> alone',
    async (element) => {
      // HTML reads these as text, and so does Angular. A badge in there is a sample the
      // consumer typed out, and rewriting it edits their prose.
      const source = `<${element}><pct-badge tone="neutral">D</pct-badge></${element}>`;
      expect(await rewrite(source)).toBe(source);
    },
  );

  it('leaves an upper-case spelling of the element alone', async () => {
    // Angular matches selectors case-sensitively, so `<PCT-BADGE>` never bound the input.
    const source = '<PCT-BADGE tone="neutral">x</PCT-BADGE>';
    expect(await rewrite(source)).toBe(source);
  });

  it('reports a badge tag that runs into the next one instead of cutting it', async () => {
    // A tag with no `>` of its own. The parser calls the file an error, so nothing is
    // written and the line is a report — which is also what a consumer wants to hear about a
    // template that does not compile.
    const source = '<pct-badge tone="neutral"\n<div>x</div>';
    const run = await drive({ '/src/b.html': source });
    expect(run.files['/src/b.html']).toBe(source);
    expect(warnings(run).join('')).toContain('were not');
  });

  it('reports a badge tag that the file ends on', async () => {
    // `<pct-badge` and nothing after it. The parser calls that `Opening tag "pct-badge" not
    // terminated.`, which is an error, which is a file this writes nothing in and names — a
    // truncated template is exactly what a consumer wants to be told about.
    const run = await drive({ '/src/t.html': '<pct-badge' });
    expect(warnings(run)).toHaveLength(1);
  });

  it('reports an unterminated badge tag even when no tone is in the file', async () => {
    // The isolating case for the parser's own verdict: nothing here says "neutral", so the
    // backstop has nothing to see and the report can only come from the read failing.
    const run = await drive({ '/src/u.html': '<pct-badge tone="danger"' });
    expect(warnings(run)).toHaveLength(1);
  });
});

describe('badge-tone migration — raw text, at the edges that were defects', () => {
  it.each(['script', 'style', 'textarea', 'title'])(
    'runs an unclosed <%s> to the end rather than reading its content',
    async (element) => {
      // An unclosed raw-text element: its content is text to the last byte of the file, and
      // a reader that continued past it would edit the sample the consumer typed out.
      const source = `<${element}>x<pct-badge tone="neutral">D`;
      expect(await rewrite(source)).toBe(source);
    },
  );

  it('honours a closing tag spelled in another case, and goes on after it', async () => {
    // The badge AFTER the close is what makes this a reading: a reader that cannot find the
    // close leaves the sample alone for the wrong reason and takes every real badge below it
    // down as well.
    expect(
      await rewrite(
        `<script>var a = "<pct-badge tone='neutral'>";</ScRiPt><pct-badge tone="neutral">D</pct-badge>`,
      ),
    ).toBe(
      `<script>var a = "<pct-badge tone='neutral'>";</ScRiPt><pct-badge>D</pct-badge>`,
    );
  });

  it.each([
    ['a space after the slash', '</ script>'],
    ['a space before the `>`', '</script >'],
    ['a space on both sides of the name', '</ script >'],
  ])(
    'resumes on %s, which closes the element for Angular',
    async (_label, close) => {
      // Angular's close is `</`, spaces, the name, spaces, `>`. A hand-written pattern refused
      // the first of these spellings, so every badge below the element went unrewritten.
      expect(
        await rewrite(
          `<script>a${close}<pct-badge tone="neutral">D</pct-badge>`,
        ),
      ).toBe(`<script>a${close}<pct-badge>D</pct-badge>`);
    },
  );

  it.each([
    ['a trailing slash', '</script/>'],
    ['an attribute after the name', '</script foo>'],
  ])('does not resume on %s, which closes nothing', async (_label, close) => {
    // The other edge, and the dangerous one: Angular reads neither as a close, so the
    // element swallows the rest of the template and the file does not compile. A pattern that
    // treated them as closes put the consumer's own script text back in front of the rewrite.
    const source = `<script>a${close}<pct-badge tone="neutral">D</pct-badge>`;
    const run = await drive({ '/src/r.html': source });
    expect(run.files['/src/r.html']).toBe(source);
    expect(warnings(run).join('')).toContain('were not');
  });

  it('skips the element whatever case its own name is written in, and goes on after it', async () => {
    expect(
      await rewrite(
        '<SCRIPT><pct-badge tone="neutral">x</SCRIPT><pct-badge tone="neutral">D</pct-badge>',
      ),
    ).toBe(
      '<SCRIPT><pct-badge tone="neutral">x</SCRIPT><pct-badge>D</pct-badge>',
    );
  });

  it('rewrites a badge after a raw-text element has closed', async () => {
    expect(
      await rewrite(
        '<style>a{}</style><pct-badge tone="neutral">D</pct-badge>',
      ),
    ).toBe('<style>a{}</style><pct-badge>D</pct-badge>');
  });

  it.each([
    ['U+3000, an ideographic space', '\u3000'],
    ['U+2028, a line separator', '\u2028'],
    ['U+FEFF, a byte-order mark adrift in a file', '\ufeff'],
  ])('does not resume on `</script` + %s + `>`', async (_label, space) => {
    // JavaScript's `\s` is not Angular's whitespace: `\s` matches all three of these,
    // Angular matches none, and a pattern written with `\s` read a close where there was
    // none — inside the script, on a template Angular compiles without one complaint. The
    // characters are escapes on purpose: a case about invisible characters that carries one
    // cannot be read in a diff.
    const source = `<script>a</script${space}><pct-badge tone="neutral">D</pct-badge>`;
    const run = await drive({ '/src/w.html': source });
    expect(run.files['/src/w.html']).toBe(source);
  });

  it('resumes on `</script` + U+001F + `>`, which Angular closes on', async () => {
    // The other eighteen code points, and the other direction. Angular's whitespace runs
    // from tab to space unbroken, so every C0 control from 14 to 31 closes the element, and
    // `\s` saw not one of them — every badge below the script stayed unrewritten.
    expect(
      await rewrite(
        '<script>a</script\u001f><pct-badge tone="neutral">D</pct-badge>',
      ),
    ).toBe('<script>a</script\u001f><pct-badge>D</pct-badge>');
  });

  it('skips a raw-text element whose own tag carries U+00A0', async () => {
    // `<script` + U+00A0 + `>` is a script to Angular, so the badge inside it is TEXT. A
    // reader that took U+00A0 for part of the NAME did not see a script at all, and rewrote
    // the sample the consumer typed out.
    const source =
      '<script\u00a0>x<pct-badge tone="neutral">D</pct-badge></script>';
    expect(await rewrite(source)).toBe(source);
  });

  it.each(['title-bar', 'script-editor', 'style-guide', 'textarea-grid'])(
    'does NOT skip <%s>, whose name merely begins with one of the four',
    async (element) => {
      // Four names and not four prefixes. A consumer's own component is markup to Angular
      // whatever it is called, and reading `<title-bar>` as raw text skipped every badge
      // inside it in silence.
      expect(
        await rewrite(
          `<${element}><pct-badge tone="neutral">D</pct-badge></${element}>`,
        ),
      ).toBe(`<${element}><pct-badge>D</pct-badge></${element}>`);
    },
  );

  it('leaves a badge written inside a CDATA section alone', async () => {
    // Angular's tokenizer consumes `<![CDATA[ … ]]>` as TEXT, so the badge in here is a
    // sample — measured: the source below parses with no errors and no `pct-badge` node.
    // The comment branch above could not see it, because `<!` is not `<!--`, and the tag
    // guard could not either, because `!` is not the start of a tag name. So the section's
    // content went through as markup and was rewritten.
    const source =
      '<div><![CDATA[<pct-badge tone="neutral">D</pct-badge>]]></div>';
    const run = await drive({ '/src/c.html': source });
    expect(run.files['/src/c.html']).toBe(source);
    expect(warnings(run).join('')).toContain('were not');
  });

  it('reads on after a CDATA section that ends, and rewrites what follows', async () => {
    // The pair of the case above: a reader that stopped at the first CDATA section would
    // leave the rest of the file unread, and a badge below any of them would quietly keep
    // its tone.
    expect(
      await rewrite(
        '<div><![CDATA[x]]></div><pct-badge tone="neutral">D</pct-badge>',
      ),
    ).toBe('<div><![CDATA[x]]></div><pct-badge>D</pct-badge>');
  });

  it('reports a CDATA section with no end rather than reading past it', async () => {
    const run = await drive({ '/src/c.html': '<![CDATA[ oops' });
    expect(warnings(run)).toHaveLength(1);
  });

  it('resumes after <svg:script> closed by the bare name, as Angular does', async () => {
    // The badge AFTER the element is what makes this a reading. Measured: Angular closes on
    // the bare name here, with no error, for all four of the raw-text names however they are
    // qualified — and a reader that wanted the prefixed spelling found no close and gave up
    // on the rest of the file.
    expect(
      await rewrite(
        '<svg><svg:script>x</script></svg><pct-badge tone="neutral">D</pct-badge>',
      ),
    ).toBe('<svg><svg:script>x</script></svg><pct-badge>D</pct-badge>');
  });

  it('does not resume after <svg:script> closed by the PREFIXED name', async () => {
    // The other edge, and the one that costs. Measured: `</svg:script>` closes nothing for
    // Angular — the element swallows the rest of the template and the parse errors — so a
    // reader that took it for a close would be inside a script. The price of refusing is a
    // miss, and the backstop names the file.
    const source =
      '<svg><svg:script>x</svg:script></svg><pct-badge tone="neutral">D</pct-badge>';
    const run = await drive({ '/src/p.html': source });
    expect(run.files['/src/p.html']).toBe(source);
    expect(warnings(run).join('')).toContain('were not');
  });

  it.each(['script', 'style', 'textarea'])(
    'skips <svg:%s>, which is raw text however it is qualified',
    async (element) => {
      // Angular asks the tag definition of the LOCAL name, and for these three the content
      // type is a plain value that does not look at the prefix — measured. Anchored to the
      // whole name, a hand-written test matched none of them and the element's text went to
      // the rewrite as markup. `title` is NOT in this list, and the case below says why.
      const source = `<svg><svg:${element}>x<pct-badge tone="neutral">D</pct-badge></${element}></svg>`;
      expect(await rewrite(source)).toBe(source);
    },
  );

  it.each([
    [
      'inside <svg>',
      '<svg><pct-badge tone="neutral">D</pct-badge></svg>',
      '<svg><pct-badge>D</pct-badge></svg>',
    ],
    [
      'inside <svg:title>, which holds markup',
      '<svg><svg:title><pct-badge tone="neutral">D</pct-badge></svg:title></svg>',
      '<svg><svg:title><pct-badge>D</pct-badge></svg:title></svg>',
    ],
    [
      'written with the prefix itself',
      '<svg><svg:pct-badge tone="neutral">D</svg:pct-badge></svg>',
      '<svg><svg:pct-badge>D</svg:pct-badge></svg>',
    ],
    [
      'inside <math>',
      '<math><pct-badge tone="neutral">D</pct-badge></math>',
      '<math><pct-badge>D</pct-badge></math>',
    ],
    [
      'inside <foreignObject>, which leaves the namespace',
      '<svg><foreignObject><pct-badge tone="neutral">D</pct-badge></foreignObject></svg>',
      '<svg><foreignObject><pct-badge>D</pct-badge></foreignObject></svg>',
    ],
  ])('removes the tone from a badge %s', async (_label, source, want) => {
    // The parser reports `:svg:pct-badge` and `:math:pct-badge` for four of these, and
    // Angular strips the namespace before it matches a selector — `createCssSelectorFromNode`
    // calls `splitNsName` — so every one of them IS this component and every one wears a tone
    // that stops existing. An earlier revision of this branch compared the name whole, left
    // all four alone, and carried a case asserting that as correct: a regression against main,
    // pinned green, on the strength of a measurement that had measured something else
    // (`lesson-238`).
    expect(await rewrite(source)).toBe(want);
  });

  it.each(['my-pct-badge', 'pct-badge-group', 'x-pct-badge'])(
    "leaves <%s> alone, which is a consumer's own element",
    async (element) => {
      // The name has to BE this element and not end with it. A selector matches a name
      // whole, so `<my-pct-badge>` is somebody else's component wearing an attribute of its
      // own — and it may well mean something entirely different by `tone="neutral"`.
      const source = `<${element} tone="neutral">D</${element}>`;
      expect(await rewrite(source)).toBe(source);
    },
  );

  it('leaves <PCT-BADGE> alone, because a selector is case-sensitive', async () => {
    // The one shape the same rule declines. `splitNsName` takes the namespace off and nothing
    // takes the case off, so `PCT-BADGE` matches no selector and never bound the input —
    // removing its attribute would change a template that renders plain text.
    const source = '<PCT-BADGE tone="neutral">x</PCT-BADGE>';
    expect(await rewrite(source)).toBe(source);
  });

  it.each(['title', 'script'])(
    'reads <foo:%s> by the default content type, not the svg one',
    async (element) => {
      // The exception is `svg` and no other prefix. Measured: `<foo:title>` holds text like
      // the unprefixed element, and `<foo:script>` does too.
      const source = `<foo:${element}>x<pct-badge tone="neutral">D</pct-badge></${element}>`;
      expect(await rewrite(source)).toBe(source);
    },
  );

  it('reads <a-b:script> as one name, because that is not a prefix', async () => {
    // A prefix is `[A-Za-z0-9]+` and then a colon, and nothing else is one (`isPrefixEnd`).
    // So `a-b:script` is a single tag name that happens to hold a colon, the element is not
    // `script`, and its content is markup — measured: Angular finds a real badge in here.
    expect(
      await rewrite(
        '<a-b:script>x<pct-badge tone="neutral">D</pct-badge></a-b:script>',
      ),
    ).toBe('<a-b:script>x<pct-badge>D</pct-badge></a-b:script>');
  });

  it.each(['script', 'style', 'textarea', 'title'])(
    'ends the tag name of <%s=a> where Angular ends it',
    async (element) => {
      // `isNameEnd` is whitespace, `>`, `<`, `/`, either quote, `=`, or the end of the file.
      // A reader stopping only at a space calls this element `script=a`, walks into its text
      // and rewrites the sample — and then says nothing, because the rewrite took away the
      // word the backstop looks for. The quietest shape a defect can have here.
      const source = `<${element}=a>s <pct-badge tone="neutral">D</pct-badge></${element}>`;
      const run = await drive({ '/src/n.html': source });
      expect(run.files['/src/n.html']).toBe(source);
      expect(run.logs.map((l) => l.message).join('')).not.toContain('removed');
    },
  );

  it.each(['iframe', 'noscript'])(
    'does NOT skip <%s>, which Angular parses as markup',
    async (element) => {
      // The list is Angular's `TAG_DEFINITIONS` and not HTML's longer one: a badge inside
      // these is a real component instance, so skipping it would be skipping real work.
      expect(
        await rewrite(
          `<${element}><pct-badge tone="neutral">D</pct-badge></${element}>`,
        ),
      ).toBe(`<${element}><pct-badge>D</pct-badge></${element}>`);
    },
  );
});

describe('badge-tone migration — whitespace is read the way each side reads it', () => {
  it.each(['tone=" neutral "', 'tone="neutral "', 'tone=" neutral"'])(
    'leaves %s alone, because Angular does not trim a static value',
    async (spelling) => {
      const source = `<pct-badge ${spelling}>D</pct-badge>`;
      expect(await rewrite(source)).toBe(source);
    },
  );

  it('reads U+00A0 between the tag and the attribute the way Angular does', async () => {
    // `isWhitespace` in Angular's lexer is 9 to 32 and U+00A0, so this really is
    // `tone="neutral"` on a badge and the input really binds. Read as part of the
    // attribute NAME it is some other attribute, and the migration walks past a badge
    // wearing the tone this release takes away — a miss, and one an editor produces by
    // accident.
    expect(await rewrite('<pct-badge\u00a0tone="neutral">D</pct-badge>')).toBe(
      '<pct-badge>D</pct-badge>',
    );
  });

  it('reads U+001F between the tag and the attribute the way Angular does', async () => {
    // The badge BOUNDARY is a third reader of whitespace, after the attribute scan and
    // the raw-text close, and it kept `\s` through the repair of those two. Angular's
    // whitespace runs from tab to space unbroken, so this really is `<pct-badge>` wearing
    // `tone="neutral"` — and a control character is not a thing a consumer types, it is a
    // thing a generator emits. No U+00A0 case can see this: `\s` already holds U+00A0.
    expect(await rewrite('<pct-badge\u001ftone="neutral">D</pct-badge>')).toBe(
      '<pct-badge>D</pct-badge>',
    );
  });

  it('still removes a padded binding, whose value is an expression', async () => {
    expect(await rewrite(`<pct-badge [tone]=" 'neutral' ">D</pct-badge>`)).toBe(
      '<pct-badge>D</pct-badge>',
    );
  });
});

describe('badge-tone migration — the report agrees with the rewrite', () => {
  it.each([
    ['a string that merely holds the text', "const s = 'tone=neutral';"],
    ['another element', 'const t = `<other tone="neutral">`;'],
    ['a spelling that never bound', 'const u = `<PCT-BADGE tone="neutral">`;'],
  ])('does not call %s something to fix by hand', async (_label, source) => {
    // The template path declines all three. A report that names them is not over-caution, it
    // is advice that is wrong, and a consumer who checks two of those stops reading the rest.
    const run = await drive({ '/src/n.ts': source });
    expect(warnings(run).join('')).not.toContain('want your hands');
  });
});

describe('badge-tone migration — the last four, each pinned by the mutant that found it', () => {
  it('reports both findings when one file carries both', async () => {
    // The fallback was an `else`: a file with a line worth naming AND a tag spread over lines
    // reported only the first, inside the same file. The cross-file version of this was fixed
    // a round earlier; this is the same question asked one scope down.
    const run = await drive({
      '/src/both.ts': [
        'import { PctBadgeTone } from "@pacit/components/badge";',
        '@Component({ template: `<pct-badge',
        '  tone="neutral"',
        '>D</pct-badge>` })',
        '',
      ].join('\n'),
    });
    const said = warnings(run).join('');
    expect(said).toContain('src/both.ts:1');
    expect(said).toContain('were not');
  });

  it('does not call an attribute binding something to fix by hand', async () => {
    // `attr.tone="neutral"` sets a DOM attribute, not the input; the template path declines
    // it, and a report that names it is advice that is wrong.
    const run = await drive({
      '/src/a.ts': 'const t = `<pct-badge attr.tone="neutral">`;',
    });
    expect(warnings(run).join('')).not.toContain('want your hands');
  });

  it.each(['/src/m.mts', '/src/c.cts', '/src/x.tsx'])(
    'reads %s for the report',
    async (path) => {
      const run = await drive({
        [path]: 'import { PctBadgeTone } from "@pacit/components/badge";',
      });
      expect(warnings(run).join('')).toContain(path.replace(/^\//, ''));
    },
  );

  it('does not resume inside a script on a tag that closes nothing', async () => {
    // `</scriptx>` closes nothing. Reading it as a close puts the element's own text in
    // front of the rewrite, which is the one thing this migration must never do.
    const source = '<script>a</scriptx><pct-badge tone="neutral">D</pct-badge>';
    expect(await rewrite(source)).toBe(source);
  });

  it('still resumes on a real close, in any case', async () => {
    expect(
      await rewrite(
        '<script>a</script><pct-badge tone="neutral">D</pct-badge>',
      ),
    ).toBe('<script>a</script><pct-badge>D</pct-badge>');
    expect(
      await rewrite(
        '<script>a</ScRiPt><pct-badge tone="neutral">D</pct-badge>',
      ),
    ).toBe('<script>a</ScRiPt><pct-badge>D</pct-badge>');
  });

  it('skips a directory by its whole name, not by a suffix of one', async () => {
    // `dist` anchored to a path segment: without that, `src/mydist/` is silently passed over.
    const held = '<pct-badge tone="neutral">D</pct-badge>';
    const run = await drive({
      '/src/mydist/a.html': held,
      '/dist/b.html': held,
    });
    expect(run.files['/src/mydist/a.html']).toBe('<pct-badge>D</pct-badge>');
    expect(run.files['/dist/b.html']).toBe(held);
  });
});
