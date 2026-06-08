#!/usr/bin/env node
'use strict';

/**
 * midnite PreToolUse hook (shipped with the gateway, invoked by Claude Code via a
 * generated `--settings` file). Reads the tool-call payload from stdin, forwards it
 * to the gateway authenticated by the per-session secret, and BLOCKS until a human
 * answers in the browser (or the gateway's own timeout fires). Prints Claude's
 * decision JSON (`{"decision":"allow"|"deny"|"ask"}`) to stdout and exits 0.
 *
 * Fails OPEN to `ask` (Claude's normal interactive prompt) on any missing config,
 * network error, or non-2xx — midnite must never hard-block the user by accident.
 *
 * Dependency-free CommonJS so it runs under `node <path>` regardless of how the
 * gateway itself is built/bundled.
 */

function emit(decision, reason) {
  process.stdout.write(JSON.stringify(reason ? { decision, reason } : { decision }));
  process.exit(0);
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

async function main() {
  const sessionId = process.env.MIDNITE_SESSION_ID;
  const secret = process.env.MIDNITE_HOOK_SECRET;
  const gatewayUrl = process.env.MIDNITE_GATEWAY_URL;
  if (!sessionId || !secret || !gatewayUrl) {
    emit('ask', 'midnite approval not configured');
    return;
  }

  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    emit('ask', 'unparseable hook payload');
    return;
  }

  const timeoutMs = Number(process.env.MIDNITE_HOOK_TIMEOUT_MS) || 135000;
  const url = `${gatewayUrl.replace(/\/$/, '')}/hooks/sessions/${encodeURIComponent(sessionId)}/pre-tool-use`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-midnite-hook-secret': secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      emit('ask', `gateway returned ${res.status}`);
      return;
    }
    const body = await res.json();
    const decision = body && typeof body.decision === 'string' ? body.decision : 'ask';
    emit(decision === 'allow' || decision === 'deny' ? decision : 'ask', body && body.reason);
  } catch {
    emit('ask', 'gateway unreachable');
  }
}

void main();
