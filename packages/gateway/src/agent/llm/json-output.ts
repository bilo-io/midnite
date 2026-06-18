import type { JsonSchema } from './llm-provider.interface';

/**
 * Build a system-prompt suffix that instructs a model to emit a single JSON
 * object matching the given schema. Used by providers without first-class
 * tool/forced-schema output (Gemini, and the openai-compatible fallback).
 */
export function jsonSchemaInstruction(
  schema: JsonSchema,
  description?: string,
): string {
  return [
    description ? `${description}\n` : '',
    'Respond with ONLY a single JSON object — no prose, no markdown fences —',
    'that conforms to this JSON Schema:',
    JSON.stringify(schema),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Parse a JSON object out of a model's text response. Tolerates code fences and
 * leading/trailing prose by extracting the first balanced `{…}` span. Throws if
 * no parseable object is found.
 */
export function parseJsonObjectLoose(text: string): unknown {
  const trimmed = text.trim();
  // Fast path: the whole thing is JSON.
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to extraction
  }

  // Strip a ```json … ``` (or bare ```) fence if present.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(body);
  } catch {
    // fall through to brace scan
  }

  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const span = body.slice(start, end + 1);
    return JSON.parse(span); // let a genuine syntax error surface to the caller
  }
  throw new Error('no JSON object found in model response');
}
