// A prepared input to the import reader of `check-tools` point 5: a file that is no script,
// loaded by one and loading one more. The walk over what a script reaches has to pass through
// it — `at-pass.mjs` loads a `.ts` the same way — and the gate's `LOADS` names the file it has
// to arrive at. Nothing runs this file; the root compiler program reads it
// (`tsconfig.root.json`), so that it stays TypeScript a compiler sees.
import './a-name-nothing-declares.mjs';

export const hop = 'one file on, and not a script';
