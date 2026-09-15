// The other half of the control. Everything here resolves — `document` is handed to the
// callback by the browser the script drives, not by the runtime the script itself runs in.
// A reader that reports this one reports the whole battery, and would be turned off in a day.
export const focused = (page) =>
  page.evaluate(() => document.activeElement?.tagName ?? null);
