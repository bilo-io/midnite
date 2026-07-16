#!/usr/bin/env node
'use strict';

/**
 * midnite UserPromptSubmit hook (shipped with the gateway, invoked by Claude Code
 * on autonomous agent sessions). Claude fires this when a new prompt is submitted
 * to the session — the resume signal (Phase 69 B) that drives a blocked task from
 * `waiting` back to `wip`. We forward it so the gateway can flip the status.
 * Fire-and-forget: never blocks Claude, always exits 0.
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

  const url = `${gatewayUrl.replace(/\/$/, '')}/hooks/sessions/${encodeURIComponent(sessionId)}/user-prompt-submit`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-midnite-hook-secret': secret },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // best-effort
  }
  done();
}

void main();
