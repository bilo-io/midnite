# midnite — Test suite guide

> **Four layers.** Shared unit → Gateway → Storybook component tests → Playwright flow/visual tests. Each is independently runnable; Phase 10 wired them all into CI.

---

## Quick reference

| Layer | Run | What it tests |
|-------|-----|---------------|
| **Shared unit** | `moon run shared:test` | Zod schemas, state machines, pure helpers |
| **Gateway** | `moon run gateway:test` | Services (in-memory fakes), repositories (`:memory:` SQLite), controllers, WS gateways |
| **Web unit / RTL** | `moon run web:test` (unit project) | React components, hooks, stores |
| **Storybook stories** | `moon run web:test` (storybook project) | Story renders without throwing; `play` interaction assertions |
| **All unit + story** | `moon run :test` | Full suite across the graph (what `moon ci` runs) |
| **Playwright flows** | `moon run web:e2e` | Cross-package user flows against a seeded real gateway |
| **Visual screenshots** | `moon run web:screenshots` | Deterministic page + story captures for preview/review |
| **Coverage** | `moon run gateway:test-coverage web:test-coverage` | Coverage report (`lcov` + `json-summary`) |

---

## Layer 1 — Shared unit tests

**Where:** `packages/shared/src/**/*.test.ts` (alongside each module)

**What's covered:** Every Zod schema round-trips valid fixtures and rejects invalid inputs. Discriminated unions (`trigger`, `events/workflow`) narrow on `type`. Pure helpers (`missingProjectRequirements`, `providerSupportsBaseUrl`, `CLI_PROVIDER_MAP`) are asserted. Canonical fixtures live in `packages/shared/src/__fixtures__/` and are re-exported from the `@midnite/shared/fixtures` subpath (test-only).

**Run:**
```bash
moon run shared:test
```

**Adding a test:**
1. Create `packages/shared/src/<module>.test.ts` alongside the module.
2. Import your schema and a valid fixture; assert `schema.parse(fixture)` equals the input (identity).
3. Add an invalid case: `expect(() => schema.parse(bad)).toThrow()`.
4. If your fixture is canonical (used cross-package), add it to `src/__fixtures__/index.ts`.

---

## Layer 2 — Gateway tests

**Where:** `packages/gateway/src/**/*.test.ts` and `*.spec.ts` (alongside each module)

**Structure (CLAUDE.md "Layering" rule):**
- **Repository tests** — use `createTestDb()` from `gateway/src/test/` for a real `:memory:` SQLite database (migrations applied, FK on).
- **Service unit tests** — use in-memory repository fakes (`vi.fn()` stubs); never hit the DB.
- **Controller tests** — direct instantiation + `vi.fn()` service mock; assert HTTP status + delegate calls.
- **WS gateway tests** — same direct pattern; assert subscription + broadcast paths.
- **Integration tests** — `pool/agent-pool.integration.spec.ts`, `heartbeat-scheduler.integration.spec.ts` — real `TasksService` + scheduler + pool; only the PTY boundary is faked.

**Run:**
```bash
moon run gateway:test
```

**`createTestDb()` helper** (`gateway/src/test/createTestDb.ts`):
```ts
const { db, sqlite, close } = await createTestDb();
// db is a MidniteDb (Drizzle) with migrations applied and FK on.
// Always call close() in afterAll.
```

**Adding a test:**
- Repository: use `createTestDb()`. Keep each test file isolated (per-file DB instance).
- Service: import the service + fake repository shape; `vi.fn()` every repository method you call.
- Controller: instantiate directly, inject a `vi.fn()` service, call the method, assert the response.
- Never use `@nestjs/testing` — the house style is direct instantiation.

---

## Layer 3 — Storybook component tests

**Where:** `packages/web/stories/**/*.stories.tsx`

**How it works:** `@storybook/addon-vitest` runs every story as a Vitest browser test (headless Chromium via Playwright). "Story renders without error" is a free smoke test. `play` functions become interaction tests.

**Run:**
```bash
moon run web:test          # runs unit project + storybook project together
```

The `web:test` task runs two Vitest projects:
- **`unit`** — jsdom, the existing RTL/hook specs.
- **`storybook`** — headless Chromium, all stories.

> **Gotcha:** web tests cannot run from inside a `.git/worktrees/<n>` directory (Vite denies `.git/**`). Always run `web:test` from the primary checkout or from a worktree created outside `.git/`.

**Accessibility:** `@storybook/addon-a11y` runs axe-core against every story. Currently set to `parameters.a11y.test: 'todo'` (warnings only). Violations are tracked in [phase-10-test-suite-hardening.md](../todo/phase-10-test-suite-hardening.md) Theme C3.

