'use client';
import { useNotifications, useMarkAllRead, useMarkNotificationRead } from '@/hooks/useNotifications';
import { useNotificationStore } from '@/store/notificationStore';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Bell, CheckCheck, UserCheck, GitPullRequest, MessageSquare,
  Clock, AlertTriangle, AtSign, FolderOpen,
} from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/types/api';

function notifIcon(type: string) {
  switch (type) {
    case 'task_assigned': return <UserCheck className="h-3.5 w-3.5 text-accent" />;
    case 'task_status_changed': return <GitPullRequest className="h-3.5 w-3.5 text-green" />;
    case 'comment_added': return <MessageSquare className="h-3.5 w-3.5 text-blue-400" />;
    case 'due_date_approaching': return <Clock className="h-3.5 w-3.5 text-amber" />;
    case 'task_overdue': return <AlertTriangle className="h-3.5 w-3.5 text-red" />;
    case 'project_assigned': return <FolderOpen className="h-3.5 w-3.5 text-accent" />;
    case 'mention': return <AtSign className="h-3.5 w-3.5 text-purple-400" />;
    default: return <Bell className="h-3.5 w-3.5 text-text2" />;
  }
}

function getEntityUrl(n: Notification): string | null {
  if (!n.entityType || !n.entityId) return null;
  if (n.entityType === 'project') return `/projects/${n.entityId}`;
  return `/task/${n.entityId}`;
}

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 86400 * 7) return `${Math.floor(secs / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function NotificationItem({ n }: { n: Notification }) {
  const isUnread = !n.isRead;
  const markRead = useMarkNotificationRead();
  const router = useRouter();
  const url = getEntityUrl(n);

  const handleClick = () => {
    if (isUnread) markRead.mutate(n.id);
    if (url) router.push(url);
  };

  return (
    <div
      role={url ? 'button' : undefined}
      tabIndex={url ? 0 : undefined}
      onKeyDown={url ? e => e.key === 'Enter' && handleClick() : undefined}
      className={`flex items-start gap-3 px-4 py-3 border-b border-c-border last:border-0 transition-colors ${
        url ? 'cursor-pointer' : ''
      } ${isUnread ? 'bg-accent/5 hover:bg-accent/10' : 'hover:bg-surface2/30'}`}
      onClick={handleClick}
    >
      {/* Unread dot */}
      <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${isUnread ? 'bg-accent' : 'bg-transparent'}`} />

      {/* Icon */}
      <div className="mt-0.5 shrink-0">
        {notifIcon(n.type)}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isUnread ? 'text-text font-medium' : 'text-text2'}`}>{n.message}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-text2">{timeAgo(n.createdAt)}</p>
          {n.entityType && (
            <span className="rounded bg-surface2 px-1.5 py-0.5 text-[10px] text-text2">{n.entityType}</span>
          )}
          {url && (
            <span className="text-[10px] text-accent">View →</span>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);
  const groups: Record<string, Notification[]> = {};

  for (const n of notifications) {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const { setUnreadCount } = useNotificationStore();

  const unread = notifications.filter(n => !n.isRead).length;

  useEffect(() => { document.title = 'Notifications | TeamTracker'; }, []);

  useEffect(() => {
    setUnreadCount(unread);
  }, [unread, setUnreadCount]);

  const groups = groupByDate(notifications);

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
            <p className="text-sm font-medium text-text mb-1">You&apos;re all caught up</p>
            <p className="text-xs text-text2">Notifications for task assignments, comments, and due dates will appear here.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-4 space-y-4">
            {unread > 0 && (
              <p className="px-4 text-xs text-text2">{unread} unread</p>
            )}
            {groups.map(group => (
              <div key={group.label}>
                <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text2">{group.label}</p>
                <div className="rounded-lg border border-c-border bg-surface overflow-hidden">
                  {group.items.map(n => <NotificationItem key={n.id} n={n} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
