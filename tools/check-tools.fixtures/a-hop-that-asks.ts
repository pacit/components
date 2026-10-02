// A prepared input to the call reader of `check-tools` point 6: a file that is no script,
// loaded by the prepared script that asks, asking once itself and loading a module that asks
// nothing. Callers are read over everything a script reaches, so this file is one and the
// module beyond it is not — the gate's `CALLS` says so. Nothing runs this file; the root
// compiler program reads it (`tsconfig.root.json`), so that it stays TypeScript a compiler sees.
import { execFileSync } from 'node:child_process';
import './a-module-that-asks-nothing.mjs';

export const askedThere = (): string =>
  execFileSync('git', ['ls-files'], { encoding: 'utf8' });
