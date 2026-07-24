'use client';

import { cn } from '@/lib/utils';

/**
 * Renders an error message in a bordered alert panel. When the message is a JSON
 * payload — e.g. a raw zod validation body that leaked through the gateway
 * (`[ { "code": "invalid_type", … } ]`) — it's pretty-printed in a monospace
 * block; anything else shows as plain text. Red border + a semi-transparent
 * destructive wash, filling the available width of its container.
 */
export function ErrorPanel({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const pretty = tryPrettyJson(message);
  return (
    <div
      role="alert"
      className={cn(
        'w-full overflow-x-auto rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive',
        className,
      )}
    >
      {pretty ? (
        <pre className="whitespace-pre font-mono text-xs leading-relaxed">{pretty}</pre>
      ) : (
        <p className="whitespace-pre-wrap break-words">{message}</p>
      )}
    </div>
  );
}

/** Pretty-print `text` if it parses as a JSON object/array, else `null`. */
function tryPrettyJson(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return null;
  }
}
