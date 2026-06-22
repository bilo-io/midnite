import { contextBridge, ipcRenderer } from 'electron';
import type { Notification as MidniteNotification } from '@midnite/shared';

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

// Notification bridge: the web app raises notifications natively through the main
// process (see main/notifications.ts) and routes the window when one is clicked.
// Shape mirrors `MidniteDesktopBridge` in packages/web/lib/desktop-bridge.ts.
const NOTIFY_CHANNEL = 'midnite:notify';
const NAVIGATE_CHANNEL = 'midnite:navigate';

try {
  contextBridge.exposeInMainWorld('midniteDesktop', {
    notify: (notification: MidniteNotification) => {
      ipcRenderer.send(NOTIFY_CHANNEL, notification);
    },
    onNavigate: (handler: (route: string) => void): (() => void) => {
      const listener = (_event: unknown, route: string): void => handler(route);
      ipcRenderer.on(NAVIGATE_CHANNEL, listener);
      return () => {
        ipcRenderer.removeListener(NAVIGATE_CHANNEL, listener);
      };
    },
  });
} catch {
  // contextIsolation disabled or already exposed — ignore.
}
