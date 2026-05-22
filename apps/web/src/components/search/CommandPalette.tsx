'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, FolderOpen, CheckSquare, ArrowRight, X, Zap,
  LayoutDashboard, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useAllVisibleTasks } from '@/hooks/useTasks';
import type { Project, Task } from '@/types/api';

type ResultItem =
  | { type: 'project'; item: Project }
  | { type: 'task'; item: Task };

type QuickAction = { label: string; icon: React.ElementType; href: string; shortcut?: string };

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', shortcut: 'G D' },
  { label: 'Projects', icon: FolderOpen, href: '/projects', shortcut: 'G P' },
  { label: 'My Work', icon: CheckSquare, href: '/my-work', shortcut: 'G M' },
];

function statusIcon(status: string) {
  if (status === 'done') return <CheckCircle2 className="h-3.5 w-3.5 text-green" />;
  if (status === 'blocked') return <AlertCircle className="h-3.5 w-3.5 text-red" />;
  if (status === 'in_progress') return <Clock className="h-3.5 w-3.5 text-accent" />;
  return <CheckSquare className="h-3.5 w-3.5 text-text2" />;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useAllVisibleTasks();

  const q = query.toLowerCase().trim();

  const results: ResultItem[] = useMemo(() => {
    if (q.length < 1) return [];
    return [
      ...projects
        .filter(p => p.title.toLowerCase().includes(q))
        .slice(0, 4)
        .map(p => ({ type: 'project' as const, item: p })),
      ...tasks
        .filter(t => t.title.toLowerCase().includes(q))
        .slice(0, 6)
        .map(t => ({ type: 'task' as const, item: t })),
    ];
  }, [q, projects, tasks]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const navigateResult = useCallback((r: ResultItem) => {
    if (r.type === 'project') navigate(`/projects/${r.item.id}`);
    else navigate(`/task/${r.item.id}`);
  }, [navigate]);

  const allItems = q.length >= 1 ? results : QUICK_ACTIONS;
  const totalItems = allItems.length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => (c + 1) % Math.max(totalItems, 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => (c - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (q.length < 1 && cursor < QUICK_ACTIONS.length) {
          navigate(QUICK_ACTIONS[cursor].href);
        } else if (results[cursor]) {
          navigateResult(results[cursor]);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, cursor, results, q, totalItems, navigate, navigateResult, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" />

      {/* Palette panel */}
      <div
        className="relative w-full max-w-xl rounded-2xl border border-c-border bg-surface shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 25px 60px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(224,117,32,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Orange accent line at top */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />

        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-c-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent shrink-0">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, tasks, or jump to…"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text2 outline-none"
          />
          {query ? (
            <button onClick={() => setQuery('')} className="text-text2 hover:text-text transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="text-[10px] text-text2 border border-c-border rounded-md px-1.5 py-0.5 bg-surface2">Esc</kbd>
          )}
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-1">
          {/* Quick actions (shown when query is empty) */}
          {q.length === 0 && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text2">Quick Jump</p>
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.href}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === cursor ? 'bg-accent/10 text-text' : 'hover:bg-surface2 text-text'
                    }`}
                    onClick={() => navigate(action.href)}
                    onMouseEnter={() => setCursor(i)}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${i === cursor ? 'bg-accent/20' : 'bg-surface2'}`}>
                      <Icon className={`h-3.5 w-3.5 ${i === cursor ? 'text-accent' : 'text-text2'}`} />
                    </div>
                    <span className="text-sm flex-1">{action.label}</span>
                    {action.shortcut && (
                      <span className="text-[10px] text-text2">{action.shortcut}</span>
                    )}
                    {i === cursor && <ArrowRight className="h-3.5 w-3.5 text-text2" />}
                  </button>
                );
              })}
            </>
          )}

          {/* Search results */}
          {q.length >= 1 && results.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <Zap className="h-8 w-8 text-text2/20 mb-2" />
              <p className="text-xs text-text2">No results for <span className="text-text">&ldquo;{query}&rdquo;</span></p>
            </div>
          )}

          {q.length >= 1 && results.length > 0 && (
            <>
              {results.some(r => r.type === 'project') && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text2">Projects</p>
              )}
              {results.filter(r => r.type === 'project').map((r, i) => {
                const idx = i;
                const isActive = idx === cursor;
                return (
                  <button
                    key={r.item.id}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-accent/10 text-text' : 'hover:bg-surface2 text-text'
                    }`}
                    onClick={() => navigateResult(r)}
                    onMouseEnter={() => setCursor(idx)}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${isActive ? 'bg-accent/20' : 'bg-surface2'}`}>
                      <FolderOpen className={`h-3.5 w-3.5 ${isActive ? 'text-accent' : 'text-text2'}`} />
                    </div>
                    <span className="text-sm flex-1 truncate">{r.item.title}</span>
                    {isActive && <ArrowRight className="h-3.5 w-3.5 text-text2 shrink-0" />}
                  </button>
                );
              })}

              {results.some(r => r.type === 'task') && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text2">Tasks</p>
              )}
              {results.filter(r => r.type === 'task').map((r, i) => {
                const idx = results.filter(x => x.type === 'project').length + i;
                const isActive = idx === cursor;
                const task = r.item as Task;
                return (
                  <button
                    key={r.item.id}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-accent/10 text-text' : 'hover:bg-surface2 text-text'
                    }`}
                    onClick={() => navigateResult(r)}
                    onMouseEnter={() => setCursor(idx)}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${isActive ? 'bg-accent/20' : 'bg-surface2'}`}>
                      {statusIcon(task.status)}
                    </div>
                    <span className="text-sm flex-1 truncate">{r.item.title}</span>
                    <span className="text-[10px] text-text2 shrink-0 capitalize">{task.status.replace('_', ' ')}</span>
                    {isActive && <ArrowRight className="h-3.5 w-3.5 text-text2 shrink-0" />}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-c-border bg-surface2/40">
          <span className="flex items-center gap-1 text-[10px] text-text2">
            <kbd className="rounded border border-c-border bg-surface px-1 py-0.5 text-[9px] font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text2">
            <kbd className="rounded border border-c-border bg-surface px-1 py-0.5 text-[9px] font-mono">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1 text-[10px] text-text2">
            <kbd className="rounded border border-c-border bg-surface px-1 py-0.5 text-[9px] font-mono">Esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
