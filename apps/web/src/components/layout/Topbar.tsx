'use client';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import Link from 'next/link';
import { useNotificationStore } from '@/store/notificationStore';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/my-work': 'My Work',
  '/notifications': 'Notifications',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/admin/users': 'Users',
  '/admin/org-chart': 'Org Chart',
  '/admin/audit-logs': 'Audit Log',
  '/admin/settings': 'System Settings',
};

export function Topbar({
  title,
  actions,
  onSearchOpen,
}: {
  title?: string;
  actions?: React.ReactNode;
  onSearchOpen?: () => void;
}) {
  const pathname = usePathname();
  const { unreadCount } = useNotificationStore();
  const pageTitle = title ?? PAGE_TITLES[pathname] ?? 'TeamTracker';

  return (
    <header className="flex h-14 items-center justify-between border-b border-c-border bg-surface/95 backdrop-blur-sm px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-text">{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-1.5">
        {actions}

        {/* Search trigger */}
        {onSearchOpen && (
          <button
            onClick={onSearchOpen}
            className="hidden sm:flex items-center gap-2 rounded-lg border border-c-border bg-surface2/50 pl-3 pr-2 py-1.5 text-xs text-text2 hover:border-accent/40 hover:text-text transition-all duration-200"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <span className="flex items-center gap-0.5 ml-1 opacity-60">
              <kbd className="rounded border border-c-border bg-surface px-1 py-0.5 text-[9px] font-mono">⌘K</kbd>
            </span>
          </button>
        )}

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-text2 hover:bg-surface2 hover:text-text transition-colors"
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
