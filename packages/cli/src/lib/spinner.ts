import ora from 'ora';

import { isInteractive } from './brand.js';

// Errors whose message a spinner has already printed (via `.fail`), so the
// top-level handler doesn't print it a second time.
const reportedErrors = new WeakSet<object>();

/** Whether `err`'s message was already surfaced to the user by a failed spinner. */
export function wasReported(err: unknown): boolean {
  return typeof err === 'object' && err !== null && reportedErrors.has(err);
}

/**
 * Run async work behind an ora spinner. When not interactive (piped / non-TTY /
 * `NO_COLOR`) there are no spinner frames — but an optional `succeed` message
 * still prints (plain) so a mutation's confirmation isn't lost when piped, while
 * read commands (no `succeed`) stay silent and render their own output. When
 * interactive, `succeed` becomes a `✓` line and a bare call clears on resolve. On
 * failure the spinner shows a `✗` + the error message, marked {@link wasReported}
 * so the top-level handler doesn't print it twice.
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  opts: { succeed?: (result: T) => string } = {},
): Promise<T> {
  if (!isInteractive()) {
    const result = await fn();
    if (opts.succeed) console.log(opts.succeed(result));
    return result;
  }

  const spinner = ora(text).start();
  try {
    const result = await fn();
    if (opts.succeed) spinner.succeed(opts.succeed(result));
    else spinner.stop();
    return result;
  } catch (err) {
    spinner.fail(err instanceof Error ? err.message : String(err));
    if (typeof err === 'object' && err !== null) reportedErrors.add(err);
    throw err;
  }
}
