#!/usr/bin/env node
'use strict';

/**
 * midnite Stop hook (shipped with the gateway, invoked by Claude Code via a
 * generated `--settings` file on autonomous agent sessions). Forwards Claude's
 * Stop stdin payload to the gateway, which decides whether the task is done
 * (PR opened) or merely paused. Fire-and-forget: it never blocks Claude and
 * always exits 0, so a gateway hiccup can't wedge the agent.
 *
 * Dependency-free CommonJS so it runs under `node <path>` regardless of build.
 */

function done() {
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
  if (!sessionId || !secret || !gatewayUrl) return done();

  const raw = await readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  const url = `${gatewayUrl.replace(/\/$/, '')}/hooks/sessions/${encodeURIComponent(sessionId)}/stop`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-midnite-hook-secret': secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // best-effort — the task simply doesn't advance on this Stop
  }
  done();
}

void main();
