'use client';

import { cn } from '@/lib/utils';
import { useTypewriter } from '@/components/sections/use-typewriter';

const COMMAND = 'midnite add "fix flaky login, dark mode, bump deps"';
const OUTPUT = [
  'classified 3 items → 2 todo · 1 backlog',
  'agent-2 ▸ fix flaky login        02:14',
  'agent-1 ▸ add dark mode          done ✓',
];

/**
 * Terminal mockup that types a command then reveals a plausible faux response.
 * Forced-dark with explicit colours (terminals read as dark regardless of theme).
 * Reuses the useTypewriter engine; degrades to instant under reduced motion.
 */
export function TerminalModule() {
  const { displayed, done } = useTypewriter({ text: COMMAND, speed: 40 });
  return (
    <div className="h-full w-full overflow-hidden bg-[#0b0b0f] p-4 font-mono text-[12px] leading-relaxed">
      <div className="text-zinc-100">
        <span className="text-emerald-400">$ </span>
        <span aria-hidden="true">{displayed}</span>
        {!done ? <span className="caret bg-zinc-100" /> : null}
        <span className="sr-only">{COMMAND}</span>
      </div>
      <div
        className={cn(
          'mt-3 space-y-1 text-zinc-400 transition-opacity duration-500',
          done ? 'opacity-100' : 'opacity-0',
        )}
      >
        {OUTPUT.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}
