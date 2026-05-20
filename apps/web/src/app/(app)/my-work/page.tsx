'use client';
import { useState } from 'react';
import { useMyTasks, useUpdateTask } from '@/hooks/useTasks';
import { useTimesheet } from '@/hooks/useTimeLogs';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { statusVariant, priorityDot, TASK_STATUSES, STATUS_LABELS } from '@/lib/statusHelpers';
import { CheckSquare, Clock, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Task, TaskStatus } from '@/types/api';

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function parseWeek(week: string): Date {
  const [year, w] = week.split('-W').map(Number);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000 + (w - 1) * 7 * 86400000);
  return monday;
}

function StatCard({ icon: Icon, label, value, color = 'text-accent' }: {
  icon: React.ElementType; label: string; value: string | number; color?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text2">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
        </div>
        <div className={`rounded-lg p-2 bg-surface2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function TaskRow({ task }: { task: Task }) {
  const update = useUpdateTask();
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
  return (
    <tr className={`group transition-colors ${isOverdue ? 'bg-red/5' : 'hover:bg-surface2/30'}`}>
      <td className="py-2 pr-3 pl-3">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priorityDot(task.priority)}`} />
          <span className={`text-sm ${isOverdue ? 'text-red' : 'text-text'}`}>{task.title}</span>
        </div>
      </td>
      <td className="py-2 pr-3">
        <Link href={`/projects/${task.projectId}`} className="text-xs text-accent hover:underline truncate max-w-[120px] block">
          {task.projectId}
        </Link>
      </td>
      <td className="py-2 pr-3">
        <Select value={task.status} onValueChange={v => update.mutate({ id: task.id, data: { status: v } })}>
          <SelectTrigger className="h-6 text-[11px] w-28 border-transparent bg-transparent hover:bg-surface2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 pr-3">
        <span className={`text-xs ${isOverdue ? 'text-red font-medium' : 'text-text2'}`}>
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
        </span>
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1 text-xs text-text2">
          <Clock className="h-3 w-3" />{task.timeLogged ?? 0}h
        </div>
      </td>
    </tr>
  );
}

function KanbanColumn({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  return (
    <div className="shrink-0 w-48">
      <div className="mb-2 flex items-center justify-between">
        <Badge variant={statusVariant(status)} className="text-[10px]">{STATUS_LABELS[status]}</Badge>
        <span className="text-xs text-text2">{tasks.length}</span>
      </div>
      <div className="space-y-2 min-h-[160px] rounded-lg border border-dashed border-c-border p-2">
        {tasks.map(t => (
          <div key={t.id} className="rounded-md border border-c-border bg-surface p-2.5">
            <p className="text-xs text-text leading-snug mb-1.5">{t.title}</p>
            {t.dueDate && (
              <p className="text-[10px] text-text2">
                {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimesheetDay {
  date: string;
  hours: number;
  tasks: Array<{ taskId: string; title: string; hours: number }>;
}

function TimesheetView({ week }: { week: string }) {
  const { data: sheet, isLoading } = useTimesheet(week);
  const monday = parseWeek(week);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getTime() + i * 86400000);
    return d.toISOString().slice(0, 10);
  });

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (isLoading) return <div className="flex justify-center py-4"><Spinner /></div>;

  const byDate: Record<string, TimesheetDay> = {};
  (sheet?.days ?? []).forEach((d: TimesheetDay) => { byDate[d.date] = d; });

  const totalHours = days.reduce((s, d) => s + (byDate[d]?.hours ?? 0), 0);

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {days.map((d, i) => (
          <div key={d} className="text-center">
            <p className="text-[10px] text-text2 mb-1">{dayLabels[i]}</p>
            <p className="text-xs text-text2 mb-2">{new Date(d).getDate()}</p>
            <div className={`rounded-md p-2 text-center ${byDate[d]?.hours ? 'bg-accent/15 border border-accent/30' : 'bg-surface2'}`}>
              <p className="text-sm font-semibold text-text">{byDate[d]?.hours ?? 0}h</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-text2 mt-3">
        <span>Total this week</span>
        <span className="font-semibold text-text">{totalHours}h</span>
      </div>
    </div>
  );
}

export default function MyWorkPage() {
  const [view, setView] = useState<'list' | 'kanban' | 'timesheet'>('list');
  const [week, setWeek] = useState(getISOWeek(new Date()));

  const { data: tasks = [], isLoading } = useMyTasks();

  const open = tasks.filter(t => t.status !== 'done');
  const today = new Date();
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const dueThisWeek = tasks.filter(t => t.dueDate && new Date(t.dueDate) <= weekEnd && t.status !== 'done').length;
  const hoursTotal = tasks.reduce((s, t) => s + (t.timeLogged ?? 0), 0);
  const overdue = tasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < today);

  const byStatus: Partial<Record<TaskStatus, Task[]>> = {};
  TASK_STATUSES.forEach(s => { byStatus[s] = tasks.filter(t => t.status === s); });

  const prevWeek = () => {
    const d = parseWeek(week);
    d.setDate(d.getDate() - 7);
    setWeek(getISOWeek(d));
  };
  const nextWeek = () => {
    const d = parseWeek(week);
    d.setDate(d.getDate() + 7);
    setWeek(getISOWeek(d));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="My Work"
        actions={
          <div className="flex items-center rounded-md border border-c-border overflow-hidden">
            {(['list', 'kanban', 'timesheet'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs capitalize transition-colors ${
                  view === v ? 'bg-accent text-white' : 'text-text2 hover:text-text hover:bg-surface2'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={CheckSquare} label="My Open Tasks" value={open.length} color="text-accent" />
              <StatCard icon={AlertTriangle} label="Due This Week" value={dueThisWeek} color="text-amber" />
              <StatCard icon={Clock} label="Hours Logged" value={`${hoursTotal}h`} color="text-green" />
            </div>

            {view === 'list' && (
              <Card className="overflow-hidden">
                {tasks.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckSquare className="h-8 w-8 text-text2 mx-auto mb-2" />
                    <p className="text-sm text-text2">No tasks assigned to you.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-c-border bg-surface2/50">
                        <th className="py-2 pl-3 text-left text-xs font-medium text-text2">Task</th>
                        <th className="py-2 text-left text-xs font-medium text-text2">Project</th>
                        <th className="py-2 text-left text-xs font-medium text-text2">Status</th>
                        <th className="py-2 text-left text-xs font-medium text-text2">Due</th>
                        <th className="py-2 text-left text-xs font-medium text-text2">Logged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-c-border">
                      {overdue.length > 0 && overdue.map(t => <TaskRow key={t.id} task={t} />)}
                      {tasks.filter(t => !overdue.includes(t)).map(t => <TaskRow key={t.id} task={t} />)}
                    </tbody>
                  </table>
                )}
              </Card>
            )}

            {view === 'kanban' && (
              <div className="flex gap-3 overflow-x-auto pb-4">
                {TASK_STATUSES.map(s => (
                  <KanbanColumn key={s} status={s} tasks={byStatus[s] ?? []} />
                ))}
              </div>
            )}

            {view === 'timesheet' && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-text">Timesheet</h2>
                  <div className="flex items-center gap-2">
                    <button onClick={prevWeek} className="text-text2 hover:text-text p-1 rounded hover:bg-surface2">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-medium text-text min-w-[80px] text-center">{week}</span>
                    <button onClick={nextWeek} className="text-text2 hover:text-text p-1 rounded hover:bg-surface2">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <TimesheetView week={week} />
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
