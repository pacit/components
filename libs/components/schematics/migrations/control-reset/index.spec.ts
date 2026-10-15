import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { controlReset } from './index';

/**
 * The migration runs on repositories nobody here can see, and no gate in this workspace
 * executes it, so these cases are the instrument — measured, as `badge-tone`'s are, by the
 * mutants Stryker plants in the file beside this one. It writes nothing; what it is worth is
 * the list it prints, so every case reads the list, and one case reads every word of both
 * messages.
 */

/** Everything the rule touches on a `Tree`. A `Uint8Array` is the file `readText` refuses. */
const drive = (files: Record<string, string | Uint8Array>) => {
  const store = new Map<string, string | Uint8Array>(Object.entries(files));
  const logs: { level: 'info' | 'warn'; message: string }[] = [];
  const written: string[] = [];
  const tree = {
    visit: (visitor: (path: string) => void) =>
      [...store.keys()].forEach((path) => visitor(path)),
    readText: (path: string) => {
      const held = store.get(path);
      if (typeof held !== 'string')
        throw new Error(`Failed to decode "${path}" as UTF-8 text.`);
      return held;
    },
    overwrite: (path: string) => written.push(path),
    create: (path: string) => written.push(path),
    delete: (path: string) => written.push(path),
  } as unknown as Tree;
  const context = {
    logger: {
      info: (message: string) => logs.push({ level: 'info', message }),
      warn: (message: string) => logs.push({ level: 'warn', message }),
    },
  } as unknown as SchematicContext;

  (controlReset() as Rule & ((t: Tree, c: SchematicContext) => void))(
    tree,
    context,
  );
  return { logs, written };
};

const warnings = (run: ReturnType<typeof drive>): string[] =>
  run.logs.filter((l) => l.level === 'warn').map((l) => l.message);

/** The `path:line` entries a run names, in the order it names them. */
const named = (run: ReturnType<typeof drive>): string[] =>
  warnings(run).flatMap((message) =>
    message
      .split('\n')
      .slice(1)
      .map((line) => line.trim()),
  );

const COMPONENT = `import { Component } from '@angular/core';
import { PctNumber } from '@pacit/components/field';

@Component({ imports: [PctNumber], templateUrl: './seats.html' })
export class Seats {
  cancel() {
    this.f().reset();
  }
}
`;

describe('control-reset migration — what it names', () => {
  it('names a bare reset() in a component that imports a control, by path and line', () => {
    expect(named(drive({ '/src/seats.ts': COMPONENT }))).toEqual([
      'src/seats.ts:7',
    ]);
  });

  it('names a bare reset() in a template that carries a control', () => {
    const run = drive({
      '/src/seats.html':
        '<pct-checkbox [formField]="f.agree" />\n<button (click)="f().reset()">Cancel</button>',
    });
    expect(named(run)).toEqual(['src/seats.html:2']);
  });

  it('takes spaces between the brackets for nothing, and an argument for a reset(value)', () => {
    const run = drive({
      '/src/a.html': [
        '<input pctNumber [formField]="f.seats" />',
        '<button (click)="f().reset( )">a</button>',
        '<button (click)="f().reset({ seats: null })">b</button>',
        '<button (click)="f().reset(empty)">c</button>',
        '<button (click)="f().reset(\t)">d</button>',
      ].join('\n'),
    });
    expect(named(run)).toEqual(['src/a.html:2', 'src/a.html:5']);
  });

  it('reads `reset` as a word: `doreset()` and `onReset()` are other calls', () => {
    const run = drive({
      '/src/a.html':
        '<input pctText />\n<b (click)="doreset()"></b>\n<b (click)="onReset()"></b>',
    });
    expect(named(run)).toEqual([]);
  });

  it('names every line of a file, and the files in the order the tree gives them', () => {
    const run = drive({
      '/b.html': '<pct-slider />\nreset()\nx\nreset()',
      '/a.html': 'reset()\n<pct-switch />',
    });
    expect(named(run)).toEqual(['b.html:2', 'b.html:4', 'a.html:1']);
  });

  it.each([
    'pct-checkbox',
    'pct-switch',
    'pct-slider',
    'pct-radio-group',
    'pct-select',
    'pct-multi-select',
    'pct-date',
    'pct-time',
    'pct-datetime',
  ])('takes <%s> for a control', (tag) => {
    expect(named(drive({ '/t.html': `<${tag} />\nreset()` }))).toEqual([
      't.html:2',
    ]);
  });

  it.each([
    ['a space', '<pct-date label="x">'],
    ['a slash', '<pct-date/>'],
    ['a bracket', '<pct-date>'],
    ['a line break', '<pct-date\n  label="x">'],
    ['capitals', '<PCT-DATE>'],
  ])('ends a tag at %s', (_label, tag) => {
    expect(named(drive({ '/t.html': `${tag}\nreset()` }))).toHaveLength(1);
  });

  it('does not take a longer name for a control: <pct-time-columns> is no form control', () => {
    expect(
      named(drive({ '/t.html': '<pct-time-columns />\nreset()' })),
    ).toEqual([]);
  });

  it('does not take an attribute that only holds the name: mypctText, pctTextual', () => {
    const run = drive({
      '/a.html': '<input mypctText />\nreset()',
      '/b.html': '<input pctTextual />\nreset()',
    });
    expect(named(run)).toEqual([]);
  });

  it.each(['pctText', 'pctNumber'])(
    'takes the %s attribute for a control',
    (attribute) => {
      expect(
        named(drive({ '/t.html': `<input ${attribute} />\nreset()` })),
      ).toEqual(['t.html:2']);
    },
  );

  it.each([
    'PctText',
    'PctNumber',
    'PctCheckbox',
    'PctSwitch',
    'PctSlider',
    'PctRadioGroup',
    'PctSelect',
    'PctMultiSelect',
    'PctDate',
    'PctTime',
    'PctDatetime',
  ])('takes an import of %s for a control', (name) => {
    const source = `import { ${name} } from '@pacit/components/x';\nreset();`;
    expect(named(drive({ '/c.ts': source }))).toEqual(['c.ts:2']);
  });

  it('takes a class name for ours only behind the package name', () => {
    const run = drive({
      '/own.ts': "import { PctNumber } from './my-number';\nreset();",
      '/core.ts':
        "import { PctTexts } from '@pacit/components/core';\nreset();",
    });
    expect(named(run)).toEqual([]);
  });

  it('does not take a longer class name for a control', () => {
    const run = drive({
      '/c.ts':
        "import { PctTimeOfDay, PctSelectOption, PctDateTime, MyPctNumber } from '@pacit/components/x';\nreset();",
    });
    expect(named(run)).toEqual([]);
  });

  it('names nothing in a file that binds no control of ours, and says there is nothing', () => {
    const run = drive({ '/src/a.ts': 'this.f().reset();' });
    expect(run.logs).toEqual([
      {
        level: 'info',
        message:
          '[pacit] nothing to read: no file that binds a form control of this library calls ' +
          '`reset()` or gives a radio group an `emptyValue`.',
      },
    ]);
  });
});

