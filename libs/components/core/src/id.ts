let counter = 0;

/** Generator stabilnych, unikalnych id do powiązań ARIA (wym-api-6). */
export function nextPctId(prefix = 'pct'): string {
  return `${prefix}-${++counter}`;
}
