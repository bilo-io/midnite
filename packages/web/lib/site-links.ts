// Where the docs site (packages/docs) lives, resolved per environment.
//
// In dev the docs SPA runs on its fixed, strict port — see docs/vite.config.ts
// (`server.port: 5173`, `strictPort: true`) and docs/moon.yml — so we point
// straight at it. In a deployed build the URL comes from `NEXT_PUBLIC_DOCS_URL`,
// falling back to '#' so the link degrades gracefully when docs aren't hosted.
//
// `process.env.NODE_ENV` and `NEXT_PUBLIC_*` are inlined by Next at build time,
// so this stays correct in server and client components alike.
export const DOCS_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : (process.env.NEXT_PUBLIC_DOCS_URL ?? '#');
