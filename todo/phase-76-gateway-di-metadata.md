# Phase 76 — Gateway DI metadata: kill the silent-`undefined` injection class

> **What this builds on.** The gateway is a Nest.js app (Fastify adapter) whose
> dev loop runs via `pnpm exec tsx watch src/main.ts` ([`packages/gateway/moon.yml`](../packages/gateway/moon.yml)).
> `tsx` transpiles with **esbuild**, which — even with `emitDecoratorMetadata: true`
> in [`tsconfig`](../packages/gateway/tsconfig.json) — **elides an import that a file
> uses only as a constructor-parameter type**. When that happens Nest's
> `design:paramtypes` is `undefined` for that param, so the DI container **silently
> injects `undefined`** (no bootstrap error). The dep is only touched later, at the
> first exercised call, where it throws (`Cannot read properties of undefined`, or a
> hand-rolled `… is not wired`). It's **dev-only** (the `tsc -b` prod build keeps the
> import, so `build`/`typecheck`/CI never see it) and therefore invisible until a
> code path runs for the first time.

> **Why now.** This exact class broke the **entire SSO/auth path** during the v0.3.0
> cut — `SsoController`, `SsoService`, `AuthController`, `UsersService`, `TeamsService`,
> and `JwtService.refreshRepo` all injected `undefined` and were fixed reactively with
> explicit `@Inject(Token)` (see [`gateway/src/auth/`](../packages/gateway/src/auth/)).
> A grep finds **~27 more** undecorated injectable constructor params across the gateway
> — each a latent bug waiting for its first exercised call. `tasks.controller` already
> models the explicit-`@Inject`-everywhere workaround, but it's a workaround: verbose,
> easy to forget, and unenforced. This phase removes the **root cause** so the
> workaround is no longer needed, and adds a **behavioural backstop** so a future
> runner regression can't reintroduce the class silently.

> **Scope guardrails (CLAUDE.md).** Gateway-only. Don't touch other packages' dev
> runners (`cli`/`web` don't have the Nest DI issue). Keep the prod build (`tsc -b` →
> `dist`, `node dist/main.js`) and the hook-script copy step **behaviour-preserving** —
> this changes only the **dev transpiler** + adds a test + docs. No new runtime deps in
> the shipped graph (the SWC toolchain is a **devDependency**). `shared` stays the
> contract; no schema/API changes.

> **Effort:** **S** small · **M** medium · **L** large. Critical path is **A → B**
> (runner emits metadata → the boot test proves it). **C** documents the new reality.

---

## Current state (what exists to build on)

- **Dev runner** — `gateway:dev` = `pnpm exec tsx watch src/main.ts` with `options.envFile: '/.env'` (Phase 73/SSO work) and `preset: 'server'`. `start` = `node dist/main.js`; `build` = `tsc -b` + a node step that copies `src/terminal/hooks/*.cjs` into `dist/` ([`packages/gateway/moon.yml`](../packages/gateway/moon.yml)).
- **A `nest-cli.json` already exists** in [`packages/gateway/`](../packages/gateway/) — currently unused by the tsx dev command, but it means the Nest SWC builder path is available if `@swc-node` disappoints.
- **The workaround convention** — `tasks.controller` puts explicit `@Inject(Token)` on every constructor param; the auth modules now do too (v0.3.0). ~27 params elsewhere are undecorated and rely on reflected metadata working.
- **Guard precedent** — the repo enforces invariants with **grep-based source tests** ([`ui/src/boundary.test.ts`](../packages/ui/src/boundary.test.ts), [`shell/src/boundary.test.ts`](../packages/shell/src/boundary.test.ts)) and a **table-driven matrix spec** ([`lifecycle-writer-matrix.spec.ts`](../packages/gateway/src/tasks/lifecycle-writer-matrix.spec.ts)). A **real Nest boot** against `:memory:` SQLite is available via `createTestDb()` ([`gateway/src/test/`](../packages/gateway/src/test/)).
- **CI reality** — GitHub Actions is billing-blocked, so `moon ci` doesn't run automatically; guards must add value when run **locally** (`moon run gateway:test`).

---

## Theme A — SWC dev runner (metadata that actually emits) — **M**

