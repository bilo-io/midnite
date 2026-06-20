// n8n-style expression resolution for workflow node params (Phase 12 Theme A).
//
// A SAFE resolver — no `eval`, no `Function`. Just `{{ ... }}` template spans
// interpolated over a typed context exposing:
//   - $json  — the node's merged input
//   - $node  — a map of completed upstream outputs, keyed by node label
//   - $env   — an allow-listed map of env vars
//
// Paths are dotted + bracketed: `$json.body.items[0].id`,
// `$node["Fetch issues"].json.title`, `$env.GITHUB_TOKEN`. A bare single span
// (`{{$json.x}}`) returns the *typed* value; mixed text (`id-{{$json.id}}`)
// returns a string. A path that doesn't resolve throws `ExpressionError` by
// default; opt into null-safe access with `?.` (`{{$json.maybe?.x}}`).
//
// This is the shared contract: the gateway engine (resolve-before-execute) and
// the web editor (autocomplete/preview) both depend on these exact semantics.

/** The runtime context an expression resolves against. */
export interface ExpressionContext {
  /** The node's merged input payload. */
  $json?: unknown;
  /** Completed upstream node outputs, keyed by node label (falling back to id). */
  $node?: Record<string, unknown>;
  /** Allow-listed environment variables. */
  $env?: Record<string, string | undefined>;
}

/** Thrown when a template references a path that does not resolve. */
export class ExpressionError extends Error {
  /** The offending expression (the text inside the `{{ }}`). */
  readonly expression: string;
  constructor(message: string, expression: string) {
    super(message);
    this.name = 'ExpressionError';
    this.expression = expression;
  }
}

type Token = { type: 'text'; value: string } | { type: 'expr'; value: string };

type ExprRoot = '$json' | '$node' | '$env';
const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*/;

/**
 * Split a template into literal-text and expression spans, honouring the `\{{`
 * escape (a literal `{{`). An unterminated `{{` is treated as literal text.
 */
function tokenize(template: string): Token[] {
  const tokens: Token[] = [];
  let buf = '';
  let i = 0;
  while (i < template.length) {
    if (template[i] === '\\' && template.slice(i + 1, i + 3) === '{{') {
      buf += '{{';
      i += 3;
      continue;
    }
    if (template.slice(i, i + 2) === '{{') {
      const end = template.indexOf('}}', i + 2);
      if (end === -1) {
        buf += template.slice(i);
        break;
      }
      if (buf) {
        tokens.push({ type: 'text', value: buf });
        buf = '';
      }
      tokens.push({ type: 'expr', value: template.slice(i + 2, end) });
      i = end + 2;
      continue;
    }
    buf += template[i];
    i += 1;
  }
  if (buf) tokens.push({ type: 'text', value: buf });
  return tokens;
}

type Access = { key: string | number; optional: boolean };

function parseBracket(rest: string, expr: string): { key: string | number; rest: string } {
  const num = /^\[(\d+)\]/.exec(rest);
  if (num) return { key: Number(num[1] ?? '0'), rest: rest.slice(num[0].length) };
  const dq = /^\[\s*"((?:[^"\\]|\\.)*)"\s*\]/.exec(rest);
  if (dq) return { key: (dq[1] ?? '').replace(/\\(.)/g, '$1'), rest: rest.slice(dq[0].length) };
  const sq = /^\[\s*'((?:[^'\\]|\\.)*)'\s*\]/.exec(rest);
  if (sq) return { key: (sq[1] ?? '').replace(/\\(.)/g, '$1'), rest: rest.slice(sq[0].length) };
  throw new ExpressionError(`invalid bracket access near "${rest}" in "${expr}"`, expr);
}

/** Parse `$json.a["b"][0]?.c` into a root + ordered list of accesses. */
function parsePath(expr: string): { root: ExprRoot; accesses: Access[] } {
  const rootMatch = /^(\$json|\$node|\$env)/.exec(expr);
  if (!rootMatch) {
    throw new ExpressionError(
      `expression must start with $json, $node, or $env: "${expr}"`,
      expr,
    );
  }
  const root = rootMatch[1] as ExprRoot;
  let rest = expr.slice(root.length);
  const accesses: Access[] = [];
  while (rest.length) {
    let optional = false;
    if (rest.startsWith('?.')) {
      optional = true;
      rest = rest.slice(2);
      if (rest.startsWith('[')) {
        const b = parseBracket(rest, expr);
        accesses.push({ key: b.key, optional });
        rest = b.rest;
        continue;
      }
    } else if (rest.startsWith('.')) {
      rest = rest.slice(1);
    } else if (rest.startsWith('[')) {
      const b = parseBracket(rest, expr);
      accesses.push({ key: b.key, optional });
      rest = b.rest;
      continue;
    } else {
      throw new ExpressionError(`unexpected token near "${rest}" in "${expr}"`, expr);
    }
    const id = IDENT_RE.exec(rest);
    if (!id) throw new ExpressionError(`invalid identifier near "${rest}" in "${expr}"`, expr);
    accesses.push({ key: id[0], optional });
    rest = rest.slice(id[0].length);
  }
  return { root, accesses };
}

function rootValue(root: ExprRoot, context: ExpressionContext): unknown {
  if (root === '$json') return context.$json;
  if (root === '$node') return context.$node ?? {};
  return context.$env ?? {};
}

/** Evaluate a single expression (the text inside `{{ }}`) to its typed value. */
function evaluate(raw: string, context: ExpressionContext): unknown {
  const expr = raw.trim();
  if (!expr) throw new ExpressionError('empty expression', raw);
  const { root, accesses } = parsePath(expr);
  let cur = rootValue(root, context);
  for (const { key, optional } of accesses) {
    if (cur === null || cur === undefined) {
      if (optional) return null;
      throw new ExpressionError(
        `cannot read "${key}" — path "${expr}" does not resolve`,
        expr,
      );
    }
    cur = (cur as Record<string | number, unknown>)[key];
  }
  const last = accesses[accesses.length - 1];
  if (last && cur === undefined) {
    if (last.optional) return null;
    throw new ExpressionError(`path "${expr}" does not resolve`, expr);
  }
  return cur;
}

/** Render a resolved value for interpolation into surrounding text. */
function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Resolve a single template string. A template that is exactly one `{{ }}` span
 * returns the referenced value with its type preserved; anything with literal
 * text around (or between) spans returns a string. A string with no spans is
 * returned unchanged. Throws {@link ExpressionError} on an unresolved path.
 */
export function resolveExpression(template: string, context: ExpressionContext): unknown {
  const tokens = tokenize(template);
  const [only] = tokens;
  if (!only) return '';
  if (tokens.length === 1 && only.type === 'expr') {
    return evaluate(only.value, context);
  }
  return tokens
    .map((t) => (t.type === 'text' ? t.value : stringify(evaluate(t.value, context))))
    .join('');
}

/**
 * Recursively resolve every string in a params object against the context.
 * Non-string leaves pass through untouched; arrays and plain objects are walked.
 * Throws {@link ExpressionError} (short-circuiting) on the first unresolved path.
 */
export function resolveParams<T>(params: T, context: ExpressionContext): T {
  if (typeof params === 'string') return resolveExpression(params, context) as T;
  if (Array.isArray(params)) return params.map((v) => resolveParams(v, context)) as T;
  if (params && typeof params === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) out[k] = resolveParams(v, context);
    return out as T;
  }
  return params;
}

/** True when a string contains at least one (unescaped) `{{ }}` span. */
export function isExpression(value: string): boolean {
  return tokenize(value).some((t) => t.type === 'expr');
}
