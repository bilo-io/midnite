# Phase 47 — CLI Power-User Pass (brand, colour, prompts, scripting)

> The CLI ([`packages/cli`](../packages/cli/)) has broad command coverage (~20 commands —
> `add`/`list`/`move`/`block`/`search`/`workflow`/`template`/`plan`/`watch`/`login`/…) but a
> **plain** presentation: no colour, no spinners, and interactive bits are hand-rolled
> (`plan` uses raw [`node:readline`](../packages/cli/src/index.ts), `login` does TTY raw-mode).
> Notably **chalk and ora aren't even installed** — CLAUDE.md *claims* the CLI uses
> "chalk for colours, ora for spinners, cli-table3 for tables", but only `cli-table3` is real.
> Phase 47 is the **UX coherence pass**: a branded ANSI logo, a colour vocabulary that mirrors
> the web's status/kind hues, ora spinners on every async call, real `inquirer` prompts, plus
> the power-user staples — global `--json` output, shell completions, and bulk-by-filter ops.
> It makes the CLI feel as finished as the board, and makes the CLAUDE.md claim true.

> **Scope guardrails (CLAUDE.md).** The CLI stays **thin**: parse args → call the shared typed
> API client → render. **No business logic, no new gateway endpoints.** Bulk ops loop
> **client-side** over existing [`GatewayClient`](../packages/cli/src/client.ts) methods
> (`moveTask`, etc.) — no batch-mutation API. All presentation helpers (logo, colour palette,
> spinner wrapper, the `isInteractive()` gate) are **pure** and live in
> [`cli/src/lib/`](../packages/cli/src/); side-effecting prompt flows stay in the command files.
> Colour, spinners, and the logo **degrade gracefully**: auto-off when piped / non-TTY /
> `NO_COLOR` set, and **forced off by `--json`** so machine output is never polluted. The
> existing [`watch`](../packages/cli/src/) ink TUI is **reused** (logo as its splash), **not**
> rewritten. The colour vocabulary mirrors the existing
> [`@midnite/ui` token hues](../packages/ui/src/styles/tokens.css) — same semantics, terminal
> palette; no new shared contract.

> Effort tags: **S** small · **M** medium · **L** large. **A** (brand chrome) is the visible
> hook; **B** (colour) + **C** (spinners) are the everywhere-pass that touches every command;
> **D** (prompts) replaces the hand-rolled interactivity; **E** (`--json`) + **F** (completions +
> bulk) are the scripting/power-user layer. A is independent; B/C/D are the core pass; E/F build
> on the central render helpers B introduces.

---

## Current state (what exists to build on)

- **Command surface** — [`cli/src/index.ts`](../packages/cli/src/index.ts) registers ~20
  commands via **commander** with `task`/`workflow`/`template` subgroups; render helpers split
  into [`bulk.ts`](../packages/cli/src/), [`search.ts`](../packages/cli/src/),
  [`workflow.ts`](../packages/cli/src/), [`template.ts`](../packages/cli/src/).
- **Typed client** — [`client.ts`](../packages/cli/src/client.ts) (`createClient(baseUrl, token)`)
  exposes ~18 methods, every response zod-validated against `@midnite/shared`. **All rendering
  flows through this** — the seam where spinners wrap.
- **Render stack today** — `cli-table3` tables + plain `console.log`; **no chalk, no ora**
  (neither is a dependency). Interactive: `plan`'s `node:readline` confirm, `login`'s TTY raw
  password. No `--json`, no completions.
- **Existing TUI** — the [`watch`](../packages/cli/src/) command is a full **ink/React**
  dashboard (board + pool + logs + status bar). Keep it; give it a logo splash.
- **Global flags** — `--gateway <url>` (or `$MIDNITE_GATEWAY_URL`) and `--token` already exist
  on the root program; `--json` joins them as a global.
- **Brand** — [`packages/web/public/logo.PNG`](../packages/web/public/logo.PNG): a minimalist
  **black/white circle split into quadrants**. Brand/semantic hues live as HSL triplets in
  [`ui/src/styles/tokens.css`](../packages/ui/src/styles/tokens.css) (`--status-*`, `--kind-*`,
  `--success` `142`, `--destructive` `0`, Claude accent `#D97757`) — the palette to mirror.

---

## Theme A — Brand chrome + ANSI logo — ✅ DONE (PR #248, 2026-06-30)

A recognisable midnite mark and banner, shown at the right moments. *(See [`done.md`](done.md).)*

---

## Theme B — Colour vocabulary — **M**

One terminal palette, mirroring the web, applied across every renderer.

- [ ] **`cli/src/lib/palette.ts`** — chalk-based helpers mapping the domain vocabulary to colour:
      task **status** (`todo`/`wip`/`waiting`/`done`/`abandoned`/`backlog`), **kind**
      (`bug`/`feature`/`question`/`chore`), and **priority** (0–3) — chosen to echo the
      [`@midnite/ui` hues](../packages/ui/src/styles/tokens.css) (wip→orange, done→green,
      bug→red, …). Plus generic accents: success/error/warn/dim/heading.
