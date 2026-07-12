// A terminal-styled panel for showing CLI usage on the docs pages. The docs app
// can't screenshot a real terminal (it only renders web pages), so instead of a
// brittle image this renders the CLI text in a framed "window" that re-themes with
// the site. Pass `content` as the raw terminal text (import a `.txt?raw` capture,
// or an inline template string); lines beginning with `$ ` are drawn as prompts.
export function Terminal({ title = 'midnite', content }: { title?: string; content: string }) {
  const lines = content.replace(/\n+$/, '').split('\n');
  return (
    <figure className="my-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
        <span className="ml-2 text-xs text-muted-foreground">{title}</span>
      </div>
      <pre className="max-h-[460px] overflow-auto px-4 py-3 text-[13px] leading-relaxed">
        <code>
          {lines.map((line, i) => {
            const isPrompt = line.startsWith('$ ');
            return (
              <span key={i} className="text-foreground/90">
                {isPrompt ? (
                  <>
                    <span className="text-primary">$</span>
                    {line.slice(1)}
                  </>
                ) : (
                  line || ' '
                )}
                {'\n'}
              </span>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
