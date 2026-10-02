// The git-call reader's prepared input in `check-tools.mjs`, never run. A string that names
// ls-files as a word is a call, whatever surrounds it. `asked` holds twelve, one per entry,
// and a last entry that asks through the `.ts` this file loads: every kind of string the parser
// hands out, a string over two lines, the shell forms three rounds of review raised, prose, read
// on purpose, and a hyphen written as an escape. `told` holds five strings and a regular
// expression that are not read. This comment names git ls-files too, and is no string.
import { execFileSync, execSync } from 'node:child_process';
import { askedThere } from './a-hop-that-asks.ts';

const ROOT = process.cwd();
const GIT = 'git';
const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

export const asked = [
  git('ls-files', '-z'),
  execSync('git -C "$(git rev-parse --show-toplevel)" ls-files'),
  execSync(`git ls-files --deleted`),
  execSync(`git ls-files ${'--others'}`),
  execSync(`${GIT} -C ${ROOT} ls-files ${'-z'}`),
  execSync(`${GIT} ls-files`),
  execSync(`cd libs &&
  git ls-files`),
  execSync('bash -lc "git -C \\"$DIR\\" ls-files"'),
  execSync('{ git ls-files; } | sort'),
  'run git ls-files and compare the two lists',
  'git-ls-files',
  'git ls\x2dfiles',
  askedThere(),
];

export const told = [
  'ls-filesystem',
  'ls-files-cache',
  'tools-files',
  'git ls-tree HEAD',
  'ls-' + 'files',
  /git ls-files/,
];
