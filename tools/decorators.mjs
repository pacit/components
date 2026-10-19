import ts from 'typescript';

/**
 * A class decorator of a source file as ngc reads it, for every gate that reads one. Each of them
 * once read the decorator's text with patterns: a column-zero anchor for the decorator, a counter
 * from the start of a line past indentation for its denominator, and `template:` or `templateUrl:`
 * for a member. ngc reads none of that text. It reads the parsed decorator through the import, and
 * the members off the parsed object, and every one of these spellings compiled into the package
 * past the patterns (each measured through ngc in partial mode and the linker):
 *
 * - a member by shorthand (`template,`), under a quoted key (`'template':`) or under an escaped
 *   name (`t\u0065mplate:`);
 * - a decorator behind a block comment on its own line (`/* … *\/ @Component({`, which prettier
 *   keeps), and one on a class inside a namespace or a function;
 * - `Component` imported under another name (`Component as Widget`), and `@ng.Component` over a
 *   namespace import of `@angular/core`.
 *
 * So the decorators are read here off the TypeScript parser, once per file, a `host` block among
 * them (`hostOf`), and the gate keeps its column-zero pattern only for what it counts over the
 * decorator's text and to pair its read with this one by the offset of the `@`.
 */

/** The two decorators the gates read, by the names `@angular/core` exports them under. */
export const DECORATORS = new Set(['Component', 'Directive']);

/** A component decorator alone, for the gates that read components and no directive. */
export const COMPONENT_ONLY = new Set(['Component']);

/**
 * An expression with an `as` and parentheses taken off, as ngc's `unwrapExpression` takes them off
 * a decorator's argument.
 */
export const unwrap = (node) =>
  node !== undefined &&
  (ts.isAsExpression(node) || ts.isParenthesizedExpression(node))
    ? unwrap(node.expression)
    : node;

/**
 * The text of a member written as a string ngc evaluates as it stands — `'…'`, `"…"` or a template
 * with no substitution — or `undefined` for any other expression, which ngc evaluates (a constant,
 * a concatenation) and no gate reads.
 */
export const textOf = (node) =>
  node !== undefined && ts.isStringLiteralLike(node) ? node.text : undefined;

/**
 * The texts of an array member written as strings throughout (`styleUrls: ['./a.scss']`), or
 * `undefined` for an array holding anything else, or for no array.
 */
export const textsOf = (node) =>
  node !== undefined &&
  ts.isArrayLiteralExpression(node) &&
  node.elements.every((element) => textOf(element) !== undefined)
    ? node.elements.map(textOf)
    : undefined;

/**
 * The value of a `const` the file declares at its top level under the name, an `as` and
 * parentheses taken off, or `undefined` for a name no such constant bears.
 */
const constantOf = (name) => {
  for (const statement of name.getSourceFile().statements)
    if (
      ts.isVariableStatement(statement) &&
      statement.declarationList.flags & ts.NodeFlags.Const
    )
      for (const declaration of statement.declarationList.declarations)
        if (declaration.name.text === name.text)
          return unwrap(declaration.initializer);
  return undefined;
};

/**
 * A `host` block as ngc composes it, for every gate that reads one: `entries`, `[key, value]`, and
 * `followed`, the object literals the read reached through a name, for a gate counting over their
 * text. ngc hands the block to its partial evaluator, which composes it from whatever it can
 * evaluate: a constant by shorthand (`host,`) or by name, a spread of a constant, an import, a
 * member, a condition or a call, a computed key, a value kept in a constant. Each of these
 * compiled into `hostAttrs` (measured through ngc in partial mode and the linker), and a regex
 * over the decorator read none of them. The evaluator keys an entry by its name's text, so an
 * escape is resolved, and a later entry of a key stands over an earlier one in its place, so
 * `{ ...shared, title: '*' }` sets one `title` (measured); the entries are composed alike.
 *
 * So the read takes an object literal written in place and follows a name to a `const` the file
 * declares at its top level whose value is an object literal, as the block or as a spread in it,
 * an `as` and parentheses taken off either, under keys written as an identifier or a string and
 * values written as strings. Any other block, entry or spread makes it `null`, a block this read
 * does not take as written, which a gate refuses at point 1: among them some ngc composes, a `!`
 * or a constant naming another, which the library writes nowhere. ngc itself refuses an accessor,
 * a `satisfies` and a `<T>` assertion (NG1010), and a constant spread into itself, directly or
 * through another, is one TypeScript refuses (TS2448), so none of them reaches a gate.
 */
