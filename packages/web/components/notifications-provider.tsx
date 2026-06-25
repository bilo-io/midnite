'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Notification, NotificationSeverity } from '@midnite/shared';
import { NOTIFICATIONS_WS_PATH, NotificationEventSchema } from '@midnite/shared';
import {
  clearNotifications,
  gatewayWsUrl,
  getAccessToken,
  getNotifications,
  markNotificationsRead,
} from '@/lib/api';
import type { AppSettings } from '@/lib/app-settings';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/lib/app-settings';
import { getDesktopBridge } from '@/lib/desktop-bridge';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useToast } from '@/components/toast';

/** Largest feed we keep in memory — newest-first, older entries fall off. */
const FEED_CAP = 100;

// --- Reducer (pure, exported for unit tests) -------------------------------

export type NotificationsState = {
  feed: Notification[];
  unread: number;
};

export type NotificationsAction =
  | { type: 'load'; feed: Notification[]; unread: number }
  /** A live `notification.created` frame: prepend + bump unread. */
  | { type: 'created'; notification: Notification }
  /** Mark a set of ids read locally (mirrors the server's mark-read). */
  | { type: 'markRead'; ids: string[] }
  | { type: 'markAllRead' }
  | { type: 'clear' };

export const initialNotificationsState: NotificationsState = { feed: [], unread: 0 };

/**
 * Pure feed reducer. The provider drives the side effects (WS, REST, toast,
 * browser notification); this only owns the in-memory feed + unread count so it
 * can be unit-tested without a socket.
 */
export function notificationsReducer(
  state: NotificationsState,
  action: NotificationsAction,
): NotificationsState {
  switch (action.type) {
    case 'load':
      return { feed: action.feed.slice(0, FEED_CAP), unread: action.unread };
    case 'created': {
      // De-dupe: a frame can race the initial fetch, so drop any existing copy.
      const without = state.feed.filter((n) => n.id !== action.notification.id);
      const feed = [action.notification, ...without].slice(0, FEED_CAP);
      const unread = feed.filter((n) => n.readAt === null).length;
      return { feed, unread };
    }
    case 'markRead': {
      const ids = new Set(action.ids);
      const now = new Date().toISOString();
      const feed = state.feed.map((n) =>
        ids.has(n.id) && n.readAt === null ? { ...n, readAt: now } : n,
      );
      return { feed, unread: feed.filter((n) => n.readAt === null).length };
    }
    case 'markAllRead': {
      const now = new Date().toISOString();
      const feed = state.feed.map((n) => (n.readAt === null ? { ...n, readAt: now } : n));
      return { feed, unread: 0 };
    }
    case 'clear':
      return { feed: [], unread: 0 };
    default:
      return state;
  }
}

// --- Context ---------------------------------------------------------------

export type NotificationsApi = {
  feed: Notification[];
  unread: number;
  /** True until the initial feed fetch resolves (drives the loading state). */
  loading: boolean;
  markRead: (ids: string[]) => void;
  markAllRead: () => void;
  clear: () => void;
};

const NotificationsContext = createContext<NotificationsApi | null>(null);

/**
 * Read the notification feed + actions. Must be used under {@link NotificationsProvider}
 * (mounted once in the (main) layout next to the other live-data providers).
 */
export function useNotifications(): NotificationsApi {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}

// --- Provider --------------------------------------------------------------

/**
 * Map a notification severity onto the (success/error) toast variants the toast
 * API exposes today. `urgent`/`warn` use the destructive (error) styling; `info`
 * uses the affirmative one. `urgent` also gets a long-lived toast — the closest
 * approximation to "sticky" the current toast API allows (it has no sticky flag).
 */
export const URGENT_TOAST_MS = 60_000;

export function toastForSeverity(
  toast: ReturnType<typeof useToast>,
  severity: NotificationSeverity,
  message: string,
): void {
  if (severity === 'urgent') {
    toast.error(message, { duration: URGENT_TOAST_MS });
  } else if (severity === 'warn') {
    toast.error(message);
  } else {
    toast.success(message);
  }
}

/**
 * Shared gate for raising an out-of-app notification: the user opted in
 * (`notifyTaskUpdates`) **and** the tab/window is backgrounded — so we don't double
 * up with the in-app toast while they're looking at the app.
 */
function shouldNotifyWhileAway(notifyEnabled: boolean, hidden: boolean): boolean {
  return notifyEnabled && hidden;
}

/**
 * Whether a created notification should raise a *browser* notification (the plain-web
 * path): {@link shouldNotifyWhileAway} **and** the browser granted permission. Pure so
 * the gate (the behaviour that replaced the old task-event hook) is unit-testable
 * without a DOM. The desktop path uses {@link chooseNotificationDelivery} instead — the
 * OS, not the web Notification API, governs its permission.
 */
export function shouldRaiseBrowserNotification(opts: {
  notifyEnabled: boolean;
  permission: NotificationPermission;
  hidden: boolean;
}): boolean {
  return shouldNotifyWhileAway(opts.notifyEnabled, opts.hidden) && opts.permission === 'granted';
}

export type NotificationDelivery = 'desktop' | 'browser' | 'none';

/**
 * Pick how a created notification is raised out-of-app. Inside the Electron shell
 * (`hasDesktopBridge`) we hand it to the main process for a native OS notification —
 * which fires reliably even when the window is backgrounded/throttled and where the OS
 * (not the web Notification API) owns the permission, so no `permission` gate applies.
 * In a plain browser we fall back to the web Notification API, which needs a granted
 * permission. Either way the user must have opted in and the window must be away
 * (otherwise the in-app toast covers it). Pure + exported for unit tests.
 */
