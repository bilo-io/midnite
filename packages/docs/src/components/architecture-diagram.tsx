// A theme-aware architecture diagram for the Overview page. Authored as inline
// SVG that paints with the design tokens (`hsl(var(--…))`, defined by the
// @midnite/ui token CSS the docs import), so it re-themes with the header toggle
// exactly like the rest of the site — no separate light/dark asset needed.
const CARD = 'hsl(var(--card))';
const BORDER = 'hsl(var(--border))';
const FG = 'hsl(var(--foreground))';
const MUTED = 'hsl(var(--muted-foreground))';
const ACCENT = 'hsl(var(--primary))';

function Box({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  accent,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={CARD}
        stroke={accent ? ACCENT : BORDER}
        strokeWidth={accent ? 2 : 1.5}
      />
      <text x={x + w / 2} y={subtitle ? y + h / 2 - 6 : y + h / 2 + 5} textAnchor="middle" fill={FG} fontSize="15" fontWeight="600">
        {title}
      </text>
      {subtitle ? (
        <text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fill={MUTED} fontSize="12.5">
          {subtitle}
        </text>
      ) : null}
    </g>
  );
}

export function ArchitectureDiagram() {
  return (
    <figure className="my-6">
      <svg viewBox="0 0 760 430" role="img" aria-label="How midnite fits together" className="w-full max-w-full">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill={MUTED} />
          </marker>
        </defs>

        {/* Clients */}
        <Box x={90} y={20} w={240} h={64} title="Desktop app" subtitle="the web UI you see" />
        <Box x={430} y={20} w={240} h={64} title="CLI — midnite" subtitle="terminal client (optional)" />

        {/* Client → gateway links */}
        <line x1={210} y1={84} x2={330} y2={150} stroke={MUTED} strokeWidth="1.5" markerEnd="url(#arrow)" />
        <line x1={550} y1={84} x2={430} y2={150} stroke={MUTED} strokeWidth="1.5" markerEnd="url(#arrow)" />
        <text x={380} y={122} textAnchor="middle" fill={MUTED} fontSize="12">
          HTTP / WebSocket · localhost
        </text>

        {/* Gateway */}
        <rect x={90} y={150} width={580} height={150} rx={12} fill={CARD} stroke={ACCENT} strokeWidth={2} />
        <text x={380} y={176} textAnchor="middle" fill={FG} fontSize="16" fontWeight="700">
          Gateway
        </text>
        <text x={380} y={196} textAnchor="middle" fill={MUTED} fontSize="12.5">
          Nest.js · runs locally on your machine
        </text>
        <Box x={110} y={214} w={165} h={64} title="Task store" subtitle="SQLite · scheduler" />
        <Box x={297} y={214} w={165} h={64} title="Agent pool" subtitle="one PTY per session" />
        <Box x={484} y={214} w={165} h={64} title="REST + WS API" subtitle="the contract" />

        {/* Gateway → agents */}
        <line x1={380} y1={300} x2={380} y2={346} stroke={MUTED} strokeWidth="1.5" markerEnd="url(#arrow)" />
        <text x={396} y={328} fill={MUTED} fontSize="12">
          spawns
        </text>

        {/* Agents */}
        <Box x={210} y={346} w={340} h={64} title="Coding agents" subtitle="Claude Code & other CLIs, in PTYs" accent />
      </svg>
      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
        The desktop app and the CLI are thin clients of one local gateway, which schedules your tasks and drives the
        coding agents.
      </figcaption>
    </figure>
  );
}
