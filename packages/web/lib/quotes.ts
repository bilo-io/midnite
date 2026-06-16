export type DailyQuote = { text: string; author: string };

// A small bundled set so the widget needs no backend. Rotates once per local day.
export const QUOTES: DailyQuote[] = [
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Programs must be written for people to read, and only incidentally for machines to execute.', author: 'Harold Abelson' },
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', author: 'Martin Fowler' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Code is like humor. When you have to explain it, it’s bad.', author: 'Cory House' },
  { text: 'Deleted code is debugged code.', author: 'Jeff Sickel' },
  { text: 'Walking on water and developing software from a specification are easy if both are frozen.', author: 'Edward Berard' },
  { text: 'There are only two hard things in computer science: cache invalidation and naming things.', author: 'Phil Karlton' },
  { text: 'Weeks of coding can save you hours of planning.', author: 'Anonymous' },
  { text: 'The most disastrous thing that you can ever learn is your first programming language.', author: 'Alan Kay' },
];

/** Local day-of-year (1–366) for an epoch-ms instant. */
export function dayOfYear(ms: number): number {
  const d = new Date(ms);
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

/** The quote for the day containing `now` — stable across the whole local day. */
export function quoteOfDay(now: number): DailyQuote {
  return QUOTES[dayOfYear(now) % QUOTES.length]!;
}
