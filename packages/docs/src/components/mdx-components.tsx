import { proseComponents } from '@midnite/ui';

// The prose element map for every render path in this app: the MDXProvider in
// app.tsx, and markdown-page.tsx (which derives its own node-stripped variant
// from this one).
//
// The map itself lives in `@midnite/ui` as of Phase 80 — the same one the
// marketing site's legal pages read on — so reading typography is defined once
// for the repo instead of being maintained here and there in parallel. The
// classes are unchanged: they were lifted verbatim from this file when the
// primitive was extracted.
//
// Root-relative links still route through react-router rather than doing a
// full-page navigation, which matters because this app is a hash router. That
// now happens via the `ReadingLayoutProvider` in app.tsx, which injects a Link
// adapter into the shared map — so the routing knowledge sits with the router
// instead of inside the typography.
export const mdxComponents = proseComponents;
