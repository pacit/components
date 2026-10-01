// A prepared input to the import reader of `check-tools` point 5: every form of a load this
// repository writes, and two that are not loads. The reader is held to exactly four — two of
// them files the index holds — and the gate's `LOADS` says which. Nothing runs this file.
import { focused } from './a-name-the-browser-declares.mjs';
export { targetsIn } from '../workflow-targets.mjs';
export * from './a-module-nobody-wrote.mjs';
export const later = () => import('./a-module-loaded-later.mjs');
// Neither of these is a load: a specifier inside a string is generated code, which is the
// shape `check-consumer.mjs` writes, and `from './a-module-in-a-comment.mjs'` is a sentence.
export const prose = `import { App } from './a-module-in-a-string.mjs';`;
export { focused };
