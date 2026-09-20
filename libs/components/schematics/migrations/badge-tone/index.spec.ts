import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { badgeTone } from './index';

/**
 * The migration runs on repositories nobody here can see, and no gate in this workspace
 * executes it: `check-package` asks whether the factory file exists, not whether it does the
 * right thing. So these cases are the instrument.
 *
 * They are in two halves, and the halves are the design. What a `.html` file gets is a
 * rewrite; what a `.ts` file gets is a report and not one byte of change. The second half is
 * the one with history: five versions of this migration read TypeScript and five deleted a
 * consumer's code, so the cases below hold every input that ever did it and assert the file
 * comes back identical.
 */

/** Everything the rule touches on a `Tree`, and nothing else. A `Uint8Array` is the file */
/** `readText` refuses, which is how the decoding case is written. */
const drive = (files: Record<string, string | Uint8Array>) => {
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

  (badgeTone() as Rule & ((t: Tree, c: SchematicContext) => void))(
    tree,
    context,
  );
  return { files: Object.fromEntries(store), logs };
};

/** One file in, the same path out. */
const rewrite = (source: string, path = '/src/a.html'): string =>
  drive({ [path]: source }).files[path] as string;

const warnings = (run: ReturnType<typeof drive>): string[] =>
  run.logs.filter((l) => l.level === 'warn').map((l) => l.message);

