'use client';
import { useState, useEffect } from 'react';
import { useAuditLogs } from '@/hooks/useAdmin';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Search } from 'lucide-react';
import { UserAvatar } from '@/components/ui/avatar';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function actionColor(action: string): string {
  if (action.includes('delete') || action.includes('deactivate')) return 'text-red';
  if (action.includes('create')) return 'text-green';
  if (action.includes('update') || action.includes('patch') || action.includes('move')) return 'text-amber';
  return 'text-text2';
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  useEffect(() => { document.title = 'Audit Log | TeamTracker'; }, []);

  const { data, isLoading } = useAuditLogs({
    page: String(page),
    limit: '30',
    ...(search ? { action: search } : {}),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Audit Log" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="relative max-w-xs mb-5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text2" />
          <Input
            className="pl-8 text-sm h-8"
            placeholder="Filter by action…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-c-border bg-surface2/50">
                  <th className="py-2.5 pl-4 text-left text-xs font-medium text-text2">Time</th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-text2">Actor</th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-text2">Action</th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-text2">Entity</th>
                  <th className="py-2.5 pr-4 text-left text-xs font-medium text-text2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-c-border">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-surface2/30 transition-colors">
                    <td className="py-2.5 pl-4 w-32 shrink-0">
                      <span className="text-xs text-text2 whitespace-nowrap">{relativeTime(log.createdAt)}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.actor ? (
                        <div className="flex items-center gap-1.5">
                          <UserAvatar name={log.actor.name} avatarUrl={log.actor.avatarUrl} className="h-5 w-5 text-[9px]" />
                          <span className="text-xs text-text">{log.actor.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-text2/50 font-mono">{log.actorId?.slice(0, 8) ?? '—'}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-mono font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.entityType ? (
                        <span className="text-xs text-text2">
                          {log.entityType}
                          {log.entityId && (
                            <span className="text-text2/50 ml-1 font-mono">{log.entityId.slice(0, 8)}…</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-text2/50">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 max-w-xs">
                      {log.metadata ? (
                        <span className="text-xs text-text2 truncate block">
                          {JSON.stringify(log.metadata).slice(0, 80)}
                          {JSON.stringify(log.metadata).length > 80 ? '…' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-text2/50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-text2">No audit logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {meta && meta.pages > 1 && (
              <div className="flex items-center justify-between border-t border-c-border px-4 py-3">
                <span className="text-xs text-text2">{meta.total} total</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    Previous
                  </Button>
                  <span className="text-xs text-text2">{page} / {meta.pages}</span>
                  <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page === meta.pages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