describe('control-reset migration — where it reads', () => {
  it.each(['node_modules', 'dist', '.git', '.angular', '.nx', 'coverage'])(
    'skips %s, at the root and under a folder',
    (dir) => {
      const run = drive({
        [`/${dir}/a.html`]: '<pct-date />\nreset()',
        [`/apps/x/${dir}/a.html`]: '<pct-date />\nreset()',
      });
      expect(named(run)).toEqual([]);
    },
  );

  it('reads a folder whose name only begins like a skipped one', () => {
    expect(
      named(drive({ '/node_modules_old/a.html': '<pct-date />\nreset()' })),
    ).toEqual(['node_modules_old/a.html:2']);
  });

  it.each(['a.html', 'a.htm', 'a.HTML', 'a.ts', 'a.mts', 'a.cts', 'a.TS'])(
    'reads %s',
    (name) => {
      expect(
        named(drive({ [`/${name}`]: '<pct-date />\nreset()' })),
      ).toHaveLength(1);
    },
  );

  it.each(['a.js', 'a.md', 'a.scss', 'a.tsx', 'a.html.bak', 'a.d.tsx'])(
    'does not read %s',
    (name) => {
      expect(named(drive({ [`/${name}`]: '<pct-date />\nreset()' }))).toEqual(
        [],
      );
    },
  );

  it('steps over a file it cannot decode and reads the rest', () => {
    const run = drive({
      '/video.ts': new Uint8Array([0x47, 0xff]),
      '/a.html': '<pct-date />\nreset()',
    });
    expect(named(run)).toEqual(['a.html:2']);
  });

  it('writes nothing, whatever it names', () => {
    const run = drive({
      '/a.html': '<pct-radio-group [emptyValue]="x" />\nreset()',
      '/b.ts': COMPONENT,
    });
    expect(warnings(run)).toHaveLength(2);
    expect(run.written).toEqual([]);
  });
});

describe('control-reset migration — the radio group’s emptyValue', () => {
  it('names a file holding a radio group and emptyValue', () => {
    const run = drive({
      '/src/plan.html':
        '<pct-radio-group [formField]="f.plan" [emptyValue]="none" />',
    });
    expect(named(run)).toEqual(['src/plan.html']);
  });

  it('names neither a radio group without it nor emptyValue on a select', () => {
    const run = drive({
      '/a.html': '<pct-radio-group [formField]="f.plan" />',
      '/b.html': '<pct-select emptyValue="" />',
      '/c.html': '<pct-radio-group myemptyValue="x" />',
      '/d.html': '<pct-radio-group emptyValueOf="x" />',
    });
    expect(named(run)).toEqual([]);
  });

  it('reads the tag in any case, and the word whole', () => {
    const run = drive({
      '/a.html': '<PCT-RADIO-GROUP emptyValue="x" />',
      '/b.html': '<pct-radio-groups emptyValue="x" />',
    });
    expect(named(run)).toEqual(['a.html']);
  });
});

describe('control-reset migration — what it says', () => {
  it('says both things in full, with the counts', () => {
    const run = drive({
      '/a.html': '<pct-radio-group emptyValue="x" />\nreset()\nreset()',
      '/b.ts': COMPONENT,
    });
    expect(run.logs).toEqual([
      {
        level: 'warn',
        message:
          '[pacit] 3 `reset()` call(s) in files that bind a @pacit/components form control. ' +
          "A control's reset no longer empties its value: a signal form's `reset()` keeps the " +
          'values, as Angular documents, and `reset(value)` shows the one it is given. Where a ' +
          'line meant "empty the form", write what empty is — `form().reset({ seats: null, … })`. ' +
          "A reset that is not a signal form's changed nothing:\n" +
          '    a.html:2\n    a.html:3\n    b.ts:7',
      },
      {
        level: 'warn',
        message:
          '[pacit] 1 file(s) hold a <pct-radio-group> and `emptyValue`, which the reset used to ' +
          'write and nothing reads now. It is deprecated and still binds; reset the form with ' +
          'the value it should hold instead:\n' +
          '    a.html',
      },
    ]);
  });

  it('says only what it found', () => {
    expect(
      drive({ '/a.html': '<pct-radio-group emptyValue="x" />' }).logs.map(
        (l) => l.level,
      ),
    ).toEqual(['warn']);
    expect(
      drive({ '/a.html': '<pct-date />\nreset()' }).logs.map((l) => l.level),
    ).toEqual(['warn']);
  });
});
