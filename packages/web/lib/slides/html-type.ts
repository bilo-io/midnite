// Helpers for typing out a step's HTML character-by-character without ever
// splitting a tag or an entity. The deck's step HTML is always balanced
// (produced by the Markdown renderer), so a small hand tokenizer is enough.

/** Count visible characters in an HTML string (tags excluded, each entity = 1). */
export function visibleLen(html: string): number {
  let count = 0;
  let i = 0;
  while (i < html.length) {
    const ch = html[i];
    if (ch === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) break;
      i = end + 1;
    } else if (ch === '&') {
      const semi = html.indexOf(';', i);
      if (semi !== -1 && semi - i <= 10) i = semi + 1;
      else i += 1;
      count += 1;
    } else {
      i += 1;
      count += 1;
    }
  }
  return count;
}

const VOID_TAGS = new Set(['br', 'img', 'hr', 'input', 'wbr']);

/** Return `html` truncated to the first `n` visible characters, with any tags
 *  left open by the cut properly closed so the fragment stays valid. */
export function sliceHtml(html: string, n: number): string {
  if (n >= visibleLen(html)) return html;
  let out = '';
  const stack: string[] = [];
  let count = 0;
  let i = 0;
  while (i < html.length && count < n) {
    const ch = html[i];
    if (ch === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) break;
      const tag = html.slice(i, end + 1);
      out += tag;
      const m = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/.exec(tag);
      if (m) {
        const closing = m[1] === '/';
        const name = m[2]!.toLowerCase();
        const selfClose = /\/>\s*$/.test(tag) || VOID_TAGS.has(name);
        if (closing) {
          const top = stack.lastIndexOf(name);
          if (top !== -1) stack.splice(top, 1);
        } else if (!selfClose) {
          stack.push(name);
        }
      }
      i = end + 1;
    } else if (ch === '&') {
      const semi = html.indexOf(';', i);
      if (semi !== -1 && semi - i <= 10) {
        out += html.slice(i, semi + 1);
        i = semi + 1;
      } else {
        out += ch;
        i += 1;
      }
      count += 1;
    } else {
      out += ch;
      i += 1;
      count += 1;
    }
  }
  for (let k = stack.length - 1; k >= 0; k--) out += `</${stack[k]}>`;
  return out;
}
