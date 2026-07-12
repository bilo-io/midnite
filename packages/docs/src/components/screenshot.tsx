// A framed screenshot used inside the product-feature MDX pages. The docs app
// never talks to the gateway, so feature screens are captured as static images
// (see e2e/docs-features.shots.ts) and imported into a page. Each feature ships a
// light and a dark capture; the one matching the reader's active theme is shown
// via a pure-CSS swap (the app toggles `.dark` on <html>, and Tailwind's
// `darkMode: 'class'` keys the `dark:` variants off it). A page may pass just one
// theme (shown unconditionally) or neither (a labelled placeholder), so the layout
// is always complete and the build stays green. The frame mirrors `Demo`'s
// token-styled border so shots sit consistently in either theme.
const FRAME = 'w-full max-w-full rounded-lg border border-border bg-background';

export function Screenshot({
  dark,
  light,
  alt,
  caption,
}: {
  dark?: string;
  light?: string;
  alt: string;
  caption?: string;
}) {
  const both = Boolean(dark && light);
  return (
    <figure className="my-6">
      {light || dark ? (
        <>
          {light ? (
            <img src={light} alt={alt} loading="lazy" className={both ? `${FRAME} dark:hidden` : FRAME} />
          ) : null}
          {dark ? (
            <img src={dark} alt={alt} loading="lazy" className={both ? `${FRAME} hidden dark:block` : FRAME} />
          ) : null}
        </>
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
