// First-run example decks. On a browser's very first visit the store seeds
// these so the Slides page isn't empty; deleting them (or all decks) never
// re-seeds. Each entry is just source markdown + timestamps — the store derives
// the slug, id and parsed `content` when it seeds, so this stays the single
// source of truth for the starter content.

export type SeedDeck = {
  title: string;
  markdown: string;
  created_at: string;
  updated_at: string;
};

const WELCOME = `# Welcome to Slides

Paste Markdown, get a presentation.

## How it works

- Every \`##\` heading starts a new slide
- Each bullet, paragraph, code block or table becomes a step you reveal on click
- The title and each point **type themselves in** as you go

## Formatting you can use

- Inline \`code\`, **bold**, *italic*, and [links](https://example.com)
- Fenced code blocks with syntax highlighting
- GFM tables

## A code step

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Controls

| Key | Action |
| --- | --- |
| → / Space | Next step or slide |
| ← | Previous |
| F | Fullscreen |
| ? | Shortcuts |

## That's it

Make your own — hit **New deck** and paste some Markdown.
`;

export const SEED_DECKS: SeedDeck[] = [
  {
    title: 'Welcome to Slides',
    markdown: WELCOME,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];
