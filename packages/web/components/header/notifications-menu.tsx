'use client';

import { Bell } from 'lucide-react';

import { useApprovalsSocket } from '@/hooks/use-approvals-socket';
import { useNotifications } from '@/components/notifications-provider';

import { HeaderIconButton } from './header-icon-button';
import { NotificationsPanel } from './notifications-panel';
import { useHeaderDropdown } from './use-header-dropdown';

/**
 * Header-actions bell: an icon-only bell with a red unread-count badge and a
 * tooltip, opening the shared {@link NotificationsPanel} below it. The panel is a
 * two-tab surface — notifications (default) and approvals — so the bell is now the
 * single home for both. This component owns the live `/ws/approvals` connection so
 * the approvals tab count stays live whether or not the panel is open.
 */
export function NotificationsMenu() {
  const { unread } = useNotifications();
  const { pending, decide } = useApprovalsSocket();
  const { open, toggle, setOpen, rootRef } = useHeaderDropdown();

  return (
    <div ref={rootRef} className="group relative">
      <HeaderIconButton label="Notifications" open={open} onClick={toggle} count={unread}>
        <Bell className="h-[1.05rem] w-[1.05rem]" />
      </HeaderIconButton>
      {open ? (
        <NotificationsPanel
          onClose={() => setOpen(false)}
          pending={pending}
          decide={decide}
          className="absolute right-0 top-full z-50 mt-2 w-[min(26rem,calc(100vw-2rem))] origin-top-right animate-panel-in"
        />
      ) : null}
    </div>
  );
}
