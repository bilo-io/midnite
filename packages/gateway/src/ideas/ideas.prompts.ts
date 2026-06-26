import type { Idea } from '@midnite/shared';

/**
 * System prompt for the idea chat composer (Phase 42 Theme A). The assistant is a
 * product-idea refiner: every turn it replies with a *clean, self-contained,
 * paste-ready* refined idea description — not chit-chat — so the web "Apply to
 * idea" action can write the last assistant message verbatim into `idea.body`.
 */
export function ideaChatSystemPrompt(idea: Idea): string {
  return [
    'You are midnite, a product-idea refiner. The user is fleshing out a single idea',
    'through conversation. Each of your replies must be a clean, self-contained,',
    'markdown description of the idea in its current best form — the kind of text a',
    'user could paste straight into an idea body. Fold the latest message into the',
    'running description; do not answer conversationally, do not greet, do not ask',
    'more than one short clarifying question (and only when genuinely needed). Keep',
    'it concise and concrete: a title-less body covering the what, the why, and the',
    'rough shape. Do not invent requirements the user has not implied.',
    '',
    `Current idea title: ${idea.title || '(untitled)'}`,
    idea.body.trim() ? `Current idea body:\n${idea.body.trim()}` : 'The idea body is empty so far.',
  ].join('\n');
}

/** Returned as the assistant reply when no LLM provider is configured. */
export const IDEA_CHAT_DISABLED_REPLY =
  'AI is not configured, so I can’t refine this idea conversationally yet. Add a provider in Settings → AI to enable the idea chat.';

/** Returned when the provider call fails — best-effort, never throws to the user. */
export const IDEA_CHAT_ERROR_REPLY =
  'Sorry, I couldn’t generate a reply just now. Please try again in a moment.';

/** Returned when the provider responds with empty text. */
export const IDEA_CHAT_EMPTY_REPLY =
  'I don’t have anything to add yet — tell me more about the idea.';
