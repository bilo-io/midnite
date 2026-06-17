/** Poll the gateway's /health until it responds OK or the timeout elapses. The
 *  gateway runs DB migrations before listening, so health-OK implies migrated. */
export async function waitForHealth(port: number, timeoutMs = 20000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
