import { Reveal } from '@/components/ui/section';
import { TypedTitle } from '@/components/sections/typed-title';
import { InlinePanel } from '@/components/panel/inline-panel';

const STEPS = [
  {
    n: '01',
    title: 'Drop in a list',
    body: 'Paste a freeform brain-dump of tasks — bugs, features, chores, questions. No formatting required.',
  },
  {
    n: '02',
    title: 'midnite classifies',
    body: 'Each item is sorted by kind and readiness. Clear work queues up; anything ambiguous parks in the backlog.',
  },
  {
    n: '03',
    title: 'The scheduler assigns',
    body: 'Ready tasks are handed to free agent slots the moment one opens — no manual dispatch.',
  },
  {
    n: '04',
    title: 'Agents run in parallel',
    body: 'Each slot spawns a Claude Code session. Status flows back live: working, waiting on you, done.',
  },
  {
    n: '05',
    title: 'Work lands with a PR',
    body: 'Completed tasks settle to done with a pull-request link, ready for review.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative z-10 mx-auto max-w-5xl px-6 py-28">
      <TypedTitle
        sectionId="how"
        eyebrow="How it works"
        title="From a messy list to merged work, on autopilot."
      />

      <InlinePanel content="kanban" className="mt-10" />

      <ol className="mt-14 space-y-px">
        {STEPS.map((step, i) => (
          <Reveal
            as="li"
            key={step.n}
            delay={i * 70}
            className="group grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 border-t border-border/60 py-7 sm:grid-cols-[6rem_1fr] sm:gap-x-10"
          >
            <span className="font-mono text-sm text-muted-foreground/70 transition-colors group-hover:text-[#8b5cf6]">
              {step.n}
            </span>
            <div>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="mt-1.5 max-w-xl text-pretty leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
