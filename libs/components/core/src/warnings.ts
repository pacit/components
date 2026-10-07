import {
  computed,
  inject,
  linkedSignal,
  Signal,
  untracked,
} from '@angular/core';
import {
  createManagedMetadataKey,
  createMetadataKey,
  FieldState,
  form,
  FORM_FIELD,
  LogicFn,
  metadata,
  MetadataReducer,
  PathKind,
  Schema,
  SchemaPath,
  SchemaPathRules,
  ValidationError,
  ValidationResult,
} from '@angular/forms/signals';

/**
 * One warning on a field: the platform's own `ValidationError`, as a validator returns it and
 * as a shadow form's `errorSummary()` lists it. A shadow's entry carries the shadow's
 * `fieldTree`, which is why the tree is optional here and the chrome follows it nowhere
 * ([0087](../../../../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md)).
 *
 * @since next
 */
export type PctWarning = ValidationError.WithOptionalFieldTree;

/**
 * The schemas `pctWarn(path, schema(…))` wrote for a path — the second, private list key.
 * Read once, untracked, when the field's node is created: a schema is a constant of the
 * form's definition, not a value that moves.
 *
 * Both keys are made at the top of the module and marked PURE, because `./core` is the chunk
 * every entrypoint shares: without the annotation a bundler keeps the call — it cannot know
 * the platform's factory has no side effect — and a button-only application carries the key,
 * the shadow builder and `form()` from `@angular/forms/signals` behind it. Measured by
 * `check-bundle` on landing: 456 B on every entrypoint and a new external on all of them,
 * gone with the comments — the inner call needs its own, an argument being evaluated for
 * its side effects even when the call around it is dropped.
 */
const WARNING_SCHEMAS = /* @__PURE__ */ createMetadataKey(
  /* @__PURE__ */ MetadataReducer.list<Schema<unknown>>(),
);

/** What a validator returns, as a list: nothing, one error, or many. */
function toList(result: ValidationResult): readonly ValidationError[] {
  if (result == null) return [];
  return 'kind' in result ? [result] : result;
}

/**
 * Every warning on a field, as one list the form does not grade: what the logic form
 * computed on the real field, and what the shadow forms — one per warning schema, over the
 * field's own value — hold as errors.
 *
 * A managed key, so that the platform runs `create` once per field node, inside that node's
 * injection context — which is what `form()` needs, and what `validateAsync` uses for its
 * resource. The shadow dies with the node: an array item removed destroys the node's
 * injector, and the shadow's effects with it. A field nobody warned has no rule for this key,
 * so the platform creates no reader and no shadow for it, and `metadata(PCT_WARNINGS)` on it
 * is `undefined` ([0087](../../../../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md)).
 *
 * @example
 * const f = form(model, (p) => {
 *   pctWarn(p.amount, ({ value }) => (value() > 10_000 ? { kind: 'big' } : undefined));
 * });
 * f.amount().metadata(PCT_WARNINGS)?.(); // [{ kind: 'big' }] at 20 000, [] at 5
 *
 * @since next
 */
export const PCT_WARNINGS = /* @__PURE__ */ createManagedMetadataKey(
  (
    state: FieldState<unknown>,
    own: Signal<readonly ValidationError[]>,
  ): Signal<readonly PctWarning[]> => {
    const schemas = untracked(() => state.metadata(WARNING_SCHEMAS)?.() ?? []);
    const shadows = schemas.map((shadow) =>
      form(
        linkedSignal(() => state.value()),
        shadow,
      ),
    );
    return computed(() => [
      ...own(),
      ...shadows.flatMap((shadow) => shadow().errorSummary()),
    ]);
  },
  {
    getInitial: (): readonly ValidationError[] => [],
    reduce: (acc, item: ValidationResult) => acc.concat(toList(item)),
  },
);

/**
 * Warns where the form does not forbid: a verdict without a veto
 * ([0087](../../../../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md)).
 *
 * It takes what `validate()` takes — a logic function over the field's context, which reads
 * `valueOf(p.other)` like any validator — or what `apply()` takes, a `Schema` from
 * `schema()`, so the platform's own validators warn as they are. Either way the field stays
 * `valid()`, `aria-invalid` stays off, `submit()` runs, and nothing is written to the native
 * control: a `required` or a `min` inside a warning schema is graded by a shadow form over
 * the field's value, never by the real one. The result lands in `PCT_WARNINGS`, which a
 * control reads beside its `errors` and the chrome draws in the warning tone once the field
 * is touched.
 *
 * A schema sees the warned path alone, so a warning that reads two fields is written in the
 * logic form. The two shapes are told apart at run time: a `Schema` is an object, a validator
 * a function.
 *
 * @example
 * required(p.email);                 // an error: the field is invalid
 * pctWarn(p.phone, schema(required)); // a warning: the field is valid, the line says so
 * pctWarn(p.amount, big);             // the function `validate(p.amount, big)` would take
 * pctWarn(p.end, ({ value, valueOf }) =>
 *   valueOf(p.start) > value() ? { kind: 'order', message: 'Ends before it starts' } : undefined,
 * );
 *
 * @since next
 */
export function pctWarn<TValue, TPathKind extends PathKind = PathKind.Root>(
  path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
  what: LogicFn<TValue, ValidationResult, TPathKind> | Schema<TValue>,
): void {
  if (typeof what === 'function') {
    metadata(path, PCT_WARNINGS, what);
    return;
  }
  // `Schema` is contravariant in its model, so one list cannot hold schemas of every field's
  // type as themselves. It holds them as schemas over `unknown`, which is what each one is at
  // the only place it is ever run: over the value of the field it was written for.
  metadata(path, WARNING_SCHEMAS, () => what as Schema<unknown>);
  // A managed key is created only on a node that has a rule for it — this empty rule is what
  // makes the platform build the shadows above for a field that has only schema warnings.
  metadata(path, PCT_WARNINGS, () => undefined);
}

/**
 * The list a control draws and hands to the chrome: its `warnings` input when the template
 * binds one, else what `pctWarn()` wrote for the field the control is bound to — read off
 * the `[formField]` directive standing on the same element — else nothing
 * ([0087](../../../../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md)).
 *
 * Called from a control's field initialiser, that being an injection context: the directive
 * is looked up on the element itself, because a parent's form field says nothing about this
 * control. An empty list bound through the input is an answer, not an absence — an
 * application with a sentence of its own, or none, says so and the form's list is not read.
 *
 * @since next
 */
export function pctFieldWarnings(
  bound: Signal<readonly PctWarning[] | undefined>,
): Signal<readonly PctWarning[]> {
  const field = inject(FORM_FIELD, { self: true, optional: true });
  return computed(
    () => bound() ?? field?.state().metadata(PCT_WARNINGS)?.() ?? [],
  );
}
