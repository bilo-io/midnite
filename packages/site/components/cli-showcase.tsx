import { Reveal, SideColumn } from '@/components/ui/section';
import { TypedTitle } from '@/components/sections/typed-title';

type Line = { kind: 'cmd' | 'out' | 'muted'; text: string };

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
  cmd: 'text-foreground',
  out: 'text-muted-foreground',
  muted: 'text-muted-foreground/60',
};

export function CliShowcase() {
  return (
    <section id="cli" className="relative z-10 px-6 py-28">
      {/* Panel sits right on this section → keep the static content in the left half.
          The fixed terminal panel is the desktop preview, so the inline terminal
          card only renders below lg (where the panel stacks inline elsewhere). */}
      <SideColumn side="left">
        <TypedTitle
          sectionId="cli"
          eyebrow="From the terminal"
          title="Start the gateway, dump your list, walk away."
        >
          <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
            One command boots the orchestrator. Add tasks in plain language and let the pool work
            through them — check progress from the CLI or open the board in your browser.
          </p>
        </TypedTitle>

        <Reveal delay={120} className="mt-10 gradient-border rounded-xl lg:hidden">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-[#0b0b0f]/90 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[#f43f5e]/70" />
              <span className="h-3 w-3 rounded-full bg-[#f59e0b]/70" />
              <span className="h-3 w-3 rounded-full bg-[#10b981]/70" />
              <span className="ml-2 font-mono text-xs text-muted-foreground/70">midnite — zsh</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
              {LINES.map((line, i) => (
                <div key={i} className={color[line.kind]}>
                  {line.kind === 'cmd' ? (
                    <>
                      <span className="text-[#10b981]">$ </span>
                      {line.text}
                    </>
                  ) : line.text === '' ? (
                    ' '
                  ) : (
                    line.text
                  )}
                  {i === LINES.length - 1 && <span className="caret" />}
                </div>
              ))}
            </pre>
          </div>
        </Reveal>
      </SideColumn>
    </section>
  );
}
