import {
  HtmlParser,
  parseTemplate,
  RecursiveVisitor,
  visitAll,
} from '@angular/compiler';

/**
 * Every comment of a template, as the HTML parser reads it, by the span it covers: a `<!-- … -->`
 * wherever it stands, and the block or line comment Angular 22 reads inside a start tag, opened
 * by a slash and a star or by two slashes (`<div // the frame` and a line break). Off the
 * HTML tree, tokenized as `parseTemplate` tokenizes it — blocks, `@let` and ICUs, so that a
 * `<!--` in an attribute value, a block's condition, a `@let` string or an ICU's case value is
 * no comment here either — and not off that function's `commentNodes`: its transform never hands
 * over a comment standing between two cases of an `@switch`, nor any under `ngNonBindable` or in
 * an ICU, and a reading of the text would take what they quote for markup. The base visitor does
 * not enter an ICU's cases, and this one does: the template tree holds no element there, so the
 * text is the only reading of what a tag is — a stop `check-aria` scans for, an icon
 * `check-icons` counts and never walks — and a comment left in a start tag there, holding an
 * apostrophe, opens a quote that hides the stop the tag is.
 *
 * Where a tag stands in a case, this tree does say: each element a case draws, by the offset its
 * `<` stands at (`cased`), at any depth, in a nested ICU too — the visitor hands the flag down as
 * its context. It is the denominator of the scan there: a quote in a bracketed name, which
 * Angular's lexer reads as part of the name (`[it's]`), is one to the scan, which pairs each quote
 * with the next of its kind: where the pairs reach no `>` outside them, the scan finds no tag
 * where the stop starts, and where their first `>` outside them stands past a later tag's start,
 * the tag holding the quote runs on and swallows that one. And the name of every attribute written
 * on every element of this tree, a case's too (`attributes`), as the lexer read it: the denominator
 * of what the template tree's walk reads written on its elements.
 */
class CommentReader extends RecursiveVisitor {
  spans = [];
  cased = [];
  attributes = [];
  visitElement(node, inCase) {
    if (inCase) this.cased.push(node.sourceSpan.start.offset);
    this.attributes.push(...node.attrs.map((a) => a.name));
    super.visitElement(node, inCase);
  }
  visitComment(node) {
    this.spans.push(node.sourceSpan);
  }
  visitStartTagComment(node) {
    this.spans.push(node.sourceSpan);
  }
  visitExpansionCase(node) {
    this.visitChildren(true, (visit) => visit(node.expression));
  }
}
const LEXING = {
  tokenizeExpansionForms: true,
  tokenizeBlocks: true,
  tokenizeLet: true,
  leadingTriviaChars: [' ', '\n', '\r', '\t'],
};

/**
 * A template parsed, and the text every reading of it scans: the file's own, each comment blanked
 * (`CommentReader`) — every character of it a space, a line break kept — so that a tag, a role or
 * a part a comment quotes is text to the scan as it is to the tree, the offsets a reading joins on
 * are the file's, and a comment still stands between what it separates (a `<` before it and an
 * `svg` after it are not a tag). One code unit for one, so that a character outside the basic
 * plane moves no offset. A pattern stood in its place, and it is not the parser
 * ([`lesson-236`](../docs/lessons.md#lesson-236)): a `<!--` in one attribute value, string or
 * case value and a `-->` in a later one made it delete the markup between them from the text and
 * the tree together, and a stop or a drawing there passed every point.
 *
 * The reader of `check-aria` and of `check-icons` alike. Each gate carried a copy of it, and the
 * pattern before it was copied too and repaired in one gate first — the fix is to have one.
 *
 * The tree is the raw text's, and `errors` the compiler's: `null` where it found none. Beside them,
 * the offsets of the tags an ICU's cases draw (`cased`) and every attribute's name (`attributes`),
 * off the HTML tree. A template
 * read with errors is refused by each gate as one that does not parse before any verdict reads its
 * text, whatever a comment found there takes with it (`<a href=//x.example>` opens one that takes
 * the rest of its line, and the tag never ends).
 * Angular 22.2 throws on a comment standing directly in an ICU's case, and its HTML parser on a
 * `<![CDATA[` that never closes — the build, which hands the same text to the same parser, throws
 * as well — and a throw is read the same way.
 */
export const readTree = (file, content) => {
  let text = content;
  try {
    const html = new HtmlParser().parse(content, file, LEXING);
    const comments = new CommentReader();
    visitAll(comments, html.rootNodes);
    text = comments.spans.reduce(
      (blanked, { start, end }) =>
        blanked.slice(0, start.offset) +
        blanked.slice(start.offset, end.offset).replace(/[^\n]/g, ' ') +
        blanked.slice(end.offset),
      content,
    );
    const { nodes, errors } = parseTemplate(content, file, {
      preserveWhitespaces: false,
    });
    return {
      nodes,
      errors,
      text,
      cased: comments.cased,
      attributes: comments.attributes,
    };
  } catch (error) {
    return {
      nodes: [],
      errors: [{ msg: `the compiler throws: ${error.message}` }],
      text,
      cased: [],
      attributes: [],
    };
  }
};
