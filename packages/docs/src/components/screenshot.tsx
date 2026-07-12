// A framed screenshot used inside the product-feature MDX pages. The docs app
// never talks to the gateway, so feature screens are captured as static images
// (see scripts/capture-screenshots.ts) and imported into a page, then passed as
// `src`. Until a real capture exists a page can omit `src`: the frame then renders
// a labelled placeholder so the layout is complete and the build stays green. The
// frame mirrors `Demo`'s token-styled border so shots sit consistently in either
// theme.
export function Screenshot({ src, alt, caption }: { src?: string; alt: string; caption?: string }) {
  return (
    <figure className="my-6">
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="w-full max-w-full rounded-lg border border-border bg-background"
        />
      ) : (
        <div
          role="img"
          aria-label={`${alt} (screenshot pending)`}
          className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground"
        >
          Screenshot: {alt}
        </div>
      )}
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
