'use client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useWorkload, useQueueExport, useExportStatus } from '@/hooks/useReports';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, X } from 'lucide-react';
import { STATUS_LABELS, TASK_STATUSES } from '@/lib/statusHelpers';
import type { WorkloadRow } from '@/types/api';

function today(): string { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number): string { return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10); }

function loadColor(pct: number): string {
  if (pct >= 100) return '#f87171';
  if (pct >= 80) return '#fbbf24';
  return '#34d399';
}

function ExportButtons({ from, to }: { from: string; to: string }) {
  const queueExport = useQueueExport();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: statusData } = useExportStatus(jobId);
  const handleExport = async (format: 'pdf' | 'csv') => {
    const result = await queueExport.mutateAsync({ type: 'workload', format, filters: { from, to } });
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

function WorkloadBreakdownModal({ row, onClose }: { row: WorkloadRow; onClose: () => void }) {
  const tasksByStatus = row.tasksByStatus ?? {};
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserAvatar name={row.user.name} avatarUrl={row.user.avatarUrl} className="h-6 w-6 text-[10px]" />
            {row.user.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm mt-1">
          <div className="rounded-lg bg-surface2 p-3 text-center">
            <p className="text-xl font-semibold text-text">{row.taskCount}</p>
            <p className="text-xs text-text2 mt-0.5">Tasks assigned</p>
          </div>
          <div className="rounded-lg bg-surface2 p-3 text-center">
            <p className="text-xl font-semibold" style={{ color: row.loadPercent >= 100 ? '#f87171' : row.loadPercent >= 80 ? '#fbbf24' : '#34d399' }}>
              {row.loadPercent}%
            </p>
            <p className="text-xs text-text2 mt-0.5">Load</p>
          </div>
          <div className="rounded-lg bg-surface2 p-3 text-center">
            <p className="text-xl font-semibold text-text">{row.estimatedHours}h</p>
            <p className="text-xs text-text2 mt-0.5">Estimated</p>
          </div>
          <div className="rounded-lg bg-surface2 p-3 text-center">
            <p className="text-xl font-semibold text-text">{row.loggedHours}h</p>
            <p className="text-xs text-text2 mt-0.5">Logged</p>
          </div>
        </div>
        {row.overdueCount > 0 && (
          <p className="text-xs text-red font-medium mt-1">{row.overdueCount} overdue task{row.overdueCount > 1 ? 's' : ''}</p>
        )}
        {Object.keys(tasksByStatus).length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-text mb-2">By status</p>
            <div className="space-y-1.5">
              {TASK_STATUSES.filter(s => tasksByStatus[s]).map(s => (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span className="text-text2">{STATUS_LABELS[s]}</span>
                  <span className="font-medium text-text">{tasksByStatus[s]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type RangePreset = 'week' | 'month' | 'custom';

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export default function WorkloadReportPage() {
  const [preset, setPreset] = useState<RangePreset>('month');
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    if (p === 'week') { setFrom(startOfWeek()); setTo(today()); }
    if (p === 'month') { setFrom(daysAgo(30)); setTo(today()); }
  };
  const { data = [], isLoading } = useWorkload(from, to);
  const [selectedRow, setSelectedRow] = useState<WorkloadRow | null>(null);

  const chartData = data.map(r => ({
    name: r.user.name.split(' ')[0],
    load: r.loadPercent,
    logged: r.loggedHours,
    estimated: r.estimatedHours,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Workload</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center rounded-md border border-c-border overflow-hidden">
            {([['week', 'This Week'], ['month', 'This Month'], ['custom', 'Custom']] as [RangePreset, string][]).map(([p, label]) => (
              <button key={p} onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 text-xs transition-colors ${preset === p ? 'bg-accent text-white' : 'text-text2 hover:text-text hover:bg-surface2'}`}>
                {label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <>
              <div className="flex items-center gap-2 text-sm text-text2">
                <label>From</label>
                <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                  className="rounded border border-c-border bg-surface2 px-2 py-1 text-text text-sm focus:outline-none focus:border-accent" />
              </div>
              <div className="flex items-center gap-2 text-sm text-text2">
                <label>To</label>
                <input type="date" value={to} onChange={e => setTo(e.target.value)}
                  className="rounded border border-c-border bg-surface2 px-2 py-1 text-text text-sm focus:outline-none focus:border-accent" />
              </div>
            </>
          )}
          <ExportButtons from={from} to={to} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          <div className="rounded-xl border border-c-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text mb-4">Load % per Person</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} unit="%" domain={[0, 120]} />
                <Tooltip
                  formatter={(val: number) => [`${val}%`, 'Load']}
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
                <Bar dataKey="load" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={loadColor(entry.load)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              {[{ color: '#34d399', label: '< 80% (healthy)' }, { color: '#fbbf24', label: '80–99% (high)' }, { color: '#f87171', label: '≥ 100% (over)' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-xs text-text2">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-c-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-c-border">
                  {['Member', 'Tasks', 'Est. Hours', 'Logged Hours', 'Overdue', 'Load %'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-text2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr
                    key={r.user.id}
                    className="border-b border-c-border/50 hover:bg-surface2/50 cursor-pointer"
                    onClick={() => setSelectedRow(r)}
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={r.user.name} avatarUrl={r.user.avatarUrl} className="h-6 w-6 text-[10px]" />
                        <span className="text-text">{r.user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-text">{r.taskCount}</td>
                    <td className="px-5 py-2.5 text-text">{r.estimatedHours}h</td>
                    <td className="px-5 py-2.5 text-text">{r.loggedHours}h</td>
                    <td className="px-5 py-2.5">
                      {r.overdueCount > 0
                        ? <span className="text-red font-medium">{r.overdueCount}</span>
                        : <span className="text-text2">0</span>}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="font-semibold" style={{ color: loadColor(r.loadPercent) }}>
                        {r.loadPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.length && <p className="text-sm text-text2 p-5">No data for this range.</p>}
          </div>

          {selectedRow && <WorkloadBreakdownModal row={selectedRow} onClose={() => setSelectedRow(null)} />}
        </>
      )}
    </div>
  );
}
