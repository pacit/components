#!/usr/bin/env node
/**
 * Releases `@pacit/components`, in two runs: `main` takes only a commit whose CI checks are
 * green (decision 0094), so the release commit goes there as a pull request, and the stage and
 * the tag come from the commit `main` holds. A script, not plain `nx release`, which builds
 * **before** the bump and ships a lying `PCT_VERSION` ([`lesson-41`](../docs/lessons.md#lesson-41)).
 *   1. `releaseVersion` — bumps libs/components/package.json (staged; no commit, no tag),
 *   2. `stamp-version` — writes that version into the constant and dates every `@since next`,
 *   3. `check-acr --write` — re-renders the report that embeds the version (lesson-243),
 *   4. `build` + `check-package` — the artifact from already-bumped sources, gated before the commit,
 *   5. `releaseChangelog` — CHANGELOG and commit, pushed to `release/<version>` with a pull request;
 *   then `--publish`, dispatched on `main` once that pull request merged:
 *   6. `npm stage publish` of the release commit — a maintainer approves it with 2FA,
 *   7. the tag and the GitHub Release, on that commit and only after the stage went up.
 *
 * Usage:
 *   node tools/release.mjs --dry-run [--first-release] [--specifier=minor]   # writes nothing
 *   node tools/release.mjs --publish [--dry-run]   # HEAD is the merged release commit
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
const publish = flag('publish');
const specifier = arg('specifier');

const run = (args) => {
  console.log(`\n> npx ${args.join(' ')}`);
  execFileSync('npx', args, { stdio: 'inherit' });
};
const out = (cmd, args, input) =>
  execFileSync(cmd, args, { encoding: 'utf8', input }).trim();
const fail = (message) => {
  console.error(`\n${process.env.GITHUB_ACTIONS ? '::error::' : ''}${message}`);
  process.exit(1);
};
const say = (note) => {
  console.log(`\n${note}`);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${note}\n`);
};

const manifest = 'libs/components/package.json';
const packageRoot = 'dist/libs/components';

// The one guard a rehearsal cannot give the publish (0079): the commit about to go out
// carries a CI run on `main`, and that run concluded green. A check-run query rather than
// `needs:`, because the workflow is dispatched by hand against whatever `main` is at the time,
// and the release path re-runs only the build and the package gate. The prepare run holds
// `main`'s head to it — a rehearsal against a red tree rehearses nothing — and the publish run
// the release commit, whose run is its push's: a merge by a person, since a merge by the bot's
// token starts no workflow (lesson-243). Off a runner there is no token to ask with.
const requireGreen = (sha) => {
  if (!process.env.GITHUB_ACTIONS) {
    console.log(`\n(not on a runner: the CI colour of ${sha} is not read)`);
    return;
  }
  const verdict = out('gh', [
    'api',
    `repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=${sha}&branch=main&per_page=1`,
    '--jq',
    '.workflow_runs[0] | select(. != null) | "\\(.status) \\(.conclusion)"',
  ]);
  console.log(`\nCI on ${sha}: ${verdict || 'no run'}`);
  if (verdict !== 'completed success')
    fail(
      `${sha} has no green CI run on main (${verdict || 'none'}) — nothing is published ` +
        'from a commit the gates have not passed. A run cancelled by a later merge is ' +
        're-run on its commit: `gh run rerun <id>`.',
    );
};

// The stage. `npm stage publish` is `npm publish` stopped one step short: the tarball is up,
// and the version stays invisible until a maintainer approves it with 2FA, on npmjs.com or
// with `npm stage approve` (decision 0079, amended 2026-09-17). The trusted publisher
// `release.yml` runs as may only stage, and Nx's `releasePublish` knows only `npm publish`,
// so npm is called directly: from the package root, because `npm stage` is unaware of
// workspaces, and with `--provenance` said out loud, so a run that cannot sign fails instead
// of staging unsigned. `--json` keeps the tarball listing on stderr and puts the stage id
// where the summary can read it. Returns that id, when npm said it.
const stage = ({ force }) => {
  const stageArgs = ['stage', 'publish', '--provenance', '--json'];
  // The prepare run's rehearsal writes no manifest (decision 0079), so the artifact still
  // carries the published version, and npm's own check — "cannot publish over 0.2.0" — would
  // end it before the exchange. `--force` skips that check and the prerelease-tag one, nothing
  // else; the publish run has the bumped manifest and keeps both.
  if (dryRun) stageArgs.push('--dry-run');
  if (force) stageArgs.push('--force');
  console.log(`\n> npm ${stageArgs.join(' ')}   (in ${packageRoot})`);
  const staged = spawnSync('npm', stageArgs, {
    cwd: packageRoot,
    encoding: 'utf8',
  });
  process.stderr.write(staged.stderr ?? '');
  console.log(staged.stdout ?? '');
  if (staged.status !== 0) process.exit(staged.status ?? 1);
  // The exchange is what the rehearsal on the runner is for: npm swallows a failed OIDC
  // exchange and, in a dry run, only warns that nobody is logged in. On the runner, which holds
  // no other credential (`release.yml`), that warning is the finding — the registry does not
  // know this workflow as the package's trusted publisher. Locally it says only whether
  // somebody is logged in, so it is read on the runner.
  if (
    dryRun &&
    process.env.GITHUB_ACTIONS &&
    /requires you to be logged in/.test(staged.stderr ?? '')
  )
    fail(
      "The OIDC exchange returned no token: npm does not recognise this workflow as the package's " +
        'trusted publisher (the repository, the workflow file name, `id-token: write`). A real ' +
        'publish would fail here, before the tag.',
    );
  try {
    // `npm stage publish` is workspace-aware and keys its JSON by package name — read on the
    // runner's rehearsal of 2026-09-17: `{ "@pacit/components": { "id": …, … } }`. The flat
    // shape is kept for the day npm flattens it.
    const json = JSON.parse(staged.stdout);
    return (
      json.stageId ??
      Object.values(json).find(
        (v) => v && typeof v === 'object' && 'stageId' in v,
      )?.stageId
    );
  } catch {
    // Not JSON after all — the raw output above is the record, and the id is in it.
    return undefined;
  }
};

if (dryRun) {
  console.log(
    '\n=== DRY RUN (--dry-run): nothing will be written, pushed, tagged or staged ===',
  );
}

if (publish) {
  // 6–7. HEAD is the release commit as `main` holds it — the squash of the release pull
  //      request, which `release.yml` checks out. It is told by its own diff: the manifest's
  //      version moved in it, and no tag carries that version yet.
  const versionAt = (rev) =>
    JSON.parse(out('git', ['show', `${rev}:${manifest}`])).version;
  const version = versionAt('HEAD');
  const tag = `components@${version}`;
  const head = out('git', ['rev-parse', 'HEAD']);
  if (versionAt('HEAD^') === version)
    fail(
      `${head} is not a release commit: the manifest says ${version} before it too. ` +
        'A release begins with the prepare run, and its pull request merged into main.',
    );
  if (out('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]))
    fail(`${tag} is already on the remote: ${version} has been published.`);
  // The release branch records what the prepare run counted: one commit on the `main` it was
  // cut from. `main` requires checks, not an up-to-date branch, so a squash can land on a
  // later `main` — and the merges in between would go out under the tag, missing from the
  // CHANGELOG and unseen by the stamp. Their commit is then the squash's parent and not the
  // branch's, and the release is refused.
  const branch = `release/${version}`;
  if (!out('git', ['ls-remote', '--heads', 'origin', branch]))
    fail(
      `${branch} is not on the remote, and it is what tells the publish run which main the ` +
        'release was prepared on. It is deleted by the publish run, not before.',
    );
  execFileSync('git', ['fetch', '--quiet', 'origin', `refs/heads/${branch}`]);
  const cutFrom = out('git', ['rev-parse', 'FETCH_HEAD^']);
  const mergedOn = out('git', ['rev-parse', 'HEAD^']);
  if (cutFrom !== mergedOn)
    fail(
      `${head} was merged onto ${mergedOn}, but ${branch} is one commit on ${cutFrom}: what ` +
        'lies between them would be released without a CHANGELOG entry or a stamp. Revert the ' +
        `release commit on main, delete ${branch}, and run prepare again.`,
    );
  requireGreen(head);

  // The sources are already stamped — the prepare run did it, and CI went green on them — so
  // the gate holds the artifact to `--release` in a dry run too.
  run(['nx', 'schematics', 'components']);
  console.log('\n> node libs/components/check-package.mjs --release');
  execFileSync('node', ['libs/components/check-package.mjs', '--release'], {
    stdio: 'inherit',
  });

  // The stage first: it is the one step invisible until a person acts, so a failure here
  // leaves nothing public, and a failure after it leaves a stage nobody approves.
  const stageId = stage({ force: false });

  // The entry the prepare run rendered, as the CHANGELOG on this commit holds it — the text
  // Nx gave the GitHub Release while it created one.
  const changelog = readFileSync('libs/components/CHANGELOG.md', 'utf8');
  const title = new RegExp(
    `^## ${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?= |$)`,
    'm',
  );
  const from = changelog.search(title);
  if (from < 0) fail(`The CHANGELOG has no entry for ${version}.`);
  const after = changelog.slice(from + 3).search(/^## /m);
  const notes = changelog
    .slice(from, after < 0 ? undefined : from + 3 + after)
    .trim();

  const { name } = JSON.parse(
    readFileSync(`${packageRoot}/package.json`, 'utf8'),
  );
  if (dryRun) {
    say(
      `Dry run: ${name}@${version} would be staged from ${head}, then ${tag} pushed on it and ` +
        `released with the CHANGELOG's entry (${notes.split('\n').length} lines).`,
    );
  } else {
    // Only the tag goes to the remote — the ruleset on `main` does not reach it, and the
    // commit is already there. From here on the stage is up, so a failure is finished by
    // hand rather than by a second run, which would stage the same version again.
    const byHand = (what, steps) => (error) =>
      fail(
        `${what} failed after the stage went up (${error.message.split('\n')[0]}). Do not run ` +
          `publish again; finish by hand, with the CHANGELOG's entry for ${version} as notes:\n` +
          steps.map((step) => `    ${step}`).join('\n'),
      );
    const release = `gh release create ${tag} --verify-tag --title ${tag} --notes-file <entry>`;
    try {
      execFileSync('git', ['tag', '--annotate', tag, '--message', tag], {
        stdio: 'inherit',
      });
      execFileSync('git', ['push', 'origin', `refs/tags/${tag}`], {
        stdio: 'inherit',
      });
    } catch (error) {
      byHand('The tag', [
        `git tag --annotate ${tag} --message ${tag} ${head}`,
        `git push origin refs/tags/${tag}`,
        release,
      ])(error);
    }
    try {
      out(
        'gh',
        [
          'release',
          'create',
          tag,
          '--verify-tag',
          '--title',
          tag,
          '--notes-file',
          '-',
        ],
        notes,
      );
    } catch (error) {
      byHand('The GitHub Release', [release])(error);
    }
    // The branch has said what it had to; a leftover one would stop the next prepare run.
    execFileSync('git', ['push', '--quiet', 'origin', '--delete', branch], {
      stdio: 'inherit',
    });
    say(
      `${name}@${version} is staged on npm${stageId ? ` (stage id \`${stageId}\`)` : ''}. ` +
        `${tag} and its GitHub Release are out; the version reaches consumers once a ` +
        'maintainer approves it with 2FA — on npmjs.com, or:\n\n' +
        `    npm stage list ${name}\n    npm stage approve <id>\n`,
    );
  }
  process.exit(0);
}

requireGreen(out('git', ['rev-parse', 'HEAD']));

// 1. Version. Commit deliberately deferred — it is to cover the rewritten constant, the
//    re-rendered report and the CHANGELOG too, and those appear only in steps 2, 3 and 5.
const { workspaceVersion, projectsVersionData } = await releaseVersion({
  specifier,
  dryRun,
  verbose,
  firstRelease,
  gitCommit: false,
  gitTag: false,
  // Staged, not committed: the commit comes in step 5 and has to carry the manifest as well
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
const branch = `release/${version}`;
// A branch left by an earlier prepare is a release in flight, or one that failed after its
// push; either way a second commit for the same version is not what it needs.
if (out('git', ['ls-remote', '--heads', 'origin', branch]))
  fail(
    `${branch} is already on the remote. Finish that release, or close its pull request ` +
      'and delete the branch before preparing again.',
  );

// 2. The constant in the code follows the manifest. In a dry run the manifest was left
//    alone, so the stamp is a no-op here and the artifact stays consistent.
run(['nx', 'stamp-version', 'components']);
// The constant goes into the index beside the manifest, for the same commit (lesson-220) —
// and so does every source the stamp dated: `-u` takes the tracked files under the library
// that the bump and the stamp rewrote (the manifest, the constant, the `@since next` lines
// that became the version — decision 0080), and nothing untracked. Skipped in a dry run,
// which wrote nothing to add.
if (!dryRun)
  execFileSync('git', ['add', '-u', 'libs/components'], { stdio: 'inherit' });

// 3. What else reads the manifest is re-rendered now, for the same commit. `docs/acr.md`
//    carries the version in its product line, and the release of 0.2.0 left it a version
//    behind: the first CI after the tag went red on `check-acr`, six and a half hours later,
//    on a pull request about something else (lesson-243). `--write` rewrites the report in
//    place in a dry run too: on a clean tree the bytes are the same, since the manifest did
//    not move, and nothing is added — so the rehearsal proves that the step runs, not that
//    it re-renders with the new version; a dirty `claims.json` would be rendered, dry or not.
console.log('\n> node tools/check-acr.mjs --write');
execFileSync('node', ['tools/check-acr.mjs', '--write'], { stdio: 'inherit' });
if (!dryRun) execFileSync('git', ['add', 'docs/acr.md'], { stdio: 'inherit' });

// 4. Only now the build — the sources already carry the new version. We call
//    `schematics`, because that target depends on `build` and adds `ng add` plus the
//    migration collection to dist. The gate runs directly rather than through an nx
//    target, because `--release` sharpens it with the metadata npm requires (among them
//    `repository`, without which there is no provenance). Day to day that condition only
//    warns: a missing remote repository is not a defect in the code. A dry run hands the
//    gate `--rehearsal` instead — the same edge on the metadata, but the `@since next` no
//    stamp has dated (a dry run writes no manifest, so there is nothing to stamp) is said
//    as a warning naming what the real run will date, not as the refusal it is in a
//    release: held to `--release`, the first rehearsal after the word reached `main` ended
//    here, before the changelog and the stage it exists to show (`lesson-242`).
//    `schematics` depends on `citations` too, so the one invocation also turns the JSDoc's
//    citations into the site's addresses (decision 0078) before the gate reads them. ONE
//    invocation on purpose: `build` owns the whole of dist, and a second `nx` run restoring
//    it from the cache wipes what the first wrote inside (project.json, `// schematics`).
run(['nx', 'schematics', 'components']);
const gate = dryRun ? '--rehearsal' : '--release';
console.log(`\n> node libs/components/check-package.mjs ${gate}`);
execFileSync('node', ['libs/components/check-package.mjs', gate], {
  stdio: 'inherit',
});

// 5. CHANGELOG from conventional commits, and the commit — no tag, no push, no GitHub
//    Release: `main` refuses a commit without its checks (decision 0094), and `git push
//    --atomic`, which Nx uses, would take the tag down with it. The renderer
//    (`tools/changelog-renderer.mjs`, decision 0079) renders the first release as a
//    measurement and every later one as the list; this is how it learns which it is.
process.env.PCT_FIRST_RELEASE = firstRelease ? '1' : '0';
await releaseChangelog({
  versionData: projectsVersionData,
  version: workspaceVersion,
  dryRun,
  verbose,
  firstRelease,
  gitCommit: true,
  gitTag: false,
  gitPush: false,
  createRelease: false,
});

if (dryRun) {
  // The rehearsal goes on to the stage, because the OIDC exchange is the one finding a
  // dry run on the runner can make about the publish run, and it should come before the
  // pull request it would otherwise follow.
  stage({ force: true });
  say(
    `Dry run: ${branch} would carry the release commit of ${version}, in a pull request to ` +
      'main. Nothing was written, pushed or staged; the rehearsal packed the artifact at its ' +
      `current version, ${projectsVersionData.components.currentVersion}, because a dry run ` +
      'writes no manifest.',
  );
} else {
  // The branch, its CI and the pull request. CI is dispatched, not waited for: a push made
  // with `GITHUB_TOKEN` starts no workflow and neither does a pull request it opens
  // (lesson-243), and a dispatch is one of the two events the token may raise. The run lands
  // on the branch's head, so its checks are the pull request's.
  // Nx's subject names no version for an independent project; the squash takes the title.
  const subject = `${out('git', ['log', '-1', '--format=%s'])} ${version}`;
  execFileSync('git', ['push', 'origin', `HEAD:refs/heads/${branch}`], {
    stdio: 'inherit',
  });
  execFileSync('gh', ['workflow', 'run', 'ci.yml', '--ref', branch], {
    stdio: 'inherit',
  });
  const url = out(
    'gh',
    [
      'pr',
      'create',
      '--base',
      'main',
      '--head',
      branch,
      '--title',
      subject,
      '--body-file',
      '-',
    ],
    `The release commit of \`${version}\`, prepared by \`release.yml\` (decision 0094): ` +
      'the manifest, the stamped sources, `docs/acr.md` and the CHANGELOG entry.\n\n' +
      '1. **Squash-merge it as a person** once CI is green. A merge by the bot starts no CI on ' +
      '`main`, and the publish run needs that run.\n' +
      '2. Once CI is green on `main`, dispatch **Release** with `step: publish` and `dry_run` ' +
      'off: it stages the package, then tags the merged commit and creates the GitHub Release.\n',
  );
  say(
    `The release commit of ${version} is on ${branch}, in ${url}, with CI dispatched on it. ` +
      'Squash-merge it once green, then dispatch Release with `step: publish`.',
  );
}
