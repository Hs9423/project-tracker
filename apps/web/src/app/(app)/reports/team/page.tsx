'use client';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useTeamProductivity, useQueueExport, useExportStatus } from '@/hooks/useReports';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import { Download, FileText } from 'lucide-react';

function today(): string { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number): string { return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10); }

function ExportButtons({ from, to }: { from: string; to: string }) {
  const queueExport = useQueueExport();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: statusData } = useExportStatus(jobId);

  const handleExport = async (format: 'pdf' | 'csv') => {
    const result = await queueExport.mutateAsync({ type: 'team-productivity', format, filters: { from, to } });
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

export default function TeamReportPage() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const { data = [], isLoading } = useTeamProductivity(from, to);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Team Productivity</h1>
        <div className="flex items-center gap-3 flex-wrap">
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
          <ExportButtons from={from} to={to} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          <div className="rounded-xl border border-c-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text mb-4">Tasks Completed per Person</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.map(r => ({ name: r.user.name.split(' ')[0], tasks: r.tasksCompleted, hours: r.hoursLogged }))}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="tasks" name="Tasks Completed" radius={[4, 4, 0, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={`hsl(${210 + i * 25}, 70%, 60%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-c-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-c-border">
                  {['Member', 'Tasks Completed', 'Hours Logged', 'Overdue', 'Avg Completion'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-text2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.user.id} className="border-b border-c-border/50 hover:bg-surface2/50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={r.user.name} avatarUrl={r.user.avatarUrl} className="h-6 w-6 text-[10px]" />
                        <span className="text-text">{r.user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-green font-medium">{r.tasksCompleted}</td>
                    <td className="px-5 py-2.5 text-text">{r.hoursLogged}h</td>
                    <td className="px-5 py-2.5">
                      {r.overdueCount > 0 ? (
                        <span className="text-red font-medium">{r.overdueCount}</span>
                      ) : (
                        <span className="text-text2">0</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-text2">{r.avgCompletionTimeDays}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.length && <p className="text-sm text-text2 p-5">No data for this range.</p>}
          </div>
        </>
      )}
    </div>
  );
}
