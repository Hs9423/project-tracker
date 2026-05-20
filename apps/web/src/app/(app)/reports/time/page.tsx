'use client';
import { useState } from 'react';
import { useTimeTracking, useQueueExport, useExportStatus } from '@/hooks/useReports';
import { useProjects } from '@/hooks/useProjects';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import { Download, FileText, ChevronDown, ChevronRight } from 'lucide-react';

function today(): string { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number): string { return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10); }

function ExportButtons({ filters }: { filters: Record<string, string> }) {
  const queueExport = useQueueExport();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: statusData } = useExportStatus(jobId);
  const handleExport = async (format: 'pdf' | 'csv') => {
    const result = await queueExport.mutateAsync({ type: 'time-tracking', format, filters });
    setJobId(result.jobId);
  };
  return (
    <div className="flex items-center gap-2">
      {statusData?.status === 'ready' && statusData.downloadUrl && (
        <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}${statusData.downloadUrl}`} className="flex items-center gap-1 text-xs text-green hover:underline" download>
          <Download className="h-3 w-3" /> Download ready
        </a>
      )}
      {jobId && statusData?.status === 'pending' && <span className="text-xs text-text2 flex items-center gap-1"><Spinner className="h-3 w-3" /> Generating…</span>}
      <Button size="sm" variant="outline" onClick={() => handleExport('pdf')} disabled={queueExport.isPending}><FileText className="h-3 w-3 mr-1" />PDF</Button>
      <Button size="sm" variant="outline" onClick={() => handleExport('csv')} disabled={queueExport.isPending}><Download className="h-3 w-3 mr-1" />CSV</Button>
    </div>
  );
}

export default function TimeReportPage() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [projectId, setProjectId] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const { data: projects = [] } = useProjects();
  const filters = { from, to, ...(projectId ? { projectId } : {}) };
  const { data, isLoading } = useTimeTracking(filters);

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Time Tracking</h1>
        <ExportButtons filters={filters} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="rounded border border-c-border bg-surface2 px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 text-sm text-text2">
          <label>From</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="rounded border border-c-border bg-surface2 px-2 py-1 text-text text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-text2">
          <label>To</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="rounded border border-c-border bg-surface2 px-2 py-1 text-text text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Hours', value: `${data.summary.totalHours}h`, color: 'text-accent' },
              { label: 'Avg / Day', value: `${data.summary.avgHoursPerDay}h`, color: 'text-green' },
              { label: 'Log Entries', value: data.summary.totalEntries, color: 'text-amber' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-c-border bg-surface p-4">
                <p className="text-xs text-text2 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Grouped table */}
          <div className="rounded-xl border border-c-border bg-surface overflow-hidden">
            {data.grouped.map(userGroup => {
              const expanded = expandedUsers.has(userGroup.user.id);
              return (
                <div key={userGroup.user.id} className="border-b border-c-border last:border-0">
                  <button
                    onClick={() => toggleUser(userGroup.user.id)}
                    className="flex items-center gap-3 w-full px-5 py-3 hover:bg-surface2/50 transition-colors"
                  >
                    {expanded ? <ChevronDown className="h-4 w-4 text-text2" /> : <ChevronRight className="h-4 w-4 text-text2" />}
                    <UserAvatar name={userGroup.user.name} avatarUrl={userGroup.user.avatarUrl} className="h-6 w-6 text-[10px]" />
                    <span className="text-sm font-semibold text-text">{userGroup.user.name}</span>
                    <span className="ml-auto text-sm font-medium text-accent">{userGroup.totalHours}h total</span>
                  </button>

                  {expanded && (
                    <div className="ml-8 border-t border-c-border">
                      {userGroup.projects.map(projGroup => (
                        <div key={projGroup.project.id} className="border-b border-c-border/50 last:border-0">
                          <div className="flex items-center justify-between px-5 py-2 bg-surface2/30">
                            <span className="text-xs font-medium text-text2">{projGroup.project.title}</span>
                            <span className="text-xs text-accent">{projGroup.totalHours}h</span>
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-c-border/30">
                                {['Date', 'Task', 'Hours', 'Note'].map(h => (
                                  <th key={h} className="px-5 py-1.5 text-left font-medium text-text2">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {projGroup.logs.map(log => (
                                <tr key={log.id} className="border-b border-c-border/20 hover:bg-surface2/30">
                                  <td className="px-5 py-1.5 text-text2">{log.date.slice(0, 10)}</td>
                                  <td className="px-5 py-1.5 text-text">{log.task.title}</td>
                                  <td className="px-5 py-1.5 text-amber font-medium">{log.hours}h</td>
                                  <td className="px-5 py-1.5 text-text2">{log.note ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!data.grouped.length && <p className="text-sm text-text2 p-5">No time logs for this range.</p>}
          </div>
        </>
      ) : null}
    </div>
  );
}
