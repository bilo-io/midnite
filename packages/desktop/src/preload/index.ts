import { contextBridge, ipcRenderer } from 'electron';
import type { Notification as MidniteNotification } from '@midnite/shared';

import type { UpdateChannel } from '../updates/floor';
import {
  UPDATE_CHANNEL_CHANNEL,
  UPDATE_CHECK_CHANNEL,
  UPDATE_DOWNLOAD_CHANNEL,
  UPDATE_RESTART_CHANNEL,
  UPDATE_STATE_CHANNEL,
  type UpdateState,
} from '../updates/update-state';

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

// Update bridge: the web UpdateBanner (Phase 71 Theme E) drives electron-updater
// through here — subscribe to state, then check/download/restart on user clicks.
// Shape mirrors `UpdatesBridge` in packages/web/lib/desktop-bridge.ts.
try {
  contextBridge.exposeInMainWorld('midnite', {
    updates: {
      onState: (handler: (state: UpdateState) => void): (() => void) => {
        const listener = (_event: unknown, state: UpdateState): void => handler(state);
        ipcRenderer.on(UPDATE_STATE_CHANNEL, listener);
        return () => {
          ipcRenderer.removeListener(UPDATE_STATE_CHANNEL, listener);
        };
      },
      check: () => ipcRenderer.send(UPDATE_CHECK_CHANNEL),
      download: () => ipcRenderer.send(UPDATE_DOWNLOAD_CHANNEL),
      restartToInstall: () => ipcRenderer.send(UPDATE_RESTART_CHANNEL),
      setChannel: (channel: UpdateChannel) => ipcRenderer.send(UPDATE_CHANNEL_CHANNEL, channel),
    },
  });
} catch {
  // contextIsolation disabled or already exposed — ignore.
}
