/**
 * Środowisko TestBedu dla przebiegu mutacyjnego. Target `test` dostaje je od buildera
 * `@angular/build` za darmo; tutaj trzeba je złożyć ręcznie, tak samo jak robi to
 * `apps/sandbox/src/test-setup.ts`.
 */
import '@angular/compiler';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed();