> **⛔ Attempted 2026-07-21 — SWC blocked; recommend `ts-node` instead.** A spike
> (`@swc-node/register` + `.swcrc` with `decoratorMetadata`, and the `nest start -b swc`
> fallback) got the runner wired but **cannot boot the gateway**. SWC's
> `emitDecoratorMetadata` emits a **live-binding class reference** in `design:paramtypes`;
> across the gateway's **~24 `forwardRef` circular-DI pairs** (terminal↔approval, pool,
> approvals, health) that reference is accessed mid-cycle at module-eval and throws
> `ReferenceError: Cannot access 'X' before initialization` (TDZ). `tsc`/esbuild avoid this
> by emitting a *lazy property access* that yields `undefined` instead of throwing. This is
> **SWC codegen, not runner-specific** — it fails under both `@swc-node/register` and
> `nest start -b swc`. Making SWC work would require **breaking those circular deps**
> (token-based injection across PTY/approval/scheduler DI) — well beyond "swap the
> transpiler," and risky. Two lesser issues also surfaced and are cheaply fixable: swc-node
> mis-resolves the base tsconfig `paths` (point it at a paths-less tsconfig) and doesn't
> remap 11 relative `.js` import specifiers to `.ts` (normalise them).
>
> **Recommended pivot: `ts-node` (transpile-only)** — `node --watch -r
> ts-node/register/transpile-only src/main.ts`. It uses the real TS compiler, so it (a)
> **doesn't elide** constructor-param imports (fixes the exact bug — the reason prod/`tsc`
> never saw it) and (b) emits tsc-style lazy metadata → **no circular-dep TDZ**, with zero
> source refactor. Trade-off: slower per-file transpile than SWC (fine for a dev watcher).
> If revisited, retarget this theme's `.swcrc`→a ts-node config and re-verify the parity set.

Swap the gateway dev transpiler for one that honours `emitDecoratorMetadata`, so a constructor-param-only import is never elided and Nest always sees real `design:paramtypes`.

- [ ] **Add `@swc-node/register` + `@swc/core`** as gateway **devDependencies** and a `.swcrc` with `jsc.parser.decorators: true`, `jsc.transform.legacyDecorator: true`, **`jsc.transform.decoratorMetadata: true`**, `jsc.keepClassNames: true`, and a `target`/`module` matching the `tsc -b` output so runtime behaviour is unchanged.
- [ ] **Repoint `gateway:dev`** to `node --watch --import @swc-node/register/esm-register src/main.ts` (or the register form that matches the module setting), replacing `tsx watch`. Preserve `preset: 'server'`, `envFile: '/.env'`, and the `root:install` dep.
- [ ] **Keep an escape hatch** — leave the old command as a `dev:tsx` task for **one release** in case of parity surprises; note in the task comment that it re-introduces the elision bug and is temporary.
- [ ] **Verify metadata is emitted** — with a deliberately **undecorated** injectable param (e.g. one of the ~27), boot the gateway under the new runner and confirm it resolves (no `undefined`) — the failure that motivated this phase must not reproduce.
- [ ] **Parity check** — `@midnite/*` workspace resolution, hook-script paths (`resolveHookScriptPath`), WS + scheduler + pty spawn, and `--watch` reload reliability all behave as under `tsx`. Prod (`start`/`build`) untouched.

## Theme B — DI boot smoke test (behavioural backstop) — **M**

A test that proves the whole container wires cleanly — the guarantee that catches elision (or any missing provider) **regardless of cause or decorator style**, so we can safely drop the `@Inject` workaround.

