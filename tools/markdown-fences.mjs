/**
 * A markdown text with its fenced blocks blanked out, LINE FOR LINE, so that a line number
 * read from what is left is the one a person scrolls to. `docs/plan.md` shows its commands in
 * code blocks, and a task line quoted in one is an example of a task rather than one:
 * `check-docs` point 8 reads the plan's tasks through this, and `check-prose` point 2 its
 * checkboxes beside a parser it must not ask. One reading of a fence, not two (0017).
 *
 * It reads a fence as prettier writes one, a line at a time, and nothing more: not tildes,
 * which prettier turns into backticks, nor the block a fence mark stands in — one the parser
 * reads as HTML, indented code or a paragraph opens a fence here, and one left open runs on
 * past its list item. `check-prose` point 2 sees that only where it moves the count.
 */
export const withoutFences = (text) => {
  let fence = '';
  return String(text ?? '')
    .split('\n')
    .map((line) => {
      // A run of backticks at the head of a line, at any indent — in a list item a fence
      // stands indented — or after the markers of the list items it opens (`  - ```bash`),
      // as CommonMark bounds a marker: nine digits at most, and one to four spaces after it,
      // since a fifth makes the rest indented code. `s`, since a line may still carry a
      // carriage return or a U+2028, and `.` stops there.
      const [, run = '', rest = ''] =
        line.match(
          /^\s*(?:(?:[-*+]|\d{1,9}[.)])(?: {1,4}|\t))*(`{3,})(.*)$/s,
        ) ?? [];
      if (!fence) {
        // A backtick after the run makes the line text with a span in it. A span's
        // continuation lands in column 0 however it was written, and may open with three.
        if (!run || rest.includes('`')) return line;
        fence = run;
        return '';
      }
      // Only a run at least as long as the opening one closes it: prettier makes a fence
      // longer than any run it holds, so a block quoting a fence of three stands in four.
      if (run.length >= fence.length) fence = '';
      return '';
    })
    .join('\n');
};
