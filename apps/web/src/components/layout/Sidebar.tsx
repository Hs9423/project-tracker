'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, CheckSquare, Users, BarChart2,
  Bell, Settings, LogOut, ChevronRight, FileText, Menu, X, ScrollText,
  SlidersHorizontal, Search, Zap,
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
  { href: '/admin/settings', label: 'Settings', icon: SlidersHorizontal },
];

function NavItem({
  href, label, icon: Icon, active, badge, count, onClick,
}: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; badge?: boolean; count?: number; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200',
        active
          ? 'bg-accent/15 text-accent font-medium'
          : 'text-text2 hover:bg-surface2 hover:text-text',
      )}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && count != null && count > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ onSearchOpen }: { onSearchOpen?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const isAdmin = isSuperAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  const inner = (
    <>
      {/* Logo / Brand */}
      <div className="flex h-14 items-center gap-3 border-b border-c-border px-4 bg-gradient-to-r from-accent/8 to-transparent">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-md shadow-accent/30">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text leading-none">TeamTracker</p>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-accent/70 mt-0.5">MSU</p>
        </div>
        <button className="md:hidden text-text2 hover:text-text" onClick={() => setMobileOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search shortcut */}
      <div className="px-3 py-2">
        <button
          onClick={onSearchOpen}
          className="w-full flex items-center gap-2 rounded-lg border border-c-border bg-surface2/50 px-3 py-2 text-xs text-text2 hover:border-accent/40 hover:text-text transition-all duration-200 group"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <span className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
            <kbd className="rounded border border-c-border bg-surface px-1 py-0.5 text-[9px] font-mono">⌘</kbd>
            <kbd className="rounded border border-c-border bg-surface px-1 py-0.5 text-[9px] font-mono">K</kbd>
          </span>
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon, badge }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={pathname === href || pathname.startsWith(href + '/')}
              badge={badge}
              count={badge ? unreadCount : undefined}
              onClick={() => setMobileOpen(false)}
            />
          ))}
        </div>

        {isAdmin && (
          <div className="mt-4">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-text2/60">
              Admin
            </p>
            <div className="space-y-0.5">
              {adminItems.map(({ href, label, icon }) => (
                <NavItem
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  active={pathname.startsWith(href)}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-0.5">
          <NavItem
            href="/settings"
            label="Settings"
            icon={Settings}
            active={pathname.startsWith('/settings')}
            onClick={() => setMobileOpen(false)}
          />
        </div>
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-c-border p-2">
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-surface2 transition-colors group">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-7 w-7 ring-1 ring-accent/20" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-text">{user.name}</p>
              <p className="truncate text-[10px] text-text2 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
            <button
              onClick={logout}
              className="text-text2 hover:text-red transition-colors opacity-0 group-hover:opacity-100"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 rounded-lg bg-surface border border-c-border p-1.5 text-text2 shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'flex h-screen w-56 flex-col border-r border-c-border bg-surface transition-transform duration-300',
        'fixed md:static z-50',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        {inner}
      </aside>
    </>
  );
}