- [ ] **Boot the real `AppModule`** in a Vitest spec against a `:memory:` SQLite via `createTestDb()`, letting Nest instantiate every provider (`app.init()`), then close it cleanly.
- [ ] **Assert no injected dependency is `undefined`** — walk the instantiated providers/controllers and fail if any constructor-injected property that should be a provider is `undefined` (the signature of elision). Name the offending class + param in the failure so a regression is one-line diagnosable.
- [ ] **Make it deterministic + offline** — no real network/PTY/agent spawns at boot (reuse existing test doubles/guards so `app.init()` doesn't start the scheduler tick or spawn Claude Code); tolerate legitimately `@Optional()` absent deps.
- [ ] **Wire into the gate** — runs under `moon run gateway:test` (so it bites locally even while CI is billing-blocked); fast enough to keep in the default suite (a single boot).

## Theme C — Convention & docs (retire the workaround) — **S**

Record that explicit `@Inject` is no longer required, so nobody re-adds the verbose workaround or trusts the old failure mode.

- [ ] **Update [`CLAUDE.md`](../CLAUDE.md)** (Gateway → Layering) — note the dev runner emits decorator metadata, so **`@Inject(Token)` is optional** (type-reflected injection is reliable); the boot smoke test (Theme B) is the guard. Keep `@Inject` allowed for genuine tokens (`MIDNITE_CONFIG`, string tokens) where it's actually needed.
- [ ] **Soften the `tasks.controller` precedent** — a short comment that the explicit-`@Inject`-everywhere pattern is legacy defensiveness, not required; leave the existing decorators in place (harmless, no churn).
- [ ] **Document the runner** — a note in the gateway README / `docs/` on why dev uses `@swc-node` (esbuild elision), the `dev:tsx` escape hatch + its removal timing, and how to read a boot-test failure.
- [ ] **No codemod** — the ~27 undecorated params are intentionally left as-is; they're correct once Theme A lands and Theme B proves it. (Out of scope, by decision.)

---

## Files this phase touches

| Area | Files |
|------|-------|
| gateway · runner | [`packages/gateway/moon.yml`](../packages/gateway/moon.yml) (`dev` → swc; add `dev:tsx`), **new** `packages/gateway/.swcrc`, [`packages/gateway/package.json`](../packages/gateway/package.json) (devDeps: `@swc-node/register`, `@swc/core`), root [`pnpm-lock.yaml`](../pnpm-lock.yaml) |
| gateway · guard | **new** `packages/gateway/src/di-wiring.spec.ts` (boot `AppModule` on `:memory:`, assert no `undefined` injected deps), reuse [`gateway/src/test/`](../packages/gateway/src/test/) `createTestDb()` |
| docs · convention | [`CLAUDE.md`](../CLAUDE.md) (Gateway layering note), [`packages/gateway/src/tasks/tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts) (comment), gateway README / `docs/` runner note |
| tracker | [`todo/_INDEX.md`](_INDEX.md), [`todo/done.md`](done.md) (as themes land) |

---

## Verification

- [ ] **Metadata emits:** under the new `gateway:dev`, a gateway with **undecorated** injectable constructor params boots and every dep resolves — the SSO-class failure (`… is not wired`, `Cannot read properties of undefined`) does not reproduce.
- [ ] **Boot test bites:** `moon run gateway:test` includes the DI boot smoke test; temporarily reverting to `tsx` (the `dev:tsx` path) + removing an `@Inject` makes the test **fail** with the offending class/param named (prove the guard works), then restore.
- [ ] **Parity:** `gateway:dev` watch/reload, hook scripts, WS, scheduler, and pty spawn behave as before; `moon run gateway:typecheck && gateway:test && gateway:lint` green; prod `start`/`build` unchanged.
- [ ] **Docs true:** `CLAUDE.md` reflects that `@Inject` is optional; the escape-hatch task + removal timing documented.
- [ ] No new **runtime** (non-dev) dependency added to the gateway; `shared` contract untouched.

---

## Decisions / open questions

1. **Runner mechanism** → **Resolved (user): `@swc-node/register` + `node --watch`** (lowest-churn drop-in for `tsx watch`, keeps the `main.ts` entry). The existing `nest-cli.json` (SWC builder via `nest start -b swc`) is the fallback if `@swc-node` watch reliability disappoints.
2. **Swap scope** → **Resolved (user): replace `gateway:dev` only, keep a `dev:tsx` fallback for one release.** Other tsx users (`cli:dev`) are out of scope — they have no Nest DI.
3. **Guard flavour** → **Resolved (user): behavioural full-`AppModule` boot** against `:memory:` SQLite (catches the symptom regardless of cause), **not** a static grep and **not** a "require `@Inject`" lint (which would contradict the root-cause fix).
4. **The ~27 undecorated params** → **Resolved (user): no codemod.** They're correct once SWC lands; the boot test guarantees it. `@Inject` becomes optional, not mandatory.
5. **`.swcrc` module/target** → *Open (implementation):* match the `tsc -b` output so dev and prod runtime semantics agree (ESM vs CJS, `keepClassNames`, `useDefineForClassFields`). Decorator metadata requires `legacyDecorator: true` + `decoratorMetadata: true`. Confirm `@midnite/shared` (built dist) resolves via node resolution without tsconfig `paths`.
6. **Boot without side effects** → *Open (implementation):* `app.init()` must not start the scheduler tick, spawn agents, or open real PTYs/sockets. Reuse existing test wiring; if the real `AppModule` can't boot cleanly offline, gate the heavy subsystems behind the test env or assert over a representative module set instead.
7. **Escape-hatch removal** → *Recommendation:* delete `dev:tsx` in the **next** release once the SWC runner has soaked, to avoid two divergent dev paths. *(Confirm at removal time.)*
