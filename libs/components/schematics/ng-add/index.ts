// A type-only import: the schematics runtime is supplied by the Angular CLI that runs them.
// Were `@angular-devkit/schematics` to land in the package dependencies, every consumer of a
// component library would drag in build tooling — and `req-project-dependencies` allows one
// runtime dependency, which is CDK.
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * `ng add @pacit/components`.
 *
 * It does the one thing a consumer will not guess from the documentation and without which the
 * library looks broken: it wires two stylesheets into the build configuration. Without the skin
 * the components reference custom properties that do not exist and render with no appearance —
 * quietly, because a missing `var()` definition is not an error but a return to the initial
 * value (the same class of defect as `lesson-36`). Without `overlay-prebuilt.css` the select
 * panel appears at a random place on the page.
 *
 * What it deliberately does NOT do: it adds no providers, modifies no application code and
 * installs no dependencies. `@angular/cdk` is a peer dependency, so the package manager will
 * report its absence itself and do it more precisely.
 */
const STYLES = [
  '@pacit/components/themes/pct.css',
  '@angular/cdk/overlay-prebuilt.css',
];

const WORKSPACE_FILES = ['/angular.json', '/workspace.json'];

interface WorkspaceProject {
  architect?: Record<string, { options?: { styles?: unknown } }>;
  targets?: Record<string, { options?: { styles?: unknown } }>;
}

interface WorkspaceConfig {
  defaultProject?: string;
  projects?: Record<string, WorkspaceProject>;
}

/** Manual instructions for when the configuration cannot be touched safely. */
const explainManually = (context: SchematicContext, reason: string): void => {
  context.logger.warn(
    `\n@pacit/components: ${reason}\n` +
      `Add these stylesheets to your build's "styles" by hand:\n` +
      STYLES.map((s) => `  - ${s}`).join('\n') +
      `\n`,
  );
};

export function ngAdd(options: { project?: string } = {}): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const path = WORKSPACE_FILES.find((p) => tree.exists(p));
    if (!path) {
      // An Nx workspace keeps its configuration in a per-project project.json rather than in
      // one angular.json. Guessing which file and which target ends in a quiet change in the
      // wrong place — better to say so outright.
      explainManually(
        context,
        'no angular.json found (an Nx workspace, or an unusual layout).',
      );
      return tree;
    }

    const raw = tree.readText(path);
    let workspace: WorkspaceConfig;
    try {
      workspace = JSON.parse(raw) as WorkspaceConfig;
    } catch {
      explainManually(context, `could not read ${path}.`);
      return tree;
    }

    const projects = workspace.projects ?? {};
    const name =
      options.project ?? workspace.defaultProject ?? Object.keys(projects)[0];
    const project = name ? projects[name] : undefined;

    if (!project) {
      explainManually(context, `no project ${name ?? '(none)'} found.`);
      return tree;
    }

    const build = (project.architect ?? project.targets ?? {})['build'];
    if (!build) {
      explainManually(context, `project ${name} has no build target.`);
      return tree;
    }

    build.options ??= {};
    const styles = Array.isArray(build.options.styles)
      ? [...(build.options.styles as unknown[])]
      : [];

    // Order matters: the skin has to stand BEFORE the application's stylesheets, so that a
    // token override at the consumer's beats the default value. Hence the insertion at the
    // front — but only of what is not there yet, because a repeated `ng add` must not duplicate
    // entries.
    const missing = STYLES.filter(
      (style) =>
        !styles.some((existing) =>
          typeof existing === 'string'
            ? existing === style
            : (existing as { input?: string })?.input === style,
        ),
    );

    if (!missing.length) {
      context.logger.info(
        `@pacit/components: the styles are already wired into project ${name} — no change.`,
      );
      return tree;
    }

    build.options.styles = [...missing, ...styles];
    tree.overwrite(path, JSON.stringify(workspace, null, 2) + '\n');

    context.logger.info(
      `@pacit/components: added to the styles of project ${name}:\n` +
        missing.map((s) => `  + ${s}`).join('\n'),
    );

    return tree;
  };
}
