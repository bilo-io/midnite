import { describe, expect, it } from 'vitest';
import {
  ExpressionError,
  isExpression,
  resolveExpression,
  resolveParams,
  type ExpressionContext,
} from './expression.js';

const ctx: ExpressionContext = {
  $json: {
    id: 7,
    title: 'Hello',
    ok: true,
    nested: { value: 42 },
    items: [{ id: 'a' }, { id: 'b' }],
    maybe: null,
  },
  $node: {
    'Fetch issues': { json: { title: 'Bug report', count: 3 } },
  },
  $env: { GITHUB_TOKEN: 'ghp_secret' },
};

describe('resolveExpression — paths', () => {
  it('resolves a dotted path', () => {
    expect(resolveExpression('{{$json.title}}', ctx)).toBe('Hello');
    expect(resolveExpression('{{$json.nested.value}}', ctx)).toBe(42);
  });

  it('resolves numeric bracket indices', () => {
    expect(resolveExpression('{{$json.items[0].id}}', ctx)).toBe('a');
    expect(resolveExpression('{{$json.items[1].id}}', ctx)).toBe('b');
  });

  it('resolves quoted bracket keys (labels with spaces)', () => {
    expect(resolveExpression('{{$node["Fetch issues"].json.title}}', ctx)).toBe('Bug report');
    expect(resolveExpression("{{$node['Fetch issues'].json.count}}", ctx)).toBe(3);
  });

  it('resolves $env values', () => {
    expect(resolveExpression('{{$env.GITHUB_TOKEN}}', ctx)).toBe('ghp_secret');
  });

  it('returns the whole root for a bare reference', () => {
    expect(resolveExpression('{{$json}}', ctx)).toEqual(ctx.$json);
    expect(resolveExpression('{{$node}}', ctx)).toEqual(ctx.$node);
  });

  it('tolerates whitespace inside the span', () => {
    expect(resolveExpression('{{  $json.title  }}', ctx)).toBe('Hello');
  });
});

describe('resolveExpression — type preservation vs interpolation', () => {
  it('preserves the typed value for a single bare span', () => {
    expect(resolveExpression('{{$json.id}}', ctx)).toBe(7);
    expect(typeof resolveExpression('{{$json.id}}', ctx)).toBe('number');
    expect(resolveExpression('{{$json.ok}}', ctx)).toBe(true);
    expect(resolveExpression('{{$json.nested}}', ctx)).toEqual({ value: 42 });
  });

  it('returns a string when text surrounds the span', () => {
    expect(resolveExpression('id-{{$json.id}}', ctx)).toBe('id-7');
    expect(resolveExpression('{{$json.title}}!', ctx)).toBe('Hello!');
  });

  it('JSON-stringifies objects interpolated into text', () => {
    expect(resolveExpression('n={{$json.nested}}', ctx)).toBe('n={"value":42}');
  });

  it('joins multiple spans', () => {
    expect(resolveExpression('{{$json.title}} #{{$json.id}}', ctx)).toBe('Hello #7');
  });

  it('returns a non-templated string unchanged', () => {
    expect(resolveExpression('just text', ctx)).toBe('just text');
  });
});

describe('resolveExpression — escaping', () => {
  it('treats \\{{ as a literal {{', () => {
    expect(resolveExpression('\\{{not a span}}', ctx)).toBe('{{not a span}}');
    expect(resolveExpression('a \\{{b}} {{$json.id}}', ctx)).toBe('a {{b}} 7');
  });

  it('treats an unterminated {{ as literal text', () => {
    expect(resolveExpression('{{$json.id', ctx)).toBe('{{$json.id');
  });
});

describe('resolveExpression — missing-reference policy', () => {
  it('throws ExpressionError for a missing terminal key', () => {
    expect(() => resolveExpression('{{$json.nope}}', ctx)).toThrow(ExpressionError);
  });

  it('throws when descending through a nullish value without optional access', () => {
    expect(() => resolveExpression('{{$json.maybe.x}}', ctx)).toThrow(ExpressionError);
  });

  it('throws for a missing $node label', () => {
    expect(() => resolveExpression('{{$node["Typo"].json.x}}', ctx)).toThrow(ExpressionError);
  });

  it('names the unresolved path on the error', () => {
    try {
      resolveExpression('{{$json.nope}}', ctx);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ExpressionError);
      expect((err as ExpressionError).expression).toBe('$json.nope');
      expect((err as ExpressionError).message).toContain('$json.nope');
    }
  });
});

describe('resolveExpression — optional access', () => {
  it('resolves optional access on a nullish value to null', () => {
    expect(resolveExpression('{{$json.maybe?.x}}', ctx)).toBeNull();
  });

  it('resolves optional access on a missing key to null', () => {
    expect(resolveExpression('{{$json.absent?.deep}}', ctx)).toBeNull();
  });

  it('still resolves a present value through optional access', () => {
    expect(resolveExpression('{{$json.nested?.value}}', ctx)).toBe(42);
  });
});

describe('resolveExpression — malformed templates (clear error, no crash)', () => {
  const bad = ['{{}}', '{{   }}', '{{foo.bar}}', '{{$json.}}', '{{$json[}}', '{{$json.a..b}}'];
  it.each(bad)('throws ExpressionError for %s', (template) => {
    expect(() => resolveExpression(template, ctx)).toThrow(ExpressionError);
  });
});

describe('resolveParams', () => {
  it('resolves strings within a nested params object', () => {
    const params = {
      url: 'https://api/{{$json.id}}',
      headers: { Authorization: 'Bearer {{$env.GITHUB_TOKEN}}' },
      maxTokens: 1024,
      enabled: true,
      tags: ['{{$json.title}}', 'static'],
    };
    expect(resolveParams(params, ctx)).toEqual({
      url: 'https://api/7',
      headers: { Authorization: 'Bearer ghp_secret' },
      maxTokens: 1024,
      enabled: true,
      tags: ['Hello', 'static'],
    });
  });

  it('preserves the typed value when a field is a single bare span', () => {
    expect(resolveParams({ count: '{{$node["Fetch issues"].json.count}}' }, ctx)).toEqual({
      count: 3,
    });
  });

  it('short-circuits with ExpressionError on the first unresolved path', () => {
    expect(() => resolveParams({ a: '{{$json.nope}}' }, ctx)).toThrow(ExpressionError);
  });

  it('passes non-string leaves through untouched', () => {
    expect(resolveParams({ n: 5, b: false, z: null }, ctx)).toEqual({ n: 5, b: false, z: null });
  });
});

describe('isExpression', () => {
  it('detects an unescaped span', () => {
    expect(isExpression('{{$json.id}}')).toBe(true);
    expect(isExpression('prefix {{$json.id}}')).toBe(true);
  });

  it('is false for plain text and escaped spans', () => {
    expect(isExpression('plain')).toBe(false);
    expect(isExpression('\\{{escaped}}')).toBe(false);
  });
});