export const hostOf = (node) => {
  const entries = new Map();
  const followed = [];
  const objectOf = (expression) => {
    const object = unwrap(expression);
    const value = ts.isIdentifier(object) ? constantOf(object) : object;
    if (value === undefined || !ts.isObjectLiteralExpression(value))
      return null;
    if (value !== object) followed.push(value);
    return value;
  };
  const read = (expression) => {
    const object = objectOf(expression);
    if (object === null) return false;
    for (const entry of object.properties) {
      if (ts.isSpreadAssignment(entry)) {
        if (!read(entry.expression)) return false;
        continue;
      }
      const value =
        ts.isPropertyAssignment(entry) &&
        (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name))
          ? textOf(entry.initializer)
          : undefined;
      if (value === undefined) return false;
      entries.set(entry.name.text, value);
    }
    return true;
  };
  return node === undefined || read(node)
    ? { entries: [...entries], followed }
    : null;
};

/**
 * The decorators of one file, read as ngc reads them, for the gate holding `kinds` (`DECORATORS`
 * or `COMPONENT_ONLY`):
 *
 * `read(at)` — the metadata of the decorator whose `@` stands at the offset `at` on a class at the
 * top level of the file: a map of its members by name, or `null` for a decorator called with no
 * object literal, or `undefined` where the parser holds no decorator of such a class — a comment,
 * a string, or a class inside a namespace or a function. ngc takes the argument through
 * `unwrapExpression`, which takes off an `as` and parentheses, and refuses anything else that is
 * no object literal (NG1001, measured on `{ … } satisfies { … }`). It takes the members through
 * `reflectObjectLiteral`: a property named by an identifier or a string (or a number, which names
 * no member a gate reads), by the name's text, so `'template'` and `t\u0065mplate` are
 * `template`; and a shorthand, so `template,` hands the compiler the constant it names. Nothing
 * else is a member to it: a member under a computed key (`['template']`, `[key]`), in a spread or
 * behind an accessor is not one ngc compiles (NG2001, "missing a template", measured). The source
 * is `unwrapExpression` and `reflectObjectLiteral` in `@angular/compiler-cli`'s bundles.
 *
 * `declared` — the number of decorators called by a name of `kinds` anywhere in the file, the
 * counter a gate holds its pattern to, and `unseen()` each of them `read` was not asked about, by
 * file and line. The count descends into every node, a namespace's body and a function's alike,
 * and the offsets read are held by file, here: a set shared across the files would take the
 * offset of one file's decorator for another's.
 *
 * `renamed` — the names the file takes a decorator of `kinds` under, other than its own, from
 * `@angular/core`, and a namespace import of it (`* as ng`). The counter and the pattern know a
 * decorator by its name, and ngc by the import: it compiles `@Widget({…})` over `Component as
 * Widget`, and `@ng.Component({…})` over the namespace, into `consts` (measured), and neither
 * counts them.
 *
 * `source` — the parsed file, its parents set, for a gate reading more of it.
 */
export const decoratorsOf = (file, content, kinds = DECORATORS) => {
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const metadataOf = ({ expression }) => {
    const meta = ts.isCallExpression(expression)
      ? unwrap(expression.arguments[0])
      : undefined;
    if (meta === undefined || !ts.isObjectLiteralExpression(meta)) return null;
    const members = new Map();
    for (const member of meta.properties)
      if (
        ts.isPropertyAssignment(member) &&
        (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
      )
        members.set(member.name.text, member.initializer);
      else if (ts.isShorthandPropertyAssignment(member))
        members.set(member.name.text, member.name);
    return members;
  };
  const renamed = source.statements
    .filter(
      (statement) =>
        ts.isImportDeclaration(statement) &&
        statement.moduleSpecifier.text === '@angular/core',
    )
    .flatMap(({ importClause }) => {
      const bound = importClause?.namedBindings;
      if (bound === undefined) return [];
      if (ts.isNamespaceImport(bound)) return [`* as ${bound.name.text}`];
      return bound.elements
        .filter(
          ({ propertyName, name }) =>
            kinds.has(propertyName?.text) && propertyName.text !== name.text,
        )
        .map(
          ({ propertyName, name }) => `${propertyName.text} as ${name.text}`,
        );
    });
  const declared = [];
  const count = (node) => {
    if (
      ts.isDecorator(node) &&
      ts.isCallExpression(node.expression) &&
      kinds.has(node.expression.expression.text)
    )
      declared.push({
        at: node.getStart(source),
        line:
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      });
    ts.forEachChild(node, count);
  };
  count(source);
  const metadata = new Map(
    source.statements
      .filter(ts.isClassDeclaration)
      .flatMap((statement) => ts.getDecorators(statement) ?? [])
      .map((decorator) => [decorator.getStart(source), metadataOf(decorator)]),
  );
  const asked = new Set();
  return {
    source,
    renamed,
    declared: declared.length,
    read: (at) => {
      asked.add(at);
      return metadata.get(at);
    },
    unseen: () =>
      declared
        .filter(({ at }) => !asked.has(at))
        .map(({ line }) => `${file}:${line}`),
  };
};
