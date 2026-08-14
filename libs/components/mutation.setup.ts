/**
 * TestBed environment for the mutation run. The `test` target gets it from the
 * `@angular/build` builder for free; here it has to be assembled by hand, the same way
 * `apps/sandbox/src/test-setup.ts` does it.
 */
import '@angular/compiler';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed();
