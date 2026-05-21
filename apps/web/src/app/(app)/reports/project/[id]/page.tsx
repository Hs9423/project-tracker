'use client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useProjectReport, useQueueExport, useExportStatus } from '@/hooks/useReports';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
import { Download, FileText } from 'lucide-react';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  done: '#34d399',
  in_progress: '#4f8ef7',
  in_review: '#a78bfa',
  blocked: '#f87171',
  todo: '#8892aa',
};

function ExportButtons({ projectId }: { projectId: string }) {
  const queueExport = useQueueExport();
  const [jobId, setJobId] = useState<string | null>(null);
  const { data: statusData } = useExportStatus(jobId);

  const handleExport = async (format: 'pdf' | 'csv') => {
    const result = await queueExport.mutateAsync({ type: 'project', format, filters: { projectId } });
    setJobId(result.jobId);
  };

  return (
    <div className="flex items-center gap-2">
      {statusData?.status === 'ready' && statusData.downloadUrl && (
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}${statusData.downloadUrl}`}
          className="flex items-center gap-1 text-xs text-green hover:underline"
          download
        >
          <Download className="h-3 w-3" /> Download ready
        </a>
      )}
      {jobId && statusData?.status === 'pending' && (
        <span className="text-xs text-text2 flex items-center gap-1"><Spinner className="h-3 w-3" /> Generating…</span>
      )}
      <Button size="sm" variant="outline" onClick={() => handleExport('pdf')} disabled={queueExport.isPending}>
        <FileText className="h-3 w-3 mr-1" />PDF
      </Button>
      <Button size="sm" variant="outline" onClick={() => handleExport('csv')} disabled={queueExport.isPending}>
        <Download className="h-3 w-3 mr-1" />CSV
      </Button>
    </div>
  );
}

export default function ProjectReportPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data, isLoading } = useProjectReport(id);

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;
  if (!data) return null;

  const pieData = Object.entries(data.tasksByStatus).map(([name, value]) => ({ name, value }));
  const barData = data.memberBreakdown.map(m => ({
    name: m.name.split(' ')[0],
    'Tasks Assigned': m.tasksAssigned,
    'Tasks Done': m.tasksDone,
    'Hours Logged': m.hoursLogged,
  }));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Project Report</h1>
        <ExportButtons projectId={id} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Progress', value: `${data.progressPercent}%`, color: 'text-green' },
          { label: 'Overdue Tasks', value: data.overdueCount, color: 'text-red' },
          { label: 'Est. Hours', value: data.totalEstimatedHours, color: 'text-accent' },
          { label: 'Logged Hours', value: data.totalLoggedHours, color: 'text-amber' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-c-border bg-surface p-4">
            <p className="text-xs text-text2 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut chart */}
        <div className="rounded-xl border border-c-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Tasks by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map(entry => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#4f8ef7'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text)' }}
              />
              <Legend
                formatter={(val) => <span className="text-xs text-text2 capitalize">{String(val).replace('_', ' ')}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart per member */}
        <div className="rounded-xl border border-c-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Member Breakdown</h2>
          {barData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
                <Legend formatter={(val) => <span className="text-xs text-text2">{val}</span>} />
                <Bar dataKey="Tasks Assigned" fill="#8892aa" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Tasks Done" fill="#34d399" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-text2">No assignments yet.</p>
          )}
        </div>
      </div>

      {/* Member table */}
      <div className="rounded-xl border border-c-border bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-c-border">
          <h2 className="text-sm font-semibold text-text">Member Breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-c-border">
              {['Member', 'Assigned', 'Done', 'Hours Logged'].map(h => (
                <th key={h} className="px-5 py-2.5 text-left text-xs font-medium text-text2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.memberBreakdown.map(m => (
              <tr key={m.id} className="border-b border-c-border/50 hover:bg-surface2/50">
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={m.name} avatarUrl={m.avatarUrl} className="h-6 w-6 text-[10px]" />
                    <span className="text-text">{m.name}</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-text">{m.tasksAssigned}</td>
                <td className="px-5 py-2.5">
                  <span className="text-green">{m.tasksDone}</span>
                  <span className="text-text2 ml-1 text-xs">
                    ({m.tasksAssigned ? Math.round((m.tasksDone / m.tasksAssigned) * 100) : 0}%)
                  </span>
                </td>
                <td className="px-5 py-2.5 text-text">{m.hoursLogged}h</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.memberBreakdown.length && (
          <p className="text-sm text-text2 p-5">No assigned members.</p>
        )}
      </div>
    </div>
  );
}