**Adding a story:**
1. Create `packages/web/stories/<ComponentName>.stories.tsx`.
2. Export `meta` (`satisfies Meta<typeof Component>`) + at least one named story.
3. Add a `play` function for interactive assertions (use `@storybook/test` — `userEvent`, `expect`, `within`).
4. For components that fetch data, use `installMockFetch` from `stories/mock-fetch.ts` to stub `globalThis.fetch` with canned gateway responses.
5. For components using Zustand stores, seed the store in `play` (or via a `decorators` entry in `meta`).

---

## Layer 4 — Playwright flow tests

**Where:** `packages/web/e2e/**/*.e2e.ts`

**How it works:** `playwright.config.ts` boots two servers — a real gateway (`node --import tsx src/main.ts`) against a throwaway temp SQLite file and a Next dev server pointed at it. Seeds are inserted over the gateway REST API in `beforeAll`. Each spec navigates, interacts, and asserts via accessible role/text locators (never test IDs).

**Run:**
```bash
moon run web:e2e
```

> Kept out of `moon ci` (`runInCI: false`) — it spawns real servers and takes ~60s. The dedicated CI job is `.github/workflows/e2e.yml` (Phase 10 F1).

**Adding a flow spec:**
1. Create `packages/web/e2e/<feature>.e2e.ts`.
2. Use `seedTask` / `seedSession` helpers from `e2e/helpers/gateway.ts` to insert test data.
3. Assert only accessible outcomes (`getByRole`, `getByText`, `getByPlaceholder`) — never `.locator('[data-testid=...]')`.
4. Never use `waitForTimeout` — use `waitFor` / `toBeVisible` with explicit locators.

---

## Layer 5 — Visual screenshots

**Where:** `packages/web/e2e/screenshots/`

**How it works:** `pages.shots.ts` captures the five key app pages (board, dashboard, workflows, councils, office) in light and dark at 1440×900. `storybook.shots.ts` captures every Storybook story at 1280×900. Both use `freezeForCapture` to kill animations, set a fixed clock, and stub external widget calls for determinism.

**Run:**
```bash
moon run web:screenshots   # writes PNGs to packages/web/e2e/__shots__/
```

**Generate the browsable gallery after a run:**
```bash
node packages/web/scripts/generate-gallery.mjs
# writes packages/web/e2e/__shots__/gallery.html + SCREENSHOTS.md
```

**Visual regression baselines** (Phase 10 E2): `pages.shots.ts` also includes `toHaveScreenshot` assertions against committed baselines in `packages/web/e2e/__screenshots__/`. To update baselines after an intentional UI change:

```bash
# macOS (local):
pnpm exec playwright test --project=screenshots --update-snapshots

# Linux-compatible (for CI on ubuntu-latest):
docker run --rm \
  -v "$(pwd)":/work -w /work \
  mcr.microsoft.com/playwright:v1.50.0-jammy \
  bash -c "pnpm install --frozen-lockfile && pnpm exec playwright install chromium && \
    pnpm exec playwright test --project=screenshots --update-snapshots"
```

Commit the updated PNGs — they are the new baselines.

> Current baselines are macOS. The CI `e2e` job runs on `ubuntu-latest`; Linux baselines are needed for the `toHaveScreenshot` assertions to pass in CI (see [phase-10-test-suite-hardening.md](../todo/phase-10-test-suite-hardening.md) E2 ⚠️ TODO).

---

## CI jobs

| Workflow | Trigger | What runs |
|----------|---------|-----------|
| `ci.yml` | push to main · PR | `moon ci` — typecheck + test + build + lint (affected-aware). Includes Storybook stories via `web:test`. |
| `e2e.yml` | push to main · PR | Playwright flow tests (`web:e2e`) + visual regression (`web:screenshots` + `toHaveScreenshot`). `continue-on-error: true`. Also runs coverage for gateway + web. |
| `preview.yml` | push to main · PR | Captures `__shots__/` + generates gallery, uploads as artifact. Builds Storybook + deploys to GitHub Pages (`/pr-<N>/` or `/main/`). |

---

## Coverage

Coverage reports are generated by `@vitest/coverage-v8`:

```bash
moon run gateway:test-coverage   # gateway — 40% threshold
moon run web:test-coverage       # web — 20% threshold
```

Reports land in `packages/{gateway,web}/coverage/` (gitignored). CI uploads `lcov` + `json-summary` as artifacts. Thresholds will be raised as coverage grows.

---

## Adding a test at each layer — cheatsheet

```
New shared module          → shared/src/<module>.test.ts (schema round-trip + reject)
New gateway service        → <feature>.service.test.ts (vi.fn() repository fakes)
New gateway repository     → <feature>.repository.test.ts (createTestDb())
New gateway controller     → <feature>.controller.test.ts (direct instantiation)
New web component          → stories/<Component>.stories.tsx (render + play)
New web hook/util          → <hook>.test.ts (Vitest + jsdom, RTL where needed)
New cross-package flow     → e2e/<feature>.e2e.ts (Playwright, seed + navigate + assert)
```
