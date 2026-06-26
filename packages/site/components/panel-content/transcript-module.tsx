type Line = { kind: 'cmd' | 'out' | 'muted'; text: string };

// The full CLI session transcript — boot the gateway, dump a task list, watch the
// board. Previously rendered as a bespoke card inside the `cli` section; now it's a
// panel content module so the persistent preview panel carries it when that section
// is active (and the inline mobile panel mirrors it).
const LINES: Line[] = [
  { kind: 'cmd', text: 'midnite serve' },
  { kind: 'muted', text: 'gateway listening on :7777 · 4 agent slots' },
  { kind: 'out', text: '' },
  { kind: 'cmd', text: 'midnite add "fix flaky login test, add dark mode, bump deps"' },
  { kind: 'muted', text: 'classified 3 items → 2 todo · 1 backlog' },
  { kind: 'out', text: '' },
  { kind: 'cmd', text: 'midnite board' },
  { kind: 'out', text: '  todo     ▸ add dark mode' },
  { kind: 'out', text: '  wip      ▸ fix flaky login test      agent-2  02:14' },
  { kind: 'out', text: '  waiting  ▸ bump deps                 needs input' },
  { kind: 'out', text: '  done     ▸ migrate config schema     #482 ✓' },
];

const color: Record<Line['kind'], string> = {
  cmd: 'text-zinc-100',
  out: 'text-zinc-400',
  muted: 'text-zinc-500',
};

/**
 * Full terminal-session transcript for the `cli` section's panel. Forced-dark with
 * explicit colours (terminals read as dark regardless of theme). Static — no
 * typewriter — so the whole workflow is legible at a glance; scrolls if the frame is
 * shorter than the transcript.
 */
export function TranscriptModule() {
  return (
    <div className="h-full w-full overflow-auto bg-[#0b0b0f] p-4 font-mono text-[12px] leading-relaxed">
      {/* `whitespace-pre` keeps the board's column alignment intact; the desktop
          panel is wide enough to show every line, and the narrower inline (mobile)
          frame scrolls horizontally — the same trade the original card made. */}
      <pre className="whitespace-pre">
        {LINES.map((line, i) => (
          <div key={i} className={color[line.kind]}>
            {line.kind === 'cmd' ? (
              <>
                <span className="text-emerald-400">$ </span>
                {line.text}
              </>
            ) : line.text === '' ? (
              ' '
            ) : (
              line.text
            )}
            {i === LINES.length - 1 ? <span className="caret bg-zinc-100" /> : null}
          </div>
        ))}
      </pre>
    </div>
  );
}