- [ ] Apply across **every** table/list renderer — [`index.ts`](../packages/cli/src/index.ts)
      (`list`, `move`), [`bulk.ts`](../packages/cli/src/), [`search.ts`](../packages/cli/src/),
      [`workflow.ts`](../packages/cli/src/), [`template.ts`](../packages/cli/src/),
      `check` — so a status/kind/result reads the same colour everywhere (and matches the board).
- [ ] All colour routes through the `isInteractive()` gate — auto-off when piped / `NO_COLOR` /
      `--json`. (chalk already self-detects TTY; the gate makes `--json` and our policy explicit.)

---

## Theme C — Spinners & progress — **S–M**

Every async call shows it's working, then resolves to a clear success/fail.

- [ ] **`cli/src/lib/spinner.ts`** — a thin ora wrapper: `withSpinner(text, fn)` that starts a
      spinner, runs the async work, and lands on `succeed`/`fail` with a tidy message (reusing the
      Theme B accents). No-ops to a plain log line when non-TTY / `--json`.
- [ ] Wrap every `GatewayClient` call site that can take a beat — `login`, `add`/`createBulk`,
      `search`, `runWorkflow`, `plan` (the LLM breakdown), `installTemplate`, `check`,
      `exportTask`. Errors land as a failed spinner with the client's human-readable message
      (the client already throws `gateway URL + reason`).
- [ ] For multi-item work (bulk ops, Theme F) show progress (`n/total`) rather than one
      indefinite spinner.

---

## Theme D — Interactive prompts (inquirer) — **M**

Replace the hand-rolled interactivity; add guided flows.

- [ ] Add **`@inquirer/prompts`**; **replace** `plan`'s `node:readline` confirm and `login`'s
      raw-mode password with `confirm` / `password` prompts (same behaviour, less hand-rolled
      TTY code).
- [ ] **`midnite add`** with no prompt → a guided flow: prompt for the task text, then
      repo / priority / project / depends-on (each optional, sensible defaults). Passing the
      prompt positionally keeps the current non-interactive path unchanged.
- [ ] **Fuzzy task-pick** for `move` / `block` / `unblock` when the id is omitted: a `search`
      (autocomplete) prompt over `listTasks()` — pick a task by typing its title instead of
      copying a UUID. Falls back to a plain list (or errors asking for an id) when non-TTY.
- [ ] **`template install`** with missing `--cred` slots → prompt for each slot
      (reuse [`getTemplateSlots`](../packages/cli/src/client.ts)). `--yes` / explicit flags skip
      all prompts (CI-safe).

---

## Theme E — Machine output (`--json`) — **S–M**

Make the CLI scriptable.

- [ ] A **global `--json`** flag on the root program. When set: every read command emits the raw
      validated payload as JSON to stdout (one object/array, nothing else) and **all chrome is
      forced off** (no colour, no spinner, no logo, no table).
- [ ] Cover the read surface: `list`, `search`, `whoami`, `workflow list` / `workflow runs`,
      `template list`, `check` (the run results). Each already holds a typed object from the
      client — `--json` just `JSON.stringify`s it instead of rendering a table.
- [ ] Write commands (`add`, `move`, `run`) under `--json` print the created/updated object
      (e.g. the new task) so a script can capture the id. Errors under `--json` go to **stderr**
      as `{ "error": "…" }` with a non-zero exit, keeping stdout clean.

---

## Theme F — Shell completions + bulk-by-filter ops — **M**

The power-user staples.

