// A type-only import, for `ng-add`'s reason: the schematics runtime belongs to the Angular
// CLI that runs them, and a component library must not drag build tooling into a consumer's
// dependency tree (`req-project-dependencies`).
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * `0.3.0` — a control's `reset()` takes back what the form cannot see, and the value stays the
 * form's ([0092](https://pacit.github.io/components/trust/#adr-0092)).
 *
 * Until 0.3.0 every form control of the library emptied its value from `reset()` — `''`,
 * `null`, `false`, `[]`, `emptyValue`, the slider's midpoint — and a signal form calls that
 * method from its own reset. So `form().reset()` emptied the form, which Angular says it does
 * not do, `form().reset(value)` lost the value, written over by the control, and a direct
 * `ctrl.reset()` emptied the control. Now the control takes back only what it holds and the
 * form does not — junk, a text half typed, an open panel — and the value is whatever the form
 * has.
 *
 * **It writes nothing, because what changed is behaviour.** An application that emptied a form
 * with `form().reset()` meant "empty" and has to say what empty is — `form().reset(emptyModel)`
 * — and which value that is lives in the application, not in any text a migration can read.
 * So it NAMES the places, and the consumer reads each of them once:
 *
 * - every call of `reset()` with nothing in the brackets, in a workspace that binds one of
 *   these controls anywhere;
 * - every file holding a `pct-radio-group` and the word `emptyValue` — the input existed for
 *   the reset alone and is deprecated.
 *
 * **Whether the workspace binds a control is asked of the whole tree, and not of the file that
 * calls the reset.** A component gets its controls from an NgModule, from a barrel of the
 * consumer's own or from a parent, and its template is often a file of its own — so the file
 * holding `reset()` need not name a control for the call to reach one. An earlier version asked
 * per file, and over an NgModule, a barrel or a `templateUrl` it said there was nothing to read
 * in a workspace full of it. Asked of the tree, the error left is the cheap one: a `reset()` of
 * a classic `FormGroup`, a store or anything else is named although it did not change — one
 * look each.
 *
 * **It reads text and it is meant to.** `badge-tone` learned what a hand-written scan of markup
 * costs when it WRITES (`lesson-236`); a scan that only names a place costs a consumer one look
 * when it is wrong. A call is `reset(` with only white space before `)`, line breaks included,
 * and it is named by the line its `reset` stands on. What it does not see, written down rather
 * than discovered: a call spelt otherwise — `reset ()`, `['reset']()`, the method handed on
 * under another name — and a call given anything at all, which is a `reset(value)`: what the
 * consumer is told to write, and one that works better than it did.
 *
 * @see the spec beside this file, whose cases are the reading. Every pattern is written inside
 * the function that reads it, never at the top of the module (`lesson-250`).
 */
export function controlReset(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // Directories with no consumer source in them, and a great deal of everything else. A
    // tree's path always starts at its root, `/`, and a file read here always ends in an
    // extension, so a skipped name has a slash on both sides.
    const skipped = /\/(node_modules|dist|\.git|\.angular|\.nx|coverage)\//;
    // A template, or any spelling of a TypeScript file, where a component's own may be inline.
    const read = /\.(?:html?|[cm]?ts)$/i;

    const paths: string[] = [];
    tree.visit((path) => {
      if (!skipped.test(path) && read.test(path)) paths.push(path);
    });

    // One pass, and no text kept past its file: what a file adds is where its resets stand,
    // whether it binds a control and whether it gives a radio group an `emptyValue`.
    let bound = false;
    const resets: string[] = [];
    const empties: string[] = [];
    for (const path of paths) {
      let text: string;
      try {
        text = tree.readText(path);
      } catch {
        // `readText` decodes as UTF-8 and throws on anything else, and `.ts` is also the
        // extension of an MPEG transport stream: one asset must not end the whole run.
        continue;
      }
      const shown = path.slice(1);
      bound ||= bindsAControl(text);
      resets.push(...bareResets(text, shown));
      if (/<pct-radio-group\b/i.test(text) && /\bemptyValue\b/.test(text))
        empties.push(shown);
    }

    if (!bound) {
      context.logger.info(
        `[pacit] nothing to read: no file in this workspace binds a form control of this ` +
          `library, so no reset reaches one.`,
      );
      return;
    }

    if (resets.length)
      context.logger.warn(
        `[pacit] ${resets.length} \`reset()\` call(s) in a workspace that binds ` +
          `@pacit/components form controls. A control's reset no longer empties its value: ` +
          `a signal form's \`reset()\` keeps the values, as Angular documents, ` +
          `\`reset(value)\` shows the one it is given, and a control's own \`reset()\` takes ` +
          `back only what the control holds — junk, a text half typed, an open panel. Where a ` +
          `line meant "empty", write what empty is — \`form().reset({ seats: null, … })\`. A ` +
          `reset of anything else changed nothing; one look each:\n` +
          resets.map((p) => `    ${p}`).join('\n'),
      );

    if (empties.length)
      context.logger.warn(
        `[pacit] ${empties.length} file(s) hold a <pct-radio-group> and \`emptyValue\`, which ` +
          `the reset used to write and nothing reads now. It is deprecated and still binds; ` +
          `reset the form with the value it should hold instead:\n` +
          empties.map((p) => `    ${p}`).join('\n'),
      );

    if (!resets.length && !empties.length)
      context.logger.info(
        `[pacit] nothing to read: this workspace binds form controls of this library, and ` +
          `no file calls \`reset()\` or gives a radio group an \`emptyValue\`.`,
      );
  };
}

/**
 * Whether the text binds a form control of this library: a file importing or re-exporting one
 * by its class, or a template carrying one by its selector. The class names stand behind the
 * package's name, so a consumer's own `PctDate` from somewhere else is not taken for ours.
 */
function bindsAControl(text: string): boolean {
  const imported =
    /@pacit\/components/.test(text) &&
    /\bPct(?:Text|Number|Checkbox|Switch|Slider|RadioGroup|Select|MultiSelect|Date|Time|Datetime)\b/.test(
      text,
    );
  const carried =
    /<pct-(?:checkbox|switch|slider|radio-group|select|multi-select|date|time|datetime)(?=[\s/>])/i.test(
      text,
    ) || /\bpct(?:Text|Number)\b/.test(text);
  return imported || carried;
}

/** `path:line` for every call of `reset()` with nothing but white space in the brackets. */
function bareResets(text: string, shown: string): string[] {
  return [...text.matchAll(/\breset\(\s*\)/g)].map(
    (call) => `${shown}:${text.slice(0, call.index).split('\n').length}`,
  );
}
