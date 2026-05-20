'use client';
import { useState } from 'react';
import { useProjects, useWorkload } from '@/hooks/useProjects';
import { useMyTasks, useAllVisibleTasks } from '@/hooks/useTasks';
import { useAuthStore } from '@/store/authStore';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { UserAvatar } from '@/components/ui/avatar';
import { statusVariant, projectStatusVariant, priorityDot, STATUS_LABELS, TASK_STATUSES } from '@/lib/statusHelpers';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  FolderOpen, CheckSquare, AlertCircle, Users,
  Clock, TrendingUp, Calendar, LayoutGrid,
} from 'lucide-react';
import Link from 'next/link';
import type { Project, Task, WorkloadEntry, TaskStatus } from '@/types/api';

function StatCard({ icon: Icon, label, value, sub, color = 'text-accent' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text2">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-text2">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2 bg-surface2 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const tasks: Partial<Record<string, number>> = project.tasksByStatus ?? {};
  const total = Object.values(tasks).reduce<number>((s, n) => s + (n ?? 0), 0);
  const done = tasks['done'] ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const assignees = project.assignments?.slice(0, 3) ?? [];
  const extra = (project.assignments?.length ?? 0) - 3;

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="p-4 hover:border-accent/50 transition-colors cursor-pointer group">
        <div className="flex items-start justify-between mb-2">
          <Badge variant={projectStatusVariant(project.status)} className="text-[10px]">
            {project.status.replace('_', ' ')}
          </Badge>
          <span className={`h-2 w-2 rounded-full mt-1 ${
            project.priority === 'critical' ? 'bg-red' :
            project.priority === 'high' ? 'bg-amber' :
            project.priority === 'medium' ? 'bg-accent' : 'bg-text2'
          }`} />
        </div>
        <h3 className="text-sm font-medium text-text group-hover:text-accent transition-colors line-clamp-1 mb-1">
          {project.title}
        </h3>
        {project.dueDate && (
          <p className="text-[11px] text-text2 mb-3 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        )}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text2">{pct}% complete</span>
            <span className="text-[10px] text-text2">{done}/{total}</span>
          </div>
          <div className="h-1 rounded-full bg-surface2">
            <div
              className="h-1 rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {assignees.map(a => (
            <UserAvatar key={a.id} name={a.assignee.name} avatarUrl={a.assignee.avatarUrl} className="h-5 w-5 text-[9px]" />
          ))}
          {extra > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface2 text-[9px] text-text2">
              +{extra}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

function workloadColor(pct: number) {
  if (pct >= 100) return '#f87171';
  if (pct >= 75) return '#fbbf24';
  return '#34d399';
}

function WorkloadChart({ data }: { data: WorkloadEntry[] }) {
  const chartData = data.map(e => ({
    name: e.user.name.split(' ')[0],
    pct: Math.min(Math.round((e.loggedHours / (e.estimatedHours || 1)) * 100), 120),
    tasks: e.taskCount,
    hours: e.loggedHours,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 10, fill: '#8892aa' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#e2e8f0' }} tickLine={false} axisLine={false} width={56} />
        <Tooltip
          cursor={{ fill: '#1f2436' }}
          contentStyle={{ background: '#181c27', border: '1px solid #2a2f45', borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(val: number, _name: string, props: { payload?: { tasks: number; hours: number } }) => [
            `${val}% load (${props.payload?.tasks ?? 0} tasks, ${props.payload?.hours ?? 0}h)`,
          ]}
        />
        <Bar dataKey="pct" radius={[0, 3, 3, 0]} maxBarSize={18}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={workloadColor(entry.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function MiniGantt({ projects }: { projects: Project[] }) {
  const active = projects
    .filter(p => p.startDate && p.dueDate && p.status !== 'cancelled')
    .slice(0, 8);

  if (!active.length) return <p className="text-sm text-text2">No active projects with dates.</p>;

  const dates = active.flatMap(p => [new Date(p.startDate!), new Date(p.dueDate!)]);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const span = Math.max(maxDate.getTime() - minDate.getTime(), 1);

  return (
    <div className="space-y-2">
      {active.map(p => {
        const start = (new Date(p.startDate!).getTime() - minDate.getTime()) / span * 100;
        const width = Math.max(
          (new Date(p.dueDate!).getTime() - new Date(p.startDate!).getTime()) / span * 100,
          2,
        );
        return (
          <div key={p.id} className="flex items-center gap-2">
            <Link href={`/projects/${p.id}`} className="w-32 truncate text-[11px] text-text2 hover:text-text shrink-0">
              {p.title}
            </Link>
            <div className="flex-1 h-5 relative rounded bg-surface2">
              <div
                className="absolute h-full rounded bg-accent/60"
                style={{ left: `${start}%`, width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
  return (
    <tr className={isOverdue ? 'bg-red/5' : undefined}>
      <td className="py-2 pr-3">
        <span className={`text-sm ${isOverdue ? 'text-red' : 'text-text'}`}>{task.title}</span>
      </td>
      <td className="py-2 pr-3">
        <span className="text-xs text-accent truncate max-w-[120px] block">{task.projectId}</span>
      </td>
      <td className="py-2 pr-3">
        <Badge variant={statusVariant(task.status)} className="text-[10px]">
          {task.status.replace('_', ' ')}
        </Badge>
      </td>
      <td className="py-2 pr-3">
        <span className={`text-xs ${isOverdue ? 'text-red font-medium' : 'text-text2'}`}>
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
        </span>
      </td>
      <td className="py-2">
        <span className="text-xs text-text2">{task.timeLogged ?? 0}h</span>
      </td>
    </tr>
  );
}

type KanbanSwimMode = 'status' | 'project';

function DashboardKanban() {
  const { data: tasks = [], isLoading } = useAllVisibleTasks();
  const [mode, setMode] = useState<KanbanSwimMode>('status');

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (tasks.length === 0) return <p className="text-sm text-text2 py-4">No tasks visible.</p>;

  let lanes: { key: string; label: string; tasks: Task[] }[] = [];
  if (mode === 'status') {
    lanes = TASK_STATUSES.map(s => ({
      key: s, label: STATUS_LABELS[s],
      tasks: tasks.filter(t => t.status === s),
    })).filter(l => l.tasks.length > 0);
  } else {
    const projectIds = [...new Set(tasks.map(t => t.projectId))];
    lanes = projectIds.map(pid => ({
      key: pid,
      label: pid.slice(0, 8) + '…',
      tasks: tasks.filter(t => t.projectId === pid),
    }));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text2">Group by:</span>
        {(['status', 'project'] as KanbanSwimMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${mode === m ? 'bg-accent text-white' : 'bg-surface2 text-text2 hover:text-text border border-c-border'}`}>
            {m}
          </button>
        ))}
        <span className="text-xs text-text2 ml-2">{tasks.length} tasks across all visible projects</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {lanes.map(lane => (
          <div key={lane.key} className="shrink-0 w-52">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-text truncate max-w-[160px]" title={lane.label}>{lane.label}</span>
              <span className="text-xs text-text2 ml-1 shrink-0">{lane.tasks.length}</span>
            </div>
            <div className="space-y-2 min-h-[120px] rounded-lg border border-dashed border-c-border p-2">
              {lane.tasks.slice(0, 20).map(t => (
                <Link key={t.id} href={`/projects/${t.projectId}`}>
                  <div className="rounded-md border border-c-border bg-surface p-2 hover:border-accent/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-xs text-text leading-snug line-clamp-2">{t.title}</p>
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1 ${priorityDot(t.priority)}`} />
                    </div>
                    <div className="flex items-center justify-between">
                      {t.assignee
                        ? <UserAvatar name={t.assignee.name} avatarUrl={t.assignee.avatarUrl ?? null} className="h-4 w-4 text-[8px]" />
                        : <span />}
                      {t.dueDate && <span className="text-[10px] text-text2">{new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                    </div>
                  </div>
                </Link>
              ))}
              {lane.tasks.length > 20 && (
                <p className="text-[10px] text-text2 text-center py-1">+{lane.tasks.length - 20} more</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('team');
  const [teamView, setTeamView] = useState<'overview' | 'kanban'>('overview');

  const { data: projects = [], isLoading: projLoading } = useProjects({ status: 'active' });
  const { data: myTasks = [], isLoading: tasksLoading } = useMyTasks();

  const firstProjectId = projects[0]?.id ?? '';
  const { data: workload = [] } = useWorkload(firstProjectId);

  const activeCount = projects.filter(p => p.status === 'active').length;
  const inProgressTasks = projects.reduce((s, p) => s + (p.tasksByStatus?.in_progress ?? 0), 0);
  const overdue = projects.reduce((s, p) => {
    const tasks = p.tasksByStatus ?? {};
    return s + (p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'completed' && p.status !== 'cancelled' ? 1 : 0);
  }, 0);

  const myOpen = myTasks.filter(t => t.status !== 'done').length;
  const today = new Date();
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  const dueThisWeek = myTasks.filter(t => t.dueDate && new Date(t.dueDate) <= weekEnd && t.status !== 'done').length;
  const hoursThisWeek = myTasks.reduce((s, t) => s + (t.timeLogged ?? 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title={`Good day, ${user?.name?.split(' ')[0] ?? 'there'}`} />
      <div className="flex-1 overflow-y-auto p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="team">Team View</TabsTrigger>
            <TabsTrigger value="my-work">My Work</TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            {projLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
              <div className="space-y-6">
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={FolderOpen} label="Active Projects" value={activeCount} color="text-accent" />
                  <StatCard icon={CheckSquare} label="In Progress Tasks" value={inProgressTasks} color="text-green" />
                  <StatCard icon={AlertCircle} label="Overdue Projects" value={overdue} color="text-red" />
                  <StatCard icon={Users} label="Team Members" value={workload.length} sub="visible to you" color="text-amber" />
                </div>

                {/* View toggle */}
                <div className="flex items-center rounded-md border border-c-border overflow-hidden w-fit">
                  <button onClick={() => setTeamView('overview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${teamView === 'overview' ? 'bg-accent text-white' : 'text-text2 hover:text-text hover:bg-surface2'}`}>
                    <FolderOpen className="h-3.5 w-3.5" />Overview
                  </button>
                  <button onClick={() => setTeamView('kanban')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${teamView === 'kanban' ? 'bg-accent text-white' : 'text-text2 hover:text-text hover:bg-surface2'}`}>
                    <LayoutGrid className="h-3.5 w-3.5" />Kanban
                  </button>
                </div>

                {teamView === 'overview' && (
                  <>
                    {/* Projects grid */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-text">Active Projects</h2>
                        <Link href="/projects" className="text-xs text-accent hover:underline">View all</Link>
                      </div>
                      {projects.length === 0 ? (
                        <p className="text-sm text-text2">No active projects.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {projects.slice(0, 9).map(p => <ProjectCard key={p.id} project={p} />)}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Workload chart */}
                      <Card className="p-4">
                        <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-accent" />
                          Team Workload
                        </h2>
                        {workload.length === 0 ? (
                          <p className="text-sm text-text2 py-8 text-center">Select a project to view workload.</p>
                        ) : (
                          <WorkloadChart data={workload} />
                        )}
                      </Card>

                      {/* Mini Gantt */}
                      <Card className="p-4">
                        <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-accent" />
                          Project Timeline
                        </h2>
                        <MiniGantt projects={projects} />
                      </Card>
                    </div>
                  </>
                )}

                {teamView === 'kanban' && (
                  <Card className="p-4">
                    <h2 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-accent" />
                      Team Kanban
                    </h2>
                    <DashboardKanban />
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-work">
            {tasksLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard icon={CheckSquare} label="My Open Tasks" value={myOpen} color="text-accent" />
                  <StatCard icon={Clock} label="Due This Week" value={dueThisWeek} color="text-amber" />
                  <StatCard icon={TrendingUp} label="Hours This Week" value={`${hoursThisWeek}h`} color="text-green" />
                </div>

                <Card className="p-4">
                  <h2 className="text-sm font-semibold text-text mb-4">My Tasks</h2>
                  {myTasks.length === 0 ? (
                    <p className="text-sm text-text2">No tasks assigned to you.</p>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-c-border">
                          <th className="pb-2 text-left text-xs font-medium text-text2">Task</th>
                          <th className="pb-2 text-left text-xs font-medium text-text2">Project</th>
                          <th className="pb-2 text-left text-xs font-medium text-text2">Status</th>
                          <th className="pb-2 text-left text-xs font-medium text-text2">Due</th>
                          <th className="pb-2 text-left text-xs font-medium text-text2">Logged</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-c-border">
                        {myTasks.map(t => <TaskRow key={t.id} task={t} />)}
                      </tbody>
                    </table>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
