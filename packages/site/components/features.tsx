import { KanbanSquare, Cpu, TerminalSquare, MonitorPlay, GitPullRequest } from 'lucide-react';

import { Reveal } from '@/components/ui/section';

const FEATURES = [
  {
    icon: KanbanSquare,
    title: 'Live kanban board',
    body: 'Every task moves through backlog → todo → wip → done in real time, in the browser.',
  },
  {
    icon: Cpu,
    title: 'Agent pool',
    body: 'A fixed set of slots runs Claude Code sessions concurrently. Saturate your machine, not your attention.',
  },
  {
    icon: TerminalSquare,
    title: 'CLI and browser',
    body: 'Drive it from the terminal or the board — both are thin clients of one long-running gateway.',
  },
  {
    icon: MonitorPlay,
    title: 'Live terminals',
    body: 'Watch any agent work in an embedded terminal, and jump in when a task needs your input.',
  },
  {
    icon: GitPullRequest,
    title: 'PRs, not guesswork',
    body: 'Finished tasks arrive as pull requests — review the diff, merge on your terms.',
  },
];

export function Features() {
  return (
    <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-28">
      <Reveal>
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Features
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          One gateway. Many agents. Full visibility.
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border/60 bg-border/40 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal
            as="article"
            key={f.title}
            delay={(i % 3) * 80}
            className="group bg-card/40 p-7 backdrop-blur-sm transition-colors hover:bg-card/70"
          >
            <f.icon className="h-6 w-6 text-[#8b5cf6] transition-transform duration-300 group-hover:-translate-y-0.5" />
            <h3 className="mt-4 font-medium">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