export function chooseNotificationDelivery(opts: {
  hasDesktopBridge: boolean;
  notifyEnabled: boolean;
  permission: NotificationPermission;
  hidden: boolean;
}): NotificationDelivery {
  if (!shouldNotifyWhileAway(opts.notifyEnabled, opts.hidden)) return 'none';
  if (opts.hasDesktopBridge) return 'desktop';
  return opts.permission === 'granted' ? 'browser' : 'none';
}

/**
 * Live notification center wiring: fetch the persisted feed on mount, then keep
 * it current from the gateway's `/ws/notifications` socket (mirrors
 * {@link useTaskEvents}: subscribe frame, validate with `NotificationEventSchema`,
 * capped-backoff reconnect, cleanup). On each `notification.created` it prepends
 * to the in-memory feed, bumps unread, raises a severity-styled in-app toast, and
 * — only when the user opted into `notifyTaskUpdates`, the browser granted the
 * Notification permission, and the tab is hidden — raises a browser notification
 * that focuses + routes the window on click. Renders its children unchanged.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [state, dispatch] = useReducer(notificationsReducer, initialNotificationsState);
  const loadingRef = useRef(true);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);

  // Latest values the WS handler closes over, without re-opening the socket when
  // they change (the socket effect must run once, like use-task-events).
  const notifyEnabled = settings.notifyTaskUpdates;
  const handlerDeps = useRef({ notifyEnabled, router, toast });
  handlerDeps.current = { notifyEnabled, router, toast };

  // Initial feed fetch.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getNotifications();
        if (!cancelled) dispatch({ type: 'load', feed: res.notifications, unread: res.unread });
      } catch {
        // A failed fetch leaves an empty feed; the WS still streams new ones.
      } finally {
        if (!cancelled) {
          loadingRef.current = false;
          forceRender();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Raise the out-of-app notification for a created entry, gated on the opt-in and a
  // backgrounded window (don't double up with the toast while the user is looking at
  // the app). Inside the desktop shell this hands off to the main process for a native
  // OS notification (which also owns the click → focus/route); in a plain browser it
  // uses the web Notification API, which additionally needs a granted permission.
  const maybeRaiseNativeNotification = useCallback((n: Notification) => {
    const { notifyEnabled: enabled, router: r } = handlerDeps.current;
    if (typeof window === 'undefined') return;
    const bridge = getDesktopBridge();
    const permission: NotificationPermission =
      'Notification' in window ? Notification.permission : 'denied';
    const delivery = chooseNotificationDelivery({
      hasDesktopBridge: bridge !== null,
      notifyEnabled: enabled,
      permission,
      hidden: document.hidden,
    });
    if (delivery === 'none') return;
    if (delivery === 'desktop') {
      // The main process raises the native notification and, on click, focuses the
      // window + sends the route back over IPC (see the onNavigate effect below).
      bridge?.notify(n);
      return;
    }
    try {
      const browserNotification = new Notification(n.title, {
        body: n.body,
        tag: `midnite-notification-${n.id}`,
      });
      browserNotification.onclick = () => {
        window.focus();
        r.push(n.route);
        browserNotification.close();
      };
    } catch {
      // construction can throw if blocked; ignore
    }
  }, []);

  // Route the (stable) raiser through a ref so the socket effect can run once
  // (`[]` deps, like use-task-events) and never churn if the callback gains deps.
  const maybeRaiseRef = useRef(maybeRaiseNativeNotification);
  maybeRaiseRef.current = maybeRaiseNativeNotification;

  // Desktop only: when a native notification is clicked, the main process focuses the
  // window and sends its route here — push it onto the router. Mounted once; no-op (and
  // no listener) in a plain browser where the bridge is absent.
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge) return;
    return bridge.onNavigate((route) => handlerDeps.current.router.push(route));
  }, []);

  // The live socket — mounted once, mirrors use-task-events.
  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleReconnect(): void {
      if (closed) return;
      const delay = Math.min(30_000, 500 * 2 ** attempt);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    }

    function connect(): void {
      if (closed) return;
      try {
        const token = getAccessToken();
        const wsUrl = `${gatewayWsUrl()}${NOTIFICATIONS_WS_PATH}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        ws = new WebSocket(wsUrl);
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onopen = () => {
        attempt = 0;
        ws?.send(JSON.stringify({ type: 'subscribe' }));
      };
      ws.onmessage = (ev) => {
        // Validate defensively so a malformed frame can't corrupt the feed.
        try {
          const parsed = NotificationEventSchema.safeParse(JSON.parse(String(ev.data)));
          if (!parsed.success) return;
          if (parsed.data.type === 'notification.created') {
            const { notification } = parsed.data;
            dispatch({ type: 'created', notification });
            toastForSeverity(handlerDeps.current.toast, notification.severity, notification.title);
            maybeRaiseRef.current(notification);
          }
        } catch {
          // ignore unparseable frames
        }
      };
      ws.onclose = () => {
        ws = null;
        scheduleReconnect();
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          // already closing
        }
      };
    }

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        // already closing
      }
    };
  }, []);

  const markRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    dispatch({ type: 'markRead', ids });
    void markNotificationsRead({ ids }).catch(() => {
      // The optimistic local update stands even if the server write fails; the
      // next fetch reconciles.
    });
  }, []);

  const markAllRead = useCallback(() => {
    dispatch({ type: 'markAllRead' });
    void markNotificationsRead({ all: true }).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
    void clearNotifications().catch(() => {});
  }, []);

  const api = useMemo<NotificationsApi>(
    () => ({
      feed: state.feed,
      unread: state.unread,
      loading: loadingRef.current,
      markRead,
      markAllRead,
      clear,
    }),
    [state.feed, state.unread, markRead, markAllRead, clear],
  );

  return <NotificationsContext.Provider value={api}>{children}</NotificationsContext.Provider>;
}
