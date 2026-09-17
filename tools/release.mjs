#!/usr/bin/env node
/**
 * Releases `@pacit/components`. A script rather than plain `nx release`, which can only
 * build **before** the version bump and would ship an artifact lying about its own
 * `PCT_VERSION` ([`lesson-41`](../docs/lessons.md#lesson-41)). The programmatic API lets
 * us step in between:
 *   1. `releaseVersion` — bumps libs/components/package.json (staged; no commit, no tag),
 *   2. `stamp-version` — writes that version into the constant in the code,
 *   3. `build` + `check-package` — the artifact comes from already-bumped sources, and
 *      the gate stops an incomplete package before the commit, the tag and the stage,
 *   4. `releaseChangelog` — CHANGELOG, commit, tag, GitHub Release entry,
 *   5. `npm stage publish` — the tarball goes to npm's stage; a maintainer approves it.
 *
 * Usage:
 *   node tools/release.mjs --dry-run          # writes nothing, stages nothing
 *   node tools/release.mjs --specifier=minor
 *   node tools/release.mjs --first-release    # no previous tag
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { releaseChangelog, releaseVersion } from 'nx/release';

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
    '\n=== DRY RUN (--dry-run): nothing will be written, tagged or staged ===',
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
  // Staged, not committed: the commit comes in step 4 and has to carry the manifest as well
  // as the CHANGELOG. `false` here let the first release commit the CHANGELOG alone — the
  // manifest and the stamp stayed in the runner's checkout while 0.1.0 went to npm
  // (lesson-220). `releaseChangelog` commits the index, and nothing else fills it.
  stageChanges: true,
});
const version = projectsVersionData.components?.newVersion;
if (!version) {
  console.error(
    '\nNothing to release: no version resolved for `components` — no commit since the tag ' +
      'counts, and no --specifier was given.',
  );
  process.exit(1);
}

// 2. The constant in the code follows the manifest. In a dry run the manifest was left
//    alone, so the stamp is a no-op here and the artifact stays consistent.
run(['nx', 'stamp-version', 'components']);
// The constant goes into the index beside the manifest, for the same commit (lesson-220).
// Skipped in a dry run, which wrote nothing to add.
if (!dryRun)
  execFileSync(
    'git',
    ['add', 'libs/components/package.json', 'libs/components/src/version.ts'],
    { stdio: 'inherit' },
  );

// 3. Only now the build — the sources already carry the new version. We call
//    `schematics`, because that target depends on `build` and adds `ng add` plus the
//    migration collection to dist. The gate runs directly rather than through an nx
//    target, because `--release` sharpens it with the metadata npm requires (among them
//    `repository`, without which there is no provenance). Day to day that condition only
//    warns: a missing remote repository is not a defect in the code.
//    `schematics` depends on `citations` too, so the one invocation also turns the JSDoc's
//    citations into the site's addresses (decision 0078) before the gate reads them. ONE
//    invocation on purpose: `build` owns the whole of dist, and a second `nx` run restoring
//    it from the cache wipes what the first wrote inside (project.json, `// schematics`).
run(['nx', 'schematics', 'components']);
console.log('\n> node libs/components/check-package.mjs --release');
execFileSync('node', ['libs/components/check-package.mjs', '--release'], {
  stdio: 'inherit',
});

// 4. CHANGELOG from conventional commits + commit + tag + GitHub Release. The renderer
//    (`tools/changelog-renderer.mjs`, decision 0079) renders the first release as a
//    measurement and every later one as the list; this is how it learns which it is.
process.env.PCT_FIRST_RELEASE = firstRelease ? '1' : '0';
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

// 5. The stage. `npm stage publish` is `npm publish` stopped one step short: the tarball is
//    up, and the version stays invisible until a maintainer approves it with 2FA, on
//    npmjs.com or with `npm stage approve` (decision 0079, amended 2026-09-17). The trusted
//    publisher `release.yml` runs as may only stage — the registry refuses `npm publish`
//    from it — and Nx's `releasePublish` knows only `npm publish`, so npm is called directly:
//    from the package root, because `npm stage` is unaware of workspaces, and with
//    `--provenance` said out loud, so a run that cannot sign fails instead of staging
//    unsigned. `--json` keeps the tarball listing on stderr and puts the stage id where the
//    summary below can read it.
const packageRoot = 'dist/libs/components';
const stageArgs = ['stage', 'publish', '--provenance', '--json'];
// A dry run writes no manifest (decision 0079), so the artifact still carries the published
// version, and npm's own check — "cannot publish over 0.1.0" — would end the rehearsal before
// the exchange. `--force` skips that check and the prerelease-tag one, nothing else; the real
// run has the bumped manifest and keeps both.
if (dryRun) stageArgs.push('--dry-run', '--force');
console.log(`\n> npm ${stageArgs.join(' ')}   (in ${packageRoot})`);
const stage = spawnSync('npm', stageArgs, {
  cwd: packageRoot,
  encoding: 'utf8',
});
process.stderr.write(stage.stderr ?? '');
console.log(stage.stdout ?? '');
if (stage.status !== 0) process.exit(stage.status ?? 1);
// The exchange is what the rehearsal on the runner is for: npm swallows a failed OIDC
// exchange and, in a dry run, only warns that nobody is logged in. On the runner, which holds
// no other credential (`release.yml`), that warning is the finding — the registry does not
// know this workflow as the package's trusted publisher — and a real run would learn it after
// the tag. Locally it says only whether somebody is logged in, so it is read on the runner.
if (
  dryRun &&
  process.env.GITHUB_ACTIONS &&
  /requires you to be logged in/.test(stage.stderr ?? '')
) {
  console.error(
    '\nThe OIDC exchange returned no token: npm does not recognise this workflow as the ' +
      "package's trusted publisher (the repository, the workflow file name, `id-token: write`). " +
      'A real run would fail here, after the tag.',
  );
  process.exit(1);
}
let stageId;
try {
  // `npm stage publish` is workspace-aware and keys its JSON by package name — read on the
  // runner's rehearsal of 2026-09-17: `{ "@pacit/components": { "id": …, … } }`. The flat
  // shape is kept for the day npm flattens it.
  const out = JSON.parse(stage.stdout);
  stageId =
    out.stageId ??
    Object.values(out).find((v) => v && typeof v === 'object' && 'stageId' in v)
      ?.stageId;
} catch {
  // Not JSON after all — the raw output above is the record, and the id is in it.
}

// What happens next is a person's move, so it is said where the person looks: the job
// summary on GitHub when there is one, the terminal otherwise.
const { name } = JSON.parse(
  readFileSync(`${packageRoot}/package.json`, 'utf8'),
);
const note = dryRun
  ? `Dry run: ${name}@${version} would be staged on npm. Nothing was written, tagged or ` +
    `staged; the rehearsal packed the artifact at its current version, ` +
    `${projectsVersionData.components.currentVersion}, because a dry run writes no manifest.`
  : `${name}@${version} is staged on npm${stageId ? ` (stage id \`${stageId}\`)` : ''}. ` +
    'The tag and the GitHub Release are out; the version reaches consumers once a ' +
    'maintainer approves it with 2FA — on npmjs.com, or:\n\n' +
    `    npm stage list ${name}\n    npm stage approve <id>\n`;
console.log(`\n${note}`);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${note}\n`);
