import { posix } from 'node:path';
import ts from 'typescript';

/**
 * The class a name stands for in a source file, as far as `extends` can name one. The gates that
 * read a class follow its `extends`, and a bare name is not what the compiler follows: two classes
 * may share a name in two files, and an import may bind a name to a class declared under another
 * (`import { PctPlain as PctMarkerBase }`). A chain resolved by name across the sources then runs
 * through a class no build put there, and can close a cycle TypeScript has not got — measured
 * 2026-10-17: `PctLoopX extends PctLoopY extends PctLoopX`, the second `PctLoopX` an undecorated
 * class of another file, which `check-aria` read as a chain of two decorated classes and passed,
 * and recursed forever on without its `seen` guard. Refusing two DECORATED classes of one name
 * does not close that; reading the name where it is written does.
 *
 * So a name is resolved as TypeScript binds it in that file: a class the file declares stands for
 * itself, and a name the file imports stands for the class its module declares under the name it
 * is imported BY — the one before `as`. A relative module is the file its specifier names beside
 * the importing one, with `.ts`, which is how the library writes the import of a base; any other
 * specifier is a package's, kept as written, and names no file of the sources. Nothing else is
 * followed, and a name bound to anything else is bound to nothing here: a module that re-exports
 * a class (`export … from`, a barrel) declares none under that name, and a default or namespace
 * import or a `const` is no class declaration. Each gate refuses a base it does not find among
 * the decorated classes it read, so whatever this leaves unfollowed is said, not guessed.
 *
 * A class is keyed by its name AND its file (`classKey`): the key is what makes two classes of
 * one name two classes.
 */
export const classKey = (file, name) => `${name} (${file})`;

/**
 * What a base's name stands for, said in a refusal: the key `namesOf` gave it, or that the file
 * binds it to nothing.
 */
export const standsFor = (from) =>
  from === undefined
    ? 'which the file neither declares nor imports'
    : `which stands there for ${from}`;

/** Each top-level name of `file` that may stand for a class, to that class's key. */
export const namesOf = (file, content) => {
  const names = new Map();
  for (const statement of ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
  ).statements) {
    if (ts.isClassDeclaration(statement) && statement.name !== undefined)
      names.set(statement.name.text, classKey(file, statement.name.text));
    const bound = ts.isImportDeclaration(statement)
      ? statement.importClause?.namedBindings
      : undefined;
    if (bound === undefined || !ts.isNamedImports(bound)) continue;
    const specifier = statement.moduleSpecifier.text;
    const module = specifier.startsWith('.')
      ? `${posix.join(posix.dirname(file), specifier)}.ts`
      : specifier;
    for (const element of bound.elements)
      names.set(
        element.name.text,
        classKey(module, (element.propertyName ?? element.name).text),
      );
  }
  return names;
};
