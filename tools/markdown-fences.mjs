/**
 * A markdown text with its fenced blocks blanked out, LINE FOR LINE, so that a line number
 * read from what is left is the one a person scrolls to. `docs/plan.md` shows its commands in
 * code blocks, and a task line quoted in one is an example of a task rather than one:
 * `check-docs` point 8 reads the plan's tasks through this, and `check-prose` point 2 its
 * checkboxes beside a parser it must not ask. One reading of a fence, not two (0017).
 *
 * A line that opens with three backticks opens a fence at any indent, since in a list item it
 * stands indented, and the next such line closes it. Nothing else is read: prettier writes a
 * fence of four backticks around text holding three, and that one is read out of step. The
 * plan carries none.
 */
export const withoutFences = (text) => {
  let open = false;
  return String(text ?? '')
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        open = !open;
        return '';
      }
      return open ? '' : line;
    })
    .join('\n');
};
