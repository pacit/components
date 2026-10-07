import {
  ApplicationRef,
  Component,
  computed,
  DestroyRef,
  Directive,
  inject,
  provideZonelessChangeDetection,
  resource,
  signal,
  Signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  applyEach,
  form,
  FORM_FIELD,
  FormField,
  LogicFn,
  max,
  min,
  required,
  REQUIRED,
  schema,
  SchemaFn,
  submit,
  validate,
  validateAsync,
  ValidationError,
  ValidationResult,
} from '@angular/forms/signals';
import { PCT_WARNINGS, pctFieldWarnings, pctWarn } from './warnings';

/**
 * The warning channel of a field, measured on the platform it stands on
 * ([0087](../../../../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md)). These
 * are the seven cases of the probe that decided the record, landed as the specs of `core` —
 * and the first one is the negative control the requirement names: asserted the other way
 * round (`invalid()` true on the warned field) the probe went red, 1 failed and 6 passed.
 */

interface Order {
  amount: number;
  phone: string;
  start: number;
  end: number;
  items: number[];
}

/** A validator as an application writes one for `validate()`. */
const big: LogicFn<number, ValidationResult> = ({ value }) =>
  value() > 10_000 ? { kind: 'big', message: 'Unusually large' } : undefined;

function build(schemaFn: SchemaFn<Order>, init: Partial<Order> = {}) {
  const model = signal<Order>({
    amount: 1,
    phone: '',
    start: 1,
    end: 2,
    items: [1],
    ...init,
  });
  const f = TestBed.runInInjectionContext(() => form(model, schemaFn));
  return { model, f };
}

const kinds = (s: Signal<readonly ValidationError[]> | undefined) =>
  s?.().map((e) => e.kind);

