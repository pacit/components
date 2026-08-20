import * as button from '@pacit/components/button';
import * as checkbox from '@pacit/components/checkbox';
import * as core from '@pacit/components/core';
import * as dialog from '@pacit/components/dialog';
import * as field from '@pacit/components/field';
import * as icon from '@pacit/components/icon';
import * as radio from '@pacit/components/radio';
import * as select from '@pacit/components/select';
import * as primary from './index';

/**
 * This file exists so that the coverage report covers the WHOLE library, not
 * only the part of it somebody has already tested.
 *
 * Without it the measurement runs on a sample picked by the measured party: v8
 * sees only the modules that actually entered the run, and `coverageInclude`
 * adds the rest only when it can parse them — which it cannot when a file uses
 * `import type` / `export type` (lesson-45). The effect is the opposite of the
 * intuitive one: deleting a test could RAISE coverage, because the whole
 * untested file left the report together with the test.
 *
 * Importing every entrypoint brings its modules into the run, so a file with no
 * test lands in the report near zero instead of dropping out of the denominator.
 * Adding an entrypoint without listing it here fires `check-coverage` (point 2),
 * so this is not a rule anybody has to remember.
 *
 * In passing it is a smoke test of the public surface: every entrypoint has to
 * load and export something.
 */
describe('the public surface of the package', () => {
  const entrypoints = {
    primary,
    core,
    button,
    checkbox,
    dialog,
    field,
    icon,
    radio,
    select,
  };

  for (const [name, mod] of Object.entries(entrypoints))
    it(`entrypoint ${name} loads and exports something`, () => {
      expect(Object.keys(mod).length).toBeGreaterThan(0);
    });
});
