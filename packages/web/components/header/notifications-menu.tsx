'use client';

import { Bell } from 'lucide-react';

import { NotificationFeedPanel } from '@/components/notification-center';
import { useNotifications } from '@/components/notifications-provider';

import { HeaderIconButton } from './header-icon-button';
import { useHeaderDropdown } from './use-header-dropdown';

/**
 * Header-actions notifications button: an icon-only bell with a red unread-count
 * badge and a tooltip, opening the shared {@link NotificationFeedPanel} as a
 * floating dropdown below it. This is notifications' home now that it's out of the
 * sidebar.
 */
export function NotificationsMenu() {
  const { unread } = useNotifications();
  const { open, toggle, setOpen, rootRef } = useHeaderDropdown();

  return (
    <div ref={rootRef} className="group relative">
      <HeaderIconButton label="Notifications" open={open} onClick={toggle} count={unread}>
        <Bell className="h-[1.05rem] w-[1.05rem]" />
      </HeaderIconButton>
      {open ? (
        <NotificationFeedPanel
          onClose={() => setOpen(false)}
          className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))]"
        />
      ) : null}
    </div>
  );
}
