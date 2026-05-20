'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, CheckSquare, Users, BarChart2,
  Bell, Settings, LogOut, ChevronRight, FileText, Menu, X, ScrollText,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { UserAvatar } from '@/components/ui/avatar';
import { isSuperAdmin } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/my-work', label: 'My Work', icon: CheckSquare },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/notifications', label: 'Notifications', icon: Bell, badge: true },
];

const adminItems = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/org-chart', label: 'Org Chart', icon: BarChart2 },
  { href: '/admin/audit-logs', label: 'Audit Log', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const isAdmin = isSuperAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  const inner = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-c-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
          <ChevronRight className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-text flex-1">TeamTracker</span>
        <button className="md:hidden text-text2" onClick={() => setMobileOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-accent/15 text-accent' : 'text-text2 hover:bg-surface2 hover:text-text',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && unreadCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {isAdmin && (
          <div className="mt-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-text2">
              Admin
            </p>
            <div className="space-y-0.5">
              {adminItems.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                      active ? 'bg-accent/15 text-accent' : 'text-text2 hover:bg-surface2 hover:text-text',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4">
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              pathname.startsWith('/settings') ? 'bg-accent/15 text-accent' : 'text-text2 hover:bg-surface2 hover:text-text',
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
        </div>
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-c-border p-2">
          <div className="flex items-center gap-2.5 rounded-md px-3 py-2">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-7 w-7" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-text">{user.name}</p>
              <p className="truncate text-[10px] text-text2">{user.role}</p>
            </div>
            <button onClick={logout} className="text-text2 hover:text-red transition-colors" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 rounded-md bg-surface border border-c-border p-1.5 text-text2"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer / Desktop sidebar */}
      <aside className={cn(
        'flex h-screen w-56 flex-col border-r border-c-border bg-surface transition-transform',
        'fixed md:static z-50',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        {inner}
      </aside>
    </>
  );
}