- [ ] **`midnite completion <bash|zsh|fish>`** — emit a static completion script for the named
      shell (commander's command/flag tree; documented install snippet in the README). No daemon,
      no eval-at-runtime — print-and-source.
- [ ] **Bulk-by-filter** `move` / `prioritise`: e.g. `midnite move --status wip done` or
      `midnite prioritise --status todo 3` — resolve the set via `listTasks(status)` client-side,
      then **loop** the existing `moveTask` / (priority via task update) per id with a progress
      spinner (Theme C). **No gateway change.** A confirmation prompt (Theme D) guards a
      multi-task mutation unless `--yes`.
- [ ] Per-item **summary table** at the end (id, title, ✓/✗, error) — partial failures are
      reported, not swallowed (client-side loop means no atomicity; see Decision §4).

---

## Files this phase touches (map)

- **New (cli):** [`cli/src/lib/brand.ts`](../packages/cli/src/) (logo + banner + `isInteractive`),
  [`cli/src/lib/palette.ts`](../packages/cli/src/) (chalk colour vocabulary),
  [`cli/src/lib/spinner.ts`](../packages/cli/src/) (ora wrapper),
  `cli/src/commands/completion.ts` (or inline) for the completion command
- **Edit (cli):** [`index.ts`](../packages/cli/src/index.ts) — global `--json`, banner on bare
  invoke/help, wire spinners + palette + prompts into `list`/`move`/`add`/`block`/`unblock`;
  bulk-by-filter on `move`/`prioritise`
- **Edit (cli):** [`bulk.ts`](../packages/cli/src/) · [`search.ts`](../packages/cli/src/) ·
  [`workflow.ts`](../packages/cli/src/) · [`template.ts`](../packages/cli/src/) — colour + `--json`
  branch in each renderer; `plan`/`login` prompts → inquirer; `watch` splash uses the logo
- **Edit (cli):** [`packages/cli/package.json`](../packages/cli/package.json) — add `chalk`,
  `ora`, `@inquirer/prompts` (make CLAUDE.md's claim true)
- **Reuse (unchanged):** [`client.ts`](../packages/cli/src/client.ts) and all of `@midnite/shared`
  — no gateway/shared changes; the [`watch`](../packages/cli/src/) ink TUI keeps its components
- **Docs:** [`packages/cli/README.md`](../packages/cli/README.md) (or the CLI section) — `--json`,
  completions install, interactive flows; reconcile the CLAUDE.md "chalk/ora" line with reality

---

## Verification

- [ ] Bare `midnite` (and `midnite --help`) show the ANSI logo + wordmark + version; the logo also
      heads the `watch` dashboard. The logo/colour vanish under `NO_COLOR`, when piped, and under
      `--json`.
- [ ] `list`, `search`, `check`, `workflow list`, `template list` render with the status/kind/
      priority colour vocabulary, and the colours match the board's semantics (wip orange, done
      green, bug red, …).
- [ ] Every async command shows an ora spinner that resolves to a clear success/fail line; a
      gateway error surfaces as a failed spinner with the human-readable message (non-zero exit).
- [ ] `midnite add` (no args) walks an inquirer flow; `move`/`block` with no id offer a fuzzy
      task-pick; `plan` and `login` use inquirer prompts; `--yes`/explicit flags skip all prompts
      (CI path unchanged).
- [ ] `midnite list --json` (and `search`/`whoami`/`workflow`/`template`/`check`) print only valid
      JSON to stdout (no colour/spinner/logo); errors under `--json` go to stderr as
      `{ "error": … }` with a non-zero exit. `midnite add --json` prints the created task.
- [ ] `midnite completion zsh` (and bash/fish) emit a sourceable completion script;
      `midnite move --status wip done` resolves the set, confirms (unless `--yes`), moves each with
      progress, and prints a per-item summary including any failures.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green; CLI unit tests cover the
      palette mapping, the `isInteractive()` gate, the `--json` branch (snapshot the JSON shape),
      and the bulk-filter summary; non-TTY behaviour asserted (no ANSI in piped output).

---

## Decisions / open questions

1. **Scope breadth** *(settled: full power-user pass).* Beyond the four named pieces
   (logo/chalk/ora/inquirer) the phase also lands `--json` (Theme E) and completions +
   bulk-by-filter (Theme F).
2. **Logo treatment** *(settled: colour ANSI, key moments).* ANSI half-block art in brand colour,
   shown on bare invoke / help / `watch` splash — not on every command — and suppressed under
   `NO_COLOR`/pipe/`--json`.
3. **Dependency versions** *(recommend: modern ESM — chalk 5, ora 8, `@inquirer/prompts`).* The
   CLI is TS/ESM; pin the current ESM majors. Confirm the build/bundle (tsx/the CLI's emit) is
   happy with ESM-only deps early — the one packaging risk.
4. **Bulk atomicity** *(recommend: accept client-side, no gateway batch endpoint).* Bulk ops loop
   over existing client methods to honour the thin-CLI rule, so partial failure is possible —
   surface it in a per-item summary rather than pretending atomicity. A real batch-mutation API is
   future work if it's ever needed.
5. **`isInteractive()` precedence** *(recommend: `--json` > `NO_COLOR`/pipe > TTY).* One gate owns
   the policy so colour, spinners, prompts, and the logo all agree; `--json` is the hard off
   switch (machine output must never carry chrome). Prompts additionally require a TTY — under
   `--json`/non-TTY, a missing required value is an error, not a hang.
6. **Fuzzy task-pick source** *(recommend: `@inquirer/prompts` search over `listTasks()`).* Client
   already returns typed tasks; the autocomplete filters titles locally. Falls back to "id
   required" when non-TTY. No new endpoint.
7. **Priority bulk op** *(open: does the client expose a priority update?).* `move` updates status;
   if there's no priority-update method on [`client.ts`](../packages/cli/src/client.ts), `prioritise`
   either reuses an existing task-update call or is dropped from F's first cut — confirm during
   Theme F (no gateway change either way).
8. **CLAUDE.md reconciliation** *(recommend: update the doc as part of this phase).* Today it
   asserts the CLI uses chalk/ora; this phase makes that true, so the note needs no change once
   landed — but call it out in the PR so the claim and the code match.
