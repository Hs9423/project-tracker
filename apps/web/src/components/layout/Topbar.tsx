'use client';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useNotificationStore } from '@/store/notificationStore';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/my-work': 'My Work',
  '/notifications': 'Notifications',
  '/admin/users': 'Users',
  '/admin/org-chart': 'Org Chart',
};

export function Topbar({ title, actions }: { title?: string; actions?: React.ReactNode }) {
  const pathname = usePathname();
  const { unreadCount } = useNotificationStore();
  const pageTitle = title ?? PAGE_TITLES[pathname] ?? 'Project Tracker';

  return (
    <header className="flex h-14 items-center justify-between border-b border-c-border bg-surface px-6">
      <h1 className="text-sm font-semibold text-text">{pageTitle}</h1>
      <div className="flex items-center gap-2">
        {actions}
        <Link
          href="/notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-text2 hover:bg-surface2 hover:text-text transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