describe('pctWarn — a verdict without a veto', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('one validator, as an error on one field and as a warning on another', () => {
    const { model, f } = build((p) => {
      validate(p.start, big);
      pctWarn(p.amount, big);
    });
    model.update((m) => ({ ...m, amount: 20_000, start: 20_000 }));
    expect(kinds(f.start().errors)).toEqual(['big']);
    expect(f.start().invalid()).toBe(true);

    // The negative control (`req-api-warning`): asserted `true`, the case is red.
    expect(f.amount().invalid()).toBe(false);
    expect(f.amount().errors()).toEqual([]);
    expect(f.amount().valid()).toBe(true);
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual(['big']);
    expect(f.amount().metadata(PCT_WARNINGS)?.()[0]?.message).toBe(
      'Unusually large',
    );
    // The summary of the form is the error channel, and the warning is not in it.
    expect(
      f()
        .errorSummary()
        .map((e) => e.kind),
    ).toEqual(['big']);
    // A field nobody warned carries nothing — no key, no shadow.
    expect(f.phone().metadata(PCT_WARNINGS)).toBeUndefined();

    model.update((m) => ({ ...m, amount: 5 }));
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual([]);
  });

  it('submit() runs the action over a warning, and not over an error', async () => {
    const { model, f } = build(
      (p) => {
        pctWarn(p.amount, big);
        required(p.phone);
      },
      { amount: 20_000, phone: 'x' },
    );
    let ran = 0;
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual(['big']);
    expect(await submit(f, async () => void ran++)).toBe(true);
    expect(ran).toBe(1);

    model.update((m) => ({ ...m, phone: '' }));
    expect(await submit(f, async () => void ran++)).toBe(false);
    expect(ran).toBe(1);
  });

  it("the platform's own validators as warnings: schema(required), schema(min)", () => {
    const { model, f } = build((p) => {
      pctWarn(p.phone, schema(required));
      pctWarn(
        p.amount,
        schema((a) => {
          min(a, 100);
        }),
      );
      min(p.start, 100);
    });
    expect(kinds(f.phone().metadata(PCT_WARNINGS))).toEqual(['required']);
    expect(f.phone().valid()).toBe(true);
    // The REQUIRED metadata lives on the shadow, so the real field is not marked required.
    expect(f.phone().metadata(REQUIRED)).toBeUndefined();

    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual(['min']);
    expect(f.amount().valid()).toBe(true);
    // ... and the native `min` is not written for a warning, while it is for the error.
    expect(f.amount().min).toBeUndefined();
    expect(f.start().min?.()).toBe(100);

    model.update((m) => ({ ...m, amount: 100, phone: '5' }));
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual([]);
    expect(kinds(f.phone().metadata(PCT_WARNINGS))).toEqual([]);
  });

  it('two pctWarn on one path accumulate; a cross-field warning reads the real form', () => {
    const { model, f } = build(
      (p) => {
        pctWarn(p.amount, big);
        pctWarn(
          p.amount,
          schema((a) => {
            min(a, 100);
          }),
        );
        pctWarn(p.end, ({ value, valueOf }) =>
          valueOf(p.start) > value() ? { kind: 'order' } : undefined,
        );
      },
      { amount: 20_000, start: 5, end: 2 },
    );
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual(['big']);
    model.update((m) => ({ ...m, amount: 50 }));
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual(['min']);
    model.update((m) => ({ ...m, amount: 50_000 }));
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual(['big']);

    expect(kinds(f.end().metadata(PCT_WARNINGS))).toEqual(['order']);
    model.update((m) => ({ ...m, start: 1 }));
    expect(kinds(f.end().metadata(PCT_WARNINGS))).toEqual([]);
  });

  /**
   * The pair the probe left for the landing spec: two warnings that CAN hold at once on one
   * path, from a logic rule, a logic rule returning a list, and a schema — in rule order, the
   * logic form first and the shadows after it.
   */
  it('several warnings on one path stand together, logic rules first and the shadows after', () => {
    const { model, f } = build(
      (p) => {
        pctWarn(p.amount, big);
        pctWarn(
          p.amount,
          schema((a) => {
            max(a, 1_000);
          }),
        );
        pctWarn(p.amount, ({ value }) =>
          value() % 2 === 1
            ? [
                { kind: 'odd', message: 'An odd amount' },
                { kind: 'round', message: 'Round it' },
              ]
            : null,
        );
      },
      { amount: 20_001 },
    );
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual([
      'big',
      'odd',
      'round',
      'max',
    ]);
    expect(f.amount().valid()).toBe(true);

    model.update((m) => ({ ...m, amount: 20_000 }));
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual(['big', 'max']);
    model.update((m) => ({ ...m, amount: 7 }));
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual(['odd', 'round']);
    model.update((m) => ({ ...m, amount: 8 }));
    expect(kinds(f.amount().metadata(PCT_WARNINGS))).toEqual([]);
  });

  /**
   * One shadow per item, built when the item's node is. What happens when the item goes is
   * measured here as the platform has it, not as the record first wrote it: the real node's
   * injector is destroyed, and with it the shadow's management effect — but an `R3Injector`
   * does not destroy its children, and a shadow node's injector is `Injector.create({parent})`
   * in the compiled chunk, so an async rule's resource inside a shadow stays registered until
   * the page goes. The platform's own `validateAsync` on a form whose component is destroyed
   * behaves the same way (0087, amended 2026-10-07). Sync rules are computeds nobody reads
   * any more.
   */
  it('an item of a list gets a shadow of its own, built once per item', async () => {
    let created = 0;
    let destroyed = 0;
    const { model, f } = build(
      (p) => {
        applyEach(p.items, (item) =>
          pctWarn(
            item,
            schema((i) => {
              max(i, 10);
              // A witness of the shadow node's creation: the platform runs an async rule's
              // factory in that node's own injection context, once, when the node is made.
              validateAsync(i, {
                params: ({ value }) => value(),
                factory: (params) => {
                  created++;
                  inject(DestroyRef).onDestroy(() => destroyed++);
                  return resource({ params, loader: async () => false });
                },
                onSuccess: () => undefined,
                onError: () => undefined,
              });
            }),
          ),
        );
      },
      { items: [1, 20] },
    );
    expect(kinds(f.items[0]().metadata(PCT_WARNINGS))).toEqual([]);
    expect(kinds(f.items[1]().metadata(PCT_WARNINGS))).toEqual(['max']);
    expect(created).toBe(2);

    model.update((m) => ({ ...m, items: [1, 20, 30] }));
    expect(kinds(f.items[2]().metadata(PCT_WARNINGS))).toEqual(['max']);
    expect(created).toBe(3);

    model.update((m) => ({ ...m, items: [1] }));
    await TestBed.inject(ApplicationRef).whenStable();
    expect(kinds(f.items[0]().metadata(PCT_WARNINGS))).toEqual([]);
    expect(created).toBe(3);
    // The measured cost (0087): the shadow's own injector outlives the item.
    expect(destroyed).toBe(0);
  });

  it('an async rule inside a warning schema settles into the same list', async () => {
    const { model, f } = build(
      (p) => {
        pctWarn(
          p.phone,
          schema((ph) => {
            validateAsync(ph, {
              params: ({ value }) => value(),
              factory: (params) =>
                resource({
                  params,
                  loader: async ({ params }) => params === 'taken',
                }),
              onSuccess: (taken) => (taken ? { kind: 'taken' } : undefined),
              onError: () => undefined,
            });
          }),
        );
      },
      { phone: 'taken' },
    );
    expect(kinds(f.phone().metadata(PCT_WARNINGS))).toEqual([]);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(kinds(f.phone().metadata(PCT_WARNINGS))).toEqual(['taken']);
    expect(f.phone().valid()).toBe(true);
    expect(f.phone().pending()).toBe(false);

    model.update((m) => ({ ...m, phone: 'free' }));
    await TestBed.inject(ApplicationRef).whenStable();
    expect(kinds(f.phone().metadata(PCT_WARNINGS))).toEqual([]);
  });
});

