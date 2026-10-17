import { posix } from 'node:path';
import ts from 'typescript';

/**
 * The class each class of the sources extends, as TypeScript binds the name. The gates that read
 * a class follow its `extends`, and a bare name is not what the compiler follows: two classes may
 * share a name in two files, and a module may export a class under a name another class of it is
 * declared by (`export { PctBare as PctWidgetBase }`). A chain resolved by name across the sources
 * then runs through a class no build put there, and can close a cycle TypeScript has not got —
 * measured 2026-10-17: `PctLoopX extends PctLoopY extends PctLoopX`, the second `PctLoopX` an
 * undecorated class of another file, which `check-aria` read as a chain of two decorated classes
 * and passed, and recursed forever on without its `seen` guard. Refusing two DECORATED classes of
 * one name does not close that; reading the name where it is written does.
 *
 * So the base is the expression of the class's own `extends` clause, off the parsed class — a
 * pattern over the text read `A` in `class C<T extends A> extends B` — and a name there stands for
 * what the file binds it to. A class the file declares stands for itself. A name the file imports
 * stands for what its module exports under the name before `as`, and that is followed only where
 * the module declares it, `export class N`: an export written as a clause (`export { X as N }`,
 * `export … from`, a barrel) and an `export default` are not, nor a module outside the sources —
 * a package, a path alias, a `.js` specifier. A relative module is the file its specifier names
 * beside the importing one, with `.ts`. A base expression other than a name (`ns.X`, `mix(Y)`),
 * and a name bound to a namespace, a default import or a `const`, stand for no class here either.
 * Every gate refuses a base that stands for no decorated class it read, so whatever this does not
 * follow is said, not guessed — and what it follows is the class TypeScript binds, so a cycle in
 * a chain of them is one the compiler refuses too (TS2506).
 *
 * A class is keyed by its name AND its file (`classKey`): the key is what makes two classes of one
 * name two classes.
 */
export const classKey = (file, name) => `${name} (${file})`;

/** What a base stands for, said in a refusal: its key from `classesOf`, or nothing followed. */
export const standsFor = (from) =>
  from === undefined
    ? 'which stands there for no class this read follows'
    : `which stands there for ${from}`;

const named = (statement) =>
  ts.isClassDeclaration(statement) && statement.name !== undefined;

const flagged = (statement, kind) =>
  ts.getModifiers(statement)?.some((m) => m.kind === kind);

/**
 * Every top-level class of `sources` (path → text), by `classKey`, to `{ base, from }`: `base` the
 * expression its `extends` clause names as written, or `undefined` with none, and `from` the key
 * of the class TypeScript binds it to, or `undefined` when that is no class this follows.
 */
export const classesOf = (sources) => {
  const parsed = [...sources].map(([file, content]) => ({
    file,
    source: ts.createSourceFile(file, content, ts.ScriptTarget.Latest),
  }));
  const exported = new Set(
    parsed.flatMap(({ file, source }) =>
      source.statements
        .filter(
          (s) =>
            named(s) &&
            flagged(s, ts.SyntaxKind.ExportKeyword) &&
            !flagged(s, ts.SyntaxKind.DefaultKeyword),
        )
        .map((s) => classKey(file, s.name.text)),
    ),
  );
  const classes = new Map();
  for (const { file, source } of parsed) {
    const names = new Map();
    for (const statement of source.statements) {
      if (named(statement))
        names.set(statement.name.text, classKey(file, statement.name.text));
      const bound = ts.isImportDeclaration(statement)
        ? statement.importClause?.namedBindings
        : undefined;
      if (bound === undefined || !ts.isNamedImports(bound)) continue;
      const module = `${posix.join(posix.dirname(file), statement.moduleSpecifier.text)}.ts`;
      for (const element of bound.elements) {
        const key = classKey(
          module,
          (element.propertyName ?? element.name).text,
        );
        if (exported.has(key)) names.set(element.name.text, key);
      }
    }
    for (const statement of source.statements.filter(named)) {
      const base = statement.heritageClauses?.find(
        (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
      )?.types[0].expression;
      classes.set(classKey(file, statement.name.text), {
        base: base?.getText(source),
        from:
          base !== undefined && ts.isIdentifier(base)
            ? names.get(base.text)
            : undefined,
      });
    }
  }
  return classes;
};
