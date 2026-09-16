#!/usr/bin/env node
/**
 * Releases `@pacit/components`. A script rather than plain `nx release`, which can only
 * build **before** the version bump and would ship an artifact lying about its own
 * `PCT_VERSION` ([`lesson-41`](../docs/lessons.md#lesson-41)). The programmatic API lets
 * us step in between:
 *   1. `releaseVersion` — bumps libs/components/package.json (no commit, no tag),
 *   2. `stamp-version` — writes that version into the constant in the code,
 *   3. `build` + `check-package` — the artifact comes from already-bumped sources, and
 *      the gate stops an incomplete package before the commit, the tag and the publish,
 *   4. `releaseChangelog` — CHANGELOG, commit, tag, GitHub Release entry,
 *   5. `releasePublish` — the publish itself.
 *
 * Usage:
 *   node tools/release.mjs --dry-run          # writes nothing, publishes nothing
 *   node tools/release.mjs --specifier=minor
 *   node tools/release.mjs --first-release    # no previous tag
 */
import { execFileSync } from 'node:child_process';
import { releaseChangelog, releasePublish, releaseVersion } from 'nx/release';

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);

const dryRun = flag('dry-run');
const verbose = flag('verbose');
const firstRelease = flag('first-release');
const specifier = arg('specifier');

const run = (args) => {
  console.log(`\n> npx ${args.join(' ')}`);
  execFileSync('npx', args, { stdio: 'inherit' });
};

if (dryRun) {
  console.log(
    '\n=== DRY RUN (--dry-run): nothing will be written, tagged or published ===',
  );
}

// 1. Version. Commit and tag deliberately deferred — they are to cover the CHANGELOG
//    and the rewritten constant too, and those appear only in steps 2 and 4.
const { workspaceVersion, projectsVersionData } = await releaseVersion({
  specifier,
  dryRun,
  verbose,
  firstRelease,
  gitCommit: false,
  gitTag: false,
  stageChanges: false,
});

// 2. The constant in the code follows the manifest. In a dry run the manifest was left
//    alone, so the stamp is a no-op here and the artifact stays consistent.
run(['nx', 'stamp-version', 'components']);

// 3. Only now the build — the sources already carry the new version. We call
//    `schematics`, because that target depends on `build` and adds `ng add` plus the
//    migration collection to dist. The gate runs directly rather than through an nx
//    target, because `--release` sharpens it with the metadata npm requires (among them
//    `repository`, without which there is no provenance). Day to day that condition only
//    warns: a missing remote repository is not a defect in the code.
run(['nx', 'schematics', 'components']);
//    The citations in the JSDoc become the site's addresses here, after the build and
//    before the gate reads the artefact (decision 0078) — the step `check-package` point 9
//    measures.
run(['nx', 'citations', 'components']);
console.log('\n> node libs/components/check-package.mjs --release');
execFileSync('node', ['libs/components/check-package.mjs', '--release'], {
  stdio: 'inherit',
});

// 4. CHANGELOG from conventional commits + commit + tag + GitHub Release.
await releaseChangelog({
  versionData: projectsVersionData,
  version: workspaceVersion,
  dryRun,
  verbose,
  firstRelease,
  // The tag has to be on the remote before the GitHub Release exists — the latter is
  // created through the API and points at an existing tag.
  gitPush: true,
});

// 5. Publish. `nx-release-publish` points at dist/libs/components, not at the source
//    directory.
const result = await releasePublish({ dryRun, verbose, firstRelease });

// The exit code is the sum of the per-project results — without it a failed publish
// would end the workflow green.
process.exit(Object.values(result).every((r) => r.code === 0) ? 0 : 1);
