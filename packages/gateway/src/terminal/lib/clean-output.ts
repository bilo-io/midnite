/**
 * Turn raw PTY capture into text fit for persistence and synthesis. PTYs merge
 * stdout/stderr and carry ANSI escapes, CR-based spinner redraws, and CRLF line
 * endings — none of which belong in a prompt.
 */

// CSI (colors/cursor), OSC (titles; BEL- or ST-terminated), and the remaining
// single-char ESC sequences (charset selection, keypad modes, ...).
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '');
}

/**
 * Full cleaning pass: strip ANSI, normalize CRLF, collapse CR-overwritten
 * spinner lines down to their final frame, drop other control chars, and trim.
 */
export function cleanPtyOutput(text: string): string {
  const stripped = stripAnsi(text).replace(/\r\n/g, '\n');
  return stripped
    .split('\n')
    .map((line) => {
      // A bare \r rewinds to column 0: only what follows the last one survives.
      const lastCr = line.lastIndexOf('\r');
      const visible = lastCr === -1 ? line : line.slice(lastCr + 1);
      // eslint-disable-next-line no-control-regex
      return visible.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trimEnd();
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
