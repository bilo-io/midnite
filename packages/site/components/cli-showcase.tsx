import { SideColumn } from '@/components/ui/section';
import { TypedTitle } from '@/components/sections/typed-title';
import { InlinePanel } from '@/components/panel/inline-panel';

export function CliShowcase() {
  return (
    <section id="cli" className="relative z-10 px-6 py-28">
      {/* Panel sits right on this section → keep the static content in the left half.
          The full terminal transcript now lives in the panel itself (the persistent
          one on desktop, the inline one below lg), so this section carries no bespoke
          terminal card of its own. */}
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

        <InlinePanel content="transcript" className="mt-10" />
      </SideColumn>
    </section>
  );
}
