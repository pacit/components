// A prepared input to the call reader of `check-tools` point 6: the module the asking `.ts`
// loads, which asks git nothing and loads that `.ts` back. A caller is a module that asks
// itself, not one that reaches a caller, and the gate's `CALLS` leaves this one out. Nothing
// runs this file.
import './a-hop-that-asks.ts';

export const quiet = 'reached through a caller, and no caller';
