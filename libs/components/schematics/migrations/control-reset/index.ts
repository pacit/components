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
 * not do, and `form().reset(value)` lost the value, written over by the control. Now the
 * control takes back only what it holds and the form does not — junk, a text half typed, an
 * open panel — and the value is whatever the form has.
 *
 * **It writes nothing, because what changed is behaviour.** An application that emptied a form
 * with `form().reset()` meant "empty" and has to say what empty is — `form().reset(emptyModel)`
 * — and which value that is lives in the application, not in any text a migration can read.
 * So it NAMES the places, and the consumer reads each of them once:
 *
 * - every line calling `reset()` with no argument, in a file that binds one of these controls:
 *   a component that imports one from `@pacit/components`, or a template that carries one;
 * - every file holding a `pct-radio-group` and the word `emptyValue` — the input existed for
 *   the reset alone and is deprecated.
 *
 * **It reads text and it is meant to.** `badge-tone` learned what a hand-written scan of markup
 * costs when it WRITES (`lesson-236`); a scan that only names a file costs a consumer one look
 * when it is wrong, and both of its errors are of that kind. A `reset()` that is a classic
 * `FormGroup`'s, or anybody else's, in a file that also binds a control is named although it
 * did not change — one look. A `reset()` in a PARENT of the component that binds the controls
 * is not named, because nothing in that file says a control of ours is reached from it — the
 * blind spot, written down rather than discovered. `reset( )` with only spaces between the
 * brackets is `reset()`; a call given anything at all is a `reset(value)`, which is what the
 * consumer is told to write and works better than it did.
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
      if (!bindsAControl(text)) continue;
      const shown = path.slice(1);
      resets.push(...bareResets(text, shown));
      if (/<pct-radio-group\b/i.test(text) && /\bemptyValue\b/.test(text))
        empties.push(shown);
    }

    if (resets.length)
      context.logger.warn(
        `[pacit] ${resets.length} \`reset()\` call(s) in files that bind a @pacit/components ` +
          `form control. A control's reset no longer empties its value: a signal form's ` +
          `\`reset()\` keeps the values, as Angular documents, and \`reset(value)\` shows the ` +
          `one it is given. Where a line meant "empty the form", write what empty is — ` +
          `\`form().reset({ seats: null, … })\`. A reset that is not a signal form's changed ` +
          `nothing:\n` +
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
        `[pacit] nothing to read: no file that binds a form control of this library calls ` +
          `\`reset()\` or gives a radio group an \`emptyValue\`.`,
      );
  };
}

/**
 * Whether the text binds a form control of this library: a component importing one by its
 * class, or a template carrying one by its selector. The class names stand behind the
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

/** `path:line` for every line of the text that calls `reset()` with nothing in the brackets. */
function bareResets(text: string, shown: string): string[] {
  return text
    .split('\n')
    .flatMap((line, index) =>
      /\breset\(\s*\)/.test(line) ? [`${shown}:${index + 1}`] : [],
    );
}