// --- the reader: a control on the bound element ------------------------------------------

/** What a control does: `pctFieldWarnings` over its own `warnings` input. */
@Directive({ selector: '[pctProbeReader]' })
class ProbeReader {
  readonly bound = signal<readonly ValidationError[] | undefined>(undefined);
  readonly warnings = pctFieldWarnings(this.bound);
  /** The platform's own reading beside it, so the two can be compared. */
  private readonly field = inject<FormField<string>>(FORM_FIELD, {
    self: true,
    optional: true,
  });
  readonly platform = computed(
    () => this.field?.state().metadata(PCT_WARNINGS)?.() ?? [],
  );
}

@Component({
  imports: [FormField, ProbeReader],
  template: `
    <input [formField]="f.phone" pctProbeReader />
    <input [formField]="f.note" pctProbeReader />
    <input pctProbeReader />
  `,
})
class Host {
  readonly model = signal({ phone: 'taken', note: '' });
  readonly f = form(this.model, (p) => {
    pctWarn(p.phone, ({ value }) =>
      value() === 'taken' ? { kind: 'taken' } : undefined,
    );
  });
}

describe('pctFieldWarnings — the bound element reads its warnings through FORM_FIELD', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  const readers = () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const [warned, quiet, alone] = fixture.debugElement
      .queryAll(By.directive(ProbeReader))
      .map((el) => el.injector.get(ProbeReader));
    return { fixture, warned, quiet, alone };
  };

  it('a directive beside [formField] sees the list, live', () => {
    const { fixture, warned } = readers();
    expect(warned.warnings().map((e) => e.kind)).toEqual(['taken']);
    expect(warned.warnings()).toEqual(warned.platform());
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input');
    expect(input.getAttribute('aria-invalid')).toBeNull();

    fixture.componentInstance.model.update((m) => ({ ...m, phone: 'free' }));
    fixture.detectChanges();
    expect(warned.warnings()).toEqual([]);
  });

  it('a field nobody warned, and an element with no form field, read as nothing', () => {
    const { quiet, alone } = readers();
    expect(quiet.platform()).toEqual([]);
    expect(quiet.warnings()).toEqual([]);
    expect(alone.warnings()).toEqual([]);
  });

  it('a bound list stands in for the form — an empty one included', () => {
    const { warned, alone } = readers();
    warned.bound.set([{ kind: 'own', message: 'A sentence of its own' }]);
    expect(warned.warnings().map((e) => e.kind)).toEqual(['own']);
    expect(warned.platform().map((e) => e.kind)).toEqual(['taken']);

    // `[]` is an answer and not an absence: the form's list is not read behind it.
    warned.bound.set([]);
    expect(warned.warnings()).toEqual([]);

    warned.bound.set(undefined);
    expect(warned.warnings().map((e) => e.kind)).toEqual(['taken']);

    alone.bound.set([{ kind: 'own' }]);
    expect(alone.warnings().map((e) => e.kind)).toEqual(['own']);
  });
});
