// Import wyłącznie typowy: runtime schematics dostarcza Angular CLI, które je
// uruchamia. Gdyby `@angular-devkit/schematics` trafiło do zależności pakietu,
// każdy konsument biblioteki komponentów ciągnąłby narzędzia budowania —
// a `wym-projekt-zaleznosci` dopuszcza jedną zależność runtime i jest nią CDK.
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * `ng add @pacit/components`.
 *
 * Robi jedną rzecz, której konsument nie zgadnie z dokumentacji, a bez której
 * biblioteka wygląda na zepsutą: dopina dwa arkusze do konfiguracji builda.
 * Bez skórki komponenty odwołują się do nieistniejących custom properties
 * i renderują się bez wyglądu — cicho, bo brak definicji `var()` nie jest
 * błędem, tylko powrotem do wartości początkowej (ta sama klasa wady co
 * `lekcja-36`). Bez `overlay-prebuilt.css` panel selecta pojawia się
 * w losowym miejscu strony.
 *
 * Czego świadomie NIE robi: nie dopisuje providerów, nie modyfikuje kodu
 * aplikacji i nie instaluje zależności. `@angular/cdk` jest peer dependency,
 * więc menedżer pakietów zgłosi jego brak sam i zrobi to dokładniej.
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

/** Ręczna instrukcja na wypadek, gdy konfiguracji nie da się bezpiecznie ruszyć. */
const explainManually = (context: SchematicContext, reason: string): void => {
  context.logger.warn(
    `\n@pacit/components: ${reason}\n` +
      `Dopisz te arkusze do "styles" swojego builda ręcznie:\n` +
      STYLES.map((s) => `  - ${s}`).join('\n') +
      `\n`,
  );
};

export function ngAdd(options: { project?: string } = {}): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const path = WORKSPACE_FILES.find((p) => tree.exists(p));
    if (!path) {
      // Workspace Nx trzyma konfigurację w project.json per projekt, a nie
      // w jednym angular.json. Zgadywanie, który plik i który target, kończy
      // się cichą zmianą nie tam, gdzie trzeba — lepiej powiedzieć wprost.
      explainManually(
        context,
        'nie znalazłem angular.json (workspace Nx albo nietypowy układ).',
      );
      return tree;
    }

    const raw = tree.readText(path);
    let workspace: WorkspaceConfig;
    try {
      workspace = JSON.parse(raw) as WorkspaceConfig;
    } catch {
      explainManually(context, `nie udało się odczytać ${path}.`);
      return tree;
    }

    const projects = workspace.projects ?? {};
    const name =
      options.project ?? workspace.defaultProject ?? Object.keys(projects)[0];
    const project = name ? projects[name] : undefined;

    if (!project) {
      explainManually(context, `nie znalazłem projektu ${name ?? '(brak)'}.`);
      return tree;
    }

    const build = (project.architect ?? project.targets ?? {})['build'];
    if (!build) {
      explainManually(context, `projekt ${name} nie ma targetu build.`);
      return tree;
    }

    build.options ??= {};
    const styles = Array.isArray(build.options.styles)
      ? [...(build.options.styles as unknown[])]
      : [];

    // Kolejność ma znaczenie: skórka musi stać PRZED arkuszami aplikacji,
    // żeby nadpisanie tokenu u konsumenta wygrywało z wartością domyślną.
    // Wstawiamy więc na początek, ale tylko to, czego jeszcze nie ma —
    // ponowne `ng add` nie może zdublować wpisów.
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
        `@pacit/components: style są już podpięte w projekcie ${name} — bez zmian.`,
      );
      return tree;
    }

    build.options.styles = [...missing, ...styles];
    tree.overwrite(path, JSON.stringify(workspace, null, 2) + '\n');

    context.logger.info(
      `@pacit/components: dopisano do styles projektu ${name}:\n` +
        missing.map((s) => `  + ${s}`).join('\n'),
    );

    return tree;
  };
}
