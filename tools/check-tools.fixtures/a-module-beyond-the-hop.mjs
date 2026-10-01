// A prepared input to the import reader of `check-tools` point 5: the module beyond the `.ts`
// hop, reached from the prepared script through a file that is no script and through nothing
// else. The walk has to arrive here, and the gate's `LOADS` says so. Nothing runs this file.
export const beyond = 'reached through a file that is no script';
