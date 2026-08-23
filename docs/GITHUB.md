# GitHub

How midnite talks to GitHub, what it needs from you, and — mostly — what it doesn't.

> **You almost certainly do not need to configure anything.** If you signed in with
> GitHub, or you have the `gh` CLI logged in on the machine running the gateway,
> midnite can already read your repositories. This document exists for the cases
> where that isn't true, and for operators running midnite for other people.

---

## The two GitHub apps, and why there are two

midnite uses GitHub in two unrelated ways, and they need different permissions:

| | **Login** | **Connect** |
|---|---|---|
| What it's for | Signing in to midnite | Reading your repos, writing GitHub Projects |
| Scopes | `read:user user:email` | `repo project read:org` |
| Configuration | None — built in | **Operator must register an app** |
| Grant | Device flow | Device flow |

They cannot share one registration. A GitHub OAuth App grants its scopes
**app-wide at first authorization**: widening the login app to `repo` would force
every existing user to re-consent just to sign in, and would hand a repo-scoped
token to people who only ever wanted to log in. So connect is a second app.

### Login needs nothing

Sign-in ships with a registered OAuth App and uses the **device flow**, so a
downloaded copy of midnite running its own local gateway can sign you in with no
client secret, no callback URL and no configuration. Nothing in this document
changes that.

### Connect must be registered

There is deliberately **no built-in client id for the connect app**. Shipping a
placeholder would be worse than shipping nothing: a plausible-looking constant
would fail at GitHub with an opaque error on every install, and it's the last
place anyone would look. Instead, connect is unconfigured until you say otherwise,
and says so with the steps below.

To enable it:

1. Go to <https://github.com/settings/developers> → **New OAuth App**.
2. Give it any name and homepage URL — neither is used by the device flow.
3. **Tick "Enable Device Flow".** This is the step people forget; without it GitHub
   reports an error that doesn't obviously name the cause.
4. Copy the **Client ID** into `midnite.json`:

   ```json
   { "workflows": { "oauth": { "github": { "clientId": "Ov23li…" } } } }
   ```

No client secret is required. The client id is a public identifier — it travels in
every authorization request — so it is not a secret and does not belong in
`.midnite/operator.json`.

Then: **Settings → Integrations → Connect GitHub**, enter the code GitHub shows
you, and the card fills in with your account.

---

## Which token is midnite actually using?

Three things can authenticate a GitHub call, and they are not interchangeable.
`midnite doctor` reports which one resolves, and Settings → Integrations names it:

1. **A connected account** (`oauth`) — yours, made through the connect flow. Scoped
   to you, and the only one you can disconnect from the Settings card.
2. **A shared personal access token** (`pat`) — a `github` credential in the vault,
   configured once for the whole install. Everyone's calls use it. Disconnecting it
   would remove it for everyone, so the card sends you to Settings → Credentials
   instead.
3. **The host's `gh` CLI** (`gh-cli`) — whatever `gh auth token` returns on the
   machine running the gateway. Not a midnite credential at all; it lives and dies
   with that machine's login.

They're tried in that order, so connecting your own account takes precedence over a
shared token without disturbing it.

### Disconnecting

Disconnecting always deletes the credential from midnite. Whether it also **revokes
the grant at GitHub** depends: revocation needs Basic auth with the app's client
secret, which a secretless device-flow install doesn't have. When it can't, the app
says so and links you to your
[app authorisations](https://github.com/settings/applications) to finish the job —
rather than claiming a revoke that never ran and leaving a live `repo`-scoped token
behind.

---

## Repositories: matched, not cloned

The repo browser (**Settings → Repos → Browse my GitHub repos**) lists your real
repositories and labels each one:

- **registered** — already a midnite repo.
- **on disk** — a checkout exists locally, matched by git remote URL. Importing it
  needs no typing: the name and path are filled in.
- **not checked out** — no local copy found.

midnite **never clones**. Matching is done by reading `.git/config` remotes under
your checkout roots and normalising them (ssh vs https, with and without `.git`).
Set `github.checkoutRoots` in `midnite.json` if your checkouts live somewhere
unusual; by default it looks at the parent directories of repos you've already
registered.

## Projects span many repositories

A midnite project can have several repos attached, one of which is **primary**. The
primary repo's path is the project's *effective working directory* — where its
agents spawn, where preview and build commands run, and what the git-status card
reports on. See **Project → Repos**.

A task's own `repo` still wins over the project's directory when it names one, as
long as that repo sits at or under the project's directory. A task pointing at a
repo somewhere else entirely defers to the project and logs a warning rather than
quietly relocating the agent to an unrelated checkout.

---

## For operators

### Hosted deployments

The **redirect grant** (client id + secret + a callback GitHub can reach) exists in
the gateway for google and slack, but is **not currently wired for GitHub connect**.
Its callback is an unauthenticated browser navigation, so it cannot attribute a
personal connection to a specific user — which would land a repo-scoped token as an
install-wide credential. Until that's fixed with an owner-stamped authenticated
start, **device flow is the only supported connect path**, hosted or not.

### Troubleshooting

| Symptom | Cause |
|---|---|
| "GitHub connect is not configured" | No `workflows.oauth.github.clientId` — see above. |
| GitHub errors immediately on connect | The app exists but **Enable Device Flow** isn't ticked. |
| Repo browser empty, no error | A token resolves but can't see those repos — check `midnite doctor` for which rung it used. |
| `midnite doctor` warns on `github` | No token resolves at all. Connect an account, add a `github` credential, or `gh auth login` on the gateway host. |

`midnite doctor`'s `github` row never fails the exit code — an install with no
GitHub connection is a supported configuration.
