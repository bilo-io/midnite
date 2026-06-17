import { contextBridge } from 'electron';

// The static web bundle bakes NEXT_PUBLIC_* at build time, so the gateway URL
// (a dynamic loopback port) is injected here instead. gatewayUrl()/gatewayWsUrl()
// in the web app prefer window.__NEXT_PUBLIC_GATEWAY_URL when present.
const arg = process.argv.find((a) => a.startsWith('--gateway-url='));
const gatewayUrl = arg?.slice('--gateway-url='.length);

if (gatewayUrl) {
  try {
    contextBridge.exposeInMainWorld('__NEXT_PUBLIC_GATEWAY_URL', gatewayUrl);
  } catch {
    // contextIsolation disabled or already exposed — ignore.
  }
}
