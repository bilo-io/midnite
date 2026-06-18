import { describe, expect, it } from 'vitest';
import { jsonSchemaInstruction, parseJsonObjectLoose } from './json-output';

describe('parseJsonObjectLoose', () => {
  it('parses a plain JSON object', () => {
    expect(parseJsonObjectLoose('{"ready": true}')).toEqual({ ready: true });
  });

  it('parses JSON inside a ```json fence', () => {
    const text = 'Here you go:\n```json\n{"title":"Fix it","kind":"bug"}\n```\n';
    expect(parseJsonObjectLoose(text)).toEqual({ title: 'Fix it', kind: 'bug' });
  });

  it('extracts an object embedded in surrounding prose', () => {
    expect(parseJsonObjectLoose('The answer is {"ready": false} ok?')).toEqual({ ready: false });
  });

  it('throws when there is no object', () => {
    expect(() => parseJsonObjectLoose('no json here')).toThrow();
  });
});

describe('jsonSchemaInstruction', () => {
  it('embeds the schema and any description', () => {
    const out = jsonSchemaInstruction({ type: 'object' }, 'Record the result.');
    expect(out).toContain('Record the result.');
    expect(out).toContain('"type":"object"');
    expect(out.toLowerCase()).toContain('json');
  });
});
