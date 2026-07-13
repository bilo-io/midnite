// Where the midnite web app (packages/web) lives, resolved per environment.
//
// On localhost (`vite` dev) the web app runs on its fixed dev port — see
// web/moon.yml (`next dev -p 3000`) — so we point straight at it. In a deployed
// build the URL comes from `VITE_APP_URL` (set at build time), falling back to
// the site root so the link is never dead.
//
// The docs package is a leaf consumer of @midnite/ui and can't import `shared`,
// so this constant is the local source of truth for the app's URL.
export const APP_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : (import.meta.env.VITE_APP_URL ?? '/');
