import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Rebuild what a snapshot is written FROM, ignoring the task cache — on a `--write`, and
 * never on a check.
 *
 * The one piece of shared code among the gates, and it is here because the property it
 * carries belongs to **writing a snapshot** rather than to any one gate. Five tools in this
 * repository rewrite a recorded measurement, four of them read an artefact somebody else's
 * target produced, and every one of them had the same hole: a cached artefact is not
 * necessarily what the sources at that commit produce, and a number written from one is a
 * reading of the cache. `check-bundle` is where it was found, because a size gate exists to
 * notice eighteen bytes and eighteen bytes of cache look exactly like eighteen bytes of code
 * (**C29**).
 *
 * Deliberately not the alternative the finding also offered — `--skip-nx-cache` on the
 * target's `dependsOn`. That would slow every CHECK run down as well, and a check run reading
 * a cached artefact is not the defect: a wrong BASELINE is, because it moves the thing every
 * later run is compared against.
 *
 * A check run is untouched, so this costs CI nothing.
 */
export const freshInputsFor = (write, targets) => {
  if (!write || targets.length === 0) return;

  for (const target of targets) {
    try {
      execFileSync('npx', ['nx', 'run', target, '--skip-nx-cache'], {
        cwd: ROOT,
        stdio: 'inherit',
      });
    } catch {
      // A write that could not rebuild its inputs must not fall back to the cache quietly —
      // that is precisely the failure this exists to remove.
      throw new Error(
        `could not rebuild \`${target}\` without the cache, and a snapshot must not be ` +
          `written from an artefact this run did not produce (C29). Build it by hand ` +
          `(\`npx nx run ${target} --skip-nx-cache\`) and try again.`,
      );
    }
  }
};
