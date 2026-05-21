'use client';
import { useNotifications, useMarkAllRead, useMarkNotificationRead } from '@/hooks/useNotifications';
import { useNotificationStore } from '@/store/notificationStore';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect } from 'react';
import type { Notification } from '@/types/api';

function NotificationItem({ n }: { n: Notification }) {
  const isUnread = !n.isRead;
  const markRead = useMarkNotificationRead();
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-c-border last:border-0 transition-colors cursor-pointer ${isUnread ? 'bg-accent/5 hover:bg-accent/10' : 'hover:bg-surface2/30'}`}
      onClick={() => { if (isUnread) markRead.mutate(n.id); }}
    >
      <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${isUnread ? 'bg-accent' : 'bg-transparent'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isUnread ? 'text-text font-medium' : 'text-text2'}`}>{n.message}</p>
        <p className="text-[10px] text-text2 mt-0.5">
          {new Date(n.createdAt).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
      {n.entityType && (
        <span className="rounded bg-surface2 px-1.5 py-0.5 text-[10px] text-text2 shrink-0">
          {n.entityType}
        </span>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const { setUnreadCount } = useNotificationStore();

  const unread = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    setUnreadCount(unread);
  }, [unread, setUnreadCount]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Notifications"
        actions={
          unread > 0 ? (
            <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-10 w-10 text-text2 mb-3" />
            <p className="text-sm text-text2">You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-4">
            {unread > 0 && (
              <p className="px-4 pb-2 text-xs text-text2">{unread} unread</p>
            )}
            <div className="rounded-lg border border-c-border bg-surface overflow-hidden">
              {notifications.map(n => <NotificationItem key={n.id} n={n} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