describe('badge-tone migration — what it rewrites in a template', () => {
  it.each([
    ['a static attribute', '<pct-badge tone="neutral">D</pct-badge>'],
    ['single quotes', "<pct-badge tone='neutral'>D</pct-badge>"],
    ['a binding on the literal', `<pct-badge [tone]="'neutral'">D</pct-badge>`],
    ['a binding with padding', `<pct-badge [tone]=" 'neutral' ">D</pct-badge>`],
    ['the `bind-` spelling', `<pct-badge bind-tone="'neutral'">D</pct-badge>`],
    ['spaces around the equals', '<pct-badge tone = "neutral">D</pct-badge>'],
  ])('removes %s', (_label, source) => {
    expect(rewrite(source)).toBe('<pct-badge>D</pct-badge>');
  });

  it('leaves every other attribute where it stood, and the tag`s own spacing', () => {
    expect(rewrite('<pct-badge tone="neutral" class="x">D</pct-badge>')).toBe(
      '<pct-badge class="x">D</pct-badge>',
    );
    expect(rewrite('<pct-badge class="x" tone="neutral">D</pct-badge>')).toBe(
      '<pct-badge class="x">D</pct-badge>',
    );
    expect(
      rewrite('<pct-badge\n  tone="neutral"\n  class="x"\n>D</pct-badge>'),
    ).toBe('<pct-badge\n  class="x"\n>D</pct-badge>');
  });

  it('takes the i18n descriptor of the attribute it removes', () => {
    // Left behind, it describes an attribute that no longer exists — a template error the
    // consumer would get to debug on our behalf.
    expect(rewrite('<pct-badge i18n-tone tone="neutral">D</pct-badge>')).toBe(
      '<pct-badge>D</pct-badge>',
    );
  });

  it('reads a self-closing tag, an unquoted value, and a second badge on the line', () => {
    expect(rewrite('<pct-badge tone="neutral" />')).toBe('<pct-badge />');
    // Angular reads `tone=neutral/` in a self-closing tag as `tone="neutral"`.
    expect(rewrite('<pct-badge tone=neutral/>')).toBe('<pct-badge/>');
    expect(
      rewrite(
        '<pct-badge tone="neutral">a</pct-badge><pct-badge tone="neutral">b</pct-badge>',
      ),
    ).toBe('<pct-badge>a</pct-badge><pct-badge>b</pct-badge>');
  });

  it('reads a `.htm` file as a template too', () => {
    expect(
      rewrite('<pct-badge tone="neutral">D</pct-badge>', '/src/d.htm'),
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
  ])('finds the tone past a `>` inside %s', (_label, source, want) => {
    // An early cut ended the tag at the first `>`, never saw the attribute, and reported
    // nothing: a confident false negative, which is the failure mode that costs most.
    expect(rewrite(source)).toBe(want);
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
  ])('leaves %s exactly as it was', (_label, source) => {
    expect(rewrite(source)).toBe(source);
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
  ])('does not touch a byte of %s', (_label, source) => {
    expect(rewrite(source, '/src/w.ts')).toBe(source);
  });

  it('does not rewrite even a plain, unambiguous inline template', () => {
    // The line this design draws. Rewriting this one is easy; knowing it is this one and not
    // the four above means parsing TypeScript, and that is the thing that keeps going wrong.
    const source =
      '@Component({ template: `<pct-badge tone="neutral">D</pct-badge>` })';
    expect(rewrite(source, '/src/c.ts')).toBe(source);
  });

  it('reports the line instead, with its number', () => {
    const run = drive({
      '/src/c.ts': [
        '@Component({',
        '  template: `<pct-badge tone="neutral">D</pct-badge>`,',
        '})',
        '',
      ].join('\n'),
    });
    expect(warnings(run).join('')).toContain('src/c.ts:2');
  });

  it('reports a surviving PctBadgeTone with its line', () => {
    const run = drive({
      '/src/t.ts':
        'x\nimport { PctBadgeTone } from "@pacit/components/badge";\n',
    });
    const said = warnings(run).join('');
    expect(said).toContain('PctBadgeTone');
    expect(said).toContain('src/t.ts:2');
  });

  it('reports a source file that names a badge and the word with no line to point at', () => {
    // The line report wants the element and the attribute together, so a tag spread over
    // lines matches no line at all — and the file is named whole rather than passed over.
    // This case earns its place only since that narrowing: before it, line 2 matched on the
    // attribute alone and the case passed off the wrong warning while claiming this one.
    const run = drive({
      '/src/s.ts':
        '@Component({ template: `<pct-badge\n  tone="neutral"\n>D</pct-badge>` })',
    });
    expect(warnings(run).join('')).toContain('src/s.ts');
  });
});

describe('badge-tone migration — what it says', () => {
  it('skips a file it cannot decode instead of ending the run', () => {
    // `readText` decodes as UTF-8 and throws on anything else, and `.ts` is also the
    // extension of an MPEG transport stream. One asset under `public/` would otherwise end
    // the migration with a decoding error the consumer cannot act on.
    const run = drive({
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
  ])('reports %s rather than passing over it', (_label, source) => {
    const run = drive({ '/src/b.html': source });
    expect(run.files['/src/b.html']).toBe(source);
    expect(warnings(run).join('')).toContain('were not');
  });

  it('reports a template it could not read even when no tone is in the file', () => {
    // The one case where only the unreadable count can carry the warning: nothing here says
    // "neutral", so the backstop has nothing to see and the reading is the report itself.
    const run = drive({
      '/src/u.html': '<!-- oops\n<pct-badge tone="danger">d</pct-badge>',
    });
    expect(warnings(run)).toHaveLength(1);
  });

  it('reports a template it HALF rewrote, with nothing else wrong with it', () => {
    // The backstop's first cut asked whether the file was UNTOUCHED and might hold a tone,
    // which exempted every file where something had been rewritten — a miss beside a hit was
    // reported by nothing. The badge in the `title` here is text and correctly left alone.
    const run = drive({
      '/src/e.html': [
        '<pct-badge tone="neutral">a</pct-badge>',
        `<div title="<pct-badge tone='neutral'>">b</div>`,
      ].join('\n'),
    });
    expect(run.files['/src/e.html']).toContain('<pct-badge>a</pct-badge>');
    expect(warnings(run).join('')).toContain('were not');
  });

  it('is quiet about a template whose badges it fully rewrote', () => {
    const run = drive({
      '/src/f.html': '<pct-badge tone="neutral">a</pct-badge>',
    });
    expect(warnings(run)).toHaveLength(0);
  });

  it('says so once when there is nothing to do', () => {
    const run = drive({ '/src/d.html': '<p>nothing here</p>' });
    expect(run.logs).toHaveLength(1);
    expect(run.logs[0].message).toContain('nothing to migrate');
  });

  it('changes nothing on a second run over its own output', () => {
    const once = drive({
      '/src/a.html': '<pct-badge tone="neutral" class="x">D</pct-badge>',
    });
    const twice = drive(once.files);
    expect(twice.files['/src/a.html']).toBe(once.files['/src/a.html']);
    expect(twice.logs.some((l) => l.message.includes('removed from'))).toBe(
      false,
    );
  });
});

describe('badge-tone migration — the report is per file, and reads what the rewrite reads', () => {
  it('names a source file whose attribute no single line carries — after another file reported', () => {
    // The fallback used to be guarded by an accumulator over EVERY file seen so far, so the
    // first source naming `PctBadgeTone` switched it off for the rest of the walk. This
    // migration exists because that type was deleted, so nearly every consumer has such a
    // file, and the whole reporting side went quiet after it.
    const run = drive({
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
  ])('reports %s in TypeScript', (_label, spelling) => {
    const run = drive({
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
  ])('does not call %s something to fix by hand', (_label, spelling) => {
    // Over-reporting is the safe direction, but advice that is wrong is not advice: the
    // template path leaves all three alone, so the report must agree with it.
    const run = drive({
      '/src/s.ts': `const t = \`<pct-badge ${spelling}>D</pct-badge>\`;`,
    });
    expect(warnings(run).join('')).not.toContain('want your hands');
  });

  it('reads a `.tsx` source and an upper-case `.HTML` template', () => {
    const run = drive({
      '/src/x.tsx': 'import { PctBadgeTone } from "@pacit/components/badge";',
      '/src/u.HTML': '<pct-badge tone="neutral">D</pct-badge>',
    });
    expect(warnings(run).join('')).toContain('src/x.tsx');
    expect(run.files['/src/u.HTML']).toBe('<pct-badge>D</pct-badge>');
  });

  it('never opens anything under node_modules or dist', () => {
    const held = '<pct-badge tone="neutral">D</pct-badge>';
    const run = drive({ '/node_modules/p/x.html': held, '/dist/y.html': held });
    expect(run.files['/node_modules/p/x.html']).toBe(held);
    expect(run.files['/dist/y.html']).toBe(held);
    expect(run.logs[0].message).toContain('nothing to migrate');
  });
});

describe('badge-tone migration — text that is not markup', () => {
  it.each(['textarea', 'script', 'style', 'title'])(
    'leaves a badge written inside <%s> alone',
    (element) => {
      // HTML reads these as text, and so does Angular. A badge in there is a sample the
      // consumer typed out, and rewriting it edits their prose.
      const source = `<${element}><pct-badge tone="neutral">D</pct-badge></${element}>`;
      expect(rewrite(source)).toBe(source);
    },
  );

  it('leaves an upper-case spelling of the element alone', () => {
    // Angular matches selectors case-sensitively, so `<PCT-BADGE>` never bound the input.
    const source = '<PCT-BADGE tone="neutral">x</PCT-BADGE>';
    expect(rewrite(source)).toBe(source);
  });

  it('reports a badge tag that runs into the next one instead of cutting it', () => {
    // A tag with no `>` of its own: the scan refuses it rather than reading the next tag's
    // attributes as its own.
    const source = '<pct-badge tone="neutral"\n<div>x</div>';
    const run = drive({ '/src/b.html': source });
    expect(run.files['/src/b.html']).toBe(source);
    expect(warnings(run).join('')).toContain('were not');
  });

  it('reports an unterminated badge tag even when no tone is in the file', () => {
    // The isolating case for the unreadable count on the TAG path: nothing here says
    // "neutral", so the backstop has nothing to see.
    const run = drive({ '/src/u.html': '<pct-badge tone="danger"' });
    expect(warnings(run)).toHaveLength(1);
  });
});

describe('badge-tone migration — the raw-text skip, at its edges', () => {
  it.each(['script', 'style', 'textarea', 'title'])(
    'runs an unclosed <%s> to the end rather than reading its content',
    (element) => {
      // The dangerous direction: continuing past an unclosed raw-text element puts its
      // content back in the scan, which is the prose-editing the skip exists to prevent.
      const source = `<${element}>x<pct-badge tone="neutral">D`;
      expect(rewrite(source)).toBe(source);
    },
  );

  it('honours a closing tag spelled in another case, and goes on after it', () => {
    // The badge AFTER the close is what makes this a reading: a close the skip cannot find
    // runs to the end of the file, which leaves the sample alone for the wrong reason and
    // takes every real badge below it down too.
    expect(
      rewrite(
        `<script>var a = "<pct-badge tone='neutral'>";</ScRiPt><pct-badge tone="neutral">D</pct-badge>`,
      ),
    ).toBe(
      `<script>var a = "<pct-badge tone='neutral'>";</ScRiPt><pct-badge>D</pct-badge>`,
    );
  });

  it('skips the element whatever case its own name is written in, and goes on after it', () => {
    expect(
      rewrite(
        '<SCRIPT><pct-badge tone="neutral">x</SCRIPT><pct-badge tone="neutral">D</pct-badge>',
      ),
    ).toBe(
      '<SCRIPT><pct-badge tone="neutral">x</SCRIPT><pct-badge>D</pct-badge>',
    );
  });

  it('rewrites a badge after a raw-text element has closed', () => {
    expect(
      rewrite('<style>a{}</style><pct-badge tone="neutral">D</pct-badge>'),
    ).toBe('<style>a{}</style><pct-badge>D</pct-badge>');
  });

  it.each(['iframe', 'noscript'])(
    'does NOT skip <%s>, which Angular parses as markup',
    (element) => {
      // The list is Angular's `TAG_DEFINITIONS` and not HTML's longer one: a badge inside
      // these is a real component instance, so skipping it would be skipping real work.
      expect(
        rewrite(
          `<${element}><pct-badge tone="neutral">D</pct-badge></${element}>`,
        ),
      ).toBe(`<${element}><pct-badge>D</pct-badge></${element}>`);
    },
  );
});

describe('badge-tone migration — whitespace is read the way each side reads it', () => {
  it.each(['tone=" neutral "', 'tone="neutral "', 'tone=" neutral"'])(
    'leaves %s alone, because Angular does not trim a static value',
    (spelling) => {
      const source = `<pct-badge ${spelling}>D</pct-badge>`;
      expect(rewrite(source)).toBe(source);
    },
  );

  it('still removes a padded binding, whose value is an expression', () => {
    expect(rewrite(`<pct-badge [tone]=" 'neutral' ">D</pct-badge>`)).toBe(
      '<pct-badge>D</pct-badge>',
    );
  });
});

describe('badge-tone migration — the report agrees with the rewrite', () => {
  it.each([
    ['a string that merely holds the text', "const s = 'tone=neutral';"],
    ['another element', 'const t = `<other tone="neutral">`;'],
    ['a spelling that never bound', 'const u = `<PCT-BADGE tone="neutral">`;'],
  ])('does not call %s something to fix by hand', (_label, source) => {
    // The template path declines all three. A report that names them is not over-caution, it
    // is advice that is wrong, and a consumer who checks two of those stops reading the rest.
    const run = drive({ '/src/n.ts': source });
    expect(warnings(run).join('')).not.toContain('want your hands');
  });
});

describe('badge-tone migration — the last four, each pinned by the mutant that found it', () => {
  it('reports both findings when one file carries both', () => {
    // The fallback was an `else`: a file with a line worth naming AND a tag spread over lines
    // reported only the first, inside the same file. The cross-file version of this was fixed
    // a round earlier; this is the same question asked one scope down.
    const run = drive({
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

  it('does not call an attribute binding something to fix by hand', () => {
    // `attr.tone="neutral"` sets a DOM attribute, not the input; the template path declines
    // it, and a report that names it is advice that is wrong.
    const run = drive({
      '/src/a.ts': 'const t = `<pct-badge attr.tone="neutral">`;',
    });
    expect(warnings(run).join('')).not.toContain('want your hands');
  });

  it.each(['/src/m.mts', '/src/c.cts', '/src/x.tsx'])(
    'reads %s for the report',
    (path) => {
      const run = drive({
        [path]: 'import { PctBadgeTone } from "@pacit/components/badge";',
      });
      expect(warnings(run).join('')).toContain(path.replace(/^\//, ''));
    },
  );

  it('does not resume inside a script on a tag that closes nothing', () => {
    // `</scriptx>` is not a close tag. Resuming on it puts the element's own text back into
    // the scan, which is the one place this migration writes where Angular would not.
    const source = '<script>a</scriptx><pct-badge tone="neutral">D</pct-badge>';
    expect(rewrite(source)).toBe(source);
  });

  it('still resumes on a real close, in any case', () => {
    expect(
      rewrite('<script>a</script><pct-badge tone="neutral">D</pct-badge>'),
    ).toBe('<script>a</script><pct-badge>D</pct-badge>');
    expect(
      rewrite('<script>a</ScRiPt><pct-badge tone="neutral">D</pct-badge>'),
    ).toBe('<script>a</ScRiPt><pct-badge>D</pct-badge>');
  });

  it('skips a directory by its whole name, not by a suffix of one', () => {
    // `dist` anchored to a path segment: without that, `src/mydist/` is silently passed over.
    const held = '<pct-badge tone="neutral">D</pct-badge>';
    const run = drive({ '/src/mydist/a.html': held, '/dist/b.html': held });
    expect(run.files['/src/mydist/a.html']).toBe('<pct-badge>D</pct-badge>');
    expect(run.files['/dist/b.html']).toBe(held);
  });
});
