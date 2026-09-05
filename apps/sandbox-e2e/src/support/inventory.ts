import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The part inventory as a source of truth for the audit: `libs/components/parts.snapshot.md`
 * is written by `check-parts` from the BUILT package, so a class that exposes a `panel` part
 * is one whose open state the walk over the routes never sees — every overlay in the sandbox
 * starts shut. The list of panels to open is derived from it rather than kept by hand
 * (`a11y.spec.ts`), and these readers are pure so that the derivation can be given a doctored
 * inventory and shown to fire.
 */

/** The workspace root: the nearest directory above `from` holding `nx.json`. */
export function workspaceRoot(from: string = process.cwd()): string {
  let dir = from;
  while (!existsSync(join(dir, 'nx.json'))) {
    const up = dirname(dir);
    if (up === dir) throw new Error(`no nx.json above ${from}`);
    dir = up;
  }
  return dir;
}

export const PARTS_SNAPSHOT = join(
  workspaceRoot(),
  'libs/components/parts.snapshot.md',
);

/** The text of the versioned inventory. */
export function readPartsSnapshot(): string {
  return readFileSync(PARTS_SNAPSHOT, 'utf8');
}

/**
 * The classes exposing a `panel` part, from the inventory's rows
 * (`./select PctSelect panel`), each once and in order.
 */
export function panelOwners(snapshot: string): string[] {
  const owners = new Set<string>();
  for (const match of snapshot.matchAll(/^\.\/[\w-]+ (\w+) panel$/gm))
    owners.add(match[1]);
  return [...owners].sort();
}

/**
 * The two ways a stage list can drift from the inventory: an owner with no stage (a panel
 * the audit never opens) and a stage with no owner (a panel that is gone, or a name
 * misspelt — either way an audit of nothing).
 */
export function stageDrift(
  owners: readonly string[],
  staged: readonly string[],
): { unstaged: string[]; ownerless: string[] } {
  const ownerSet = new Set(owners);
  const stagedSet = new Set(staged);
  return {
    unstaged: owners.filter((o) => !stagedSet.has(o)).sort(),
    ownerless: staged.filter((s) => !ownerSet.has(s)).sort(),
  };
}
