'use client';
import { useState, use } from 'react';
import {
  useProject, useProjectTeam, useKanban, useGantt,
  useWorkload, useTimeReport, useActivity, useUpdateProject,
} from '@/hooks/useProjects';
import { useTasks, useCreateTask, useCreateSubtask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useLinks, useCreateLink, useDeleteLink } from '@/hooks/useLinks';
import { useCreateTimeLog } from '@/hooks/useTimeLogs';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/avatar';
import {
  statusVariant, projectStatusVariant, priorityDot, priorityColor,
  STATUS_LABELS, PRIORITY_LABELS, TASK_STATUSES,
} from '@/lib/statusHelpers';
import {
  ChevronRight, Plus, ExternalLink, Trash2,
  Clock, Link2, MessageSquare,
} from 'lucide-react';
import type { Task, TaskStatus, Priority } from '@/types/api';

import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function TaskStatusSelect({ taskId, current, projectId }: { taskId: string; current: TaskStatus; projectId: string }) {
  const update = useUpdateTask(projectId);
  return (
    <Select value={current} onValueChange={v => update.mutate({ id: taskId, data: { status: v } })}>
      <SelectTrigger className="h-6 text-[11px] w-28 border-transparent bg-surface2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUSES.map(s => (
          <SelectItem key={s} value={s} className="text-xs">{STATUS_LABELS[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Task Tree ────────────────────────────────────────────────────────────────

function TaskTreeRow({
  task, depth, projectId, onAddSubtask,
}: {
  task: Task; depth: number; projectId: string; onAddSubtask: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const deleteTask = useDeleteTask(projectId);
  const hasChildren = (task.children?.length ?? 0) > 0;

  return (
    <>
      <tr className="group hover:bg-surface2/50 transition-colors">
        <td className="py-1.5 pr-2 w-6 pl-2">
          {hasChildren ? (
            <button onClick={() => setExpanded(e => !e)} className="text-text2 hover:text-text">
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          ) : <span className="inline-block w-3.5" />}
        </td>
        <td className="py-1.5" style={{ paddingLeft: depth * 20 }}>
          <span className="text-sm text-text">{task.title}</span>
        </td>
        <td className="py-1.5 px-2">
          <TaskStatusSelect taskId={task.id} current={task.status} projectId={projectId} />
        </td>
        <td className="py-1.5 px-2">
          <span className={`text-xs ${priorityColor(task.priority)}`}>{PRIORITY_LABELS[task.priority]}</span>
        </td>
        <td className="py-1.5 px-2">
          {task.assignee
            ? <UserAvatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} className="h-5 w-5 text-[9px]" />
            : <span className="text-xs text-text2">—</span>}
        </td>
        <td className="py-1.5 px-2">
          <span className="text-xs text-text2">
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
          </span>
        </td>
        <td className="py-1.5 px-2">
          <div className="flex items-center gap-2 text-xs text-text2">
            {(task.commentsCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{task.commentsCount}</span>
            )}
            {(task.timeLogged ?? 0) > 0 && (
              <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{task.timeLogged}h</span>
            )}
          </div>
        </td>
        <td className="py-1.5 pl-2 pr-3 opacity-0 group-hover:opacity-100 transition-opacity w-16">
          <div className="flex items-center gap-1">
            <button onClick={() => onAddSubtask(task.id)} className="text-text2 hover:text-accent">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => deleteTask.mutate(task.id)} className="text-text2 hover:text-red">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && task.children?.map(child => (
        <TaskTreeRow key={child.id} task={child} depth={depth + 1} projectId={projectId} onAddSubtask={onAddSubtask} />
      ))}
    </>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      className="rounded-md border border-c-border bg-surface p-2.5 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs text-text leading-snug">{task.title}</p>
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1 ${priorityDot(task.priority)}`} />
      </div>
      <div className="flex items-center justify-between">
        {task.assignee
          ? <UserAvatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} className="h-5 w-5 text-[9px]" />
          : <span />}
        {task.dueDate && (
          <span className="text-[10px] text-text2">
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: links = [] } = useLinks('project', projectId);
  const updateProject = useUpdateProject(projectId);

  if (!project) return <div className="flex justify-center py-12"><Spinner /></div>;

  const tasks: Partial<Record<string, number>> = project.tasksByStatus ?? {};
  const total = Object.values(tasks).reduce<number>((s, n) => s + (n ?? 0), 0);
  const done = tasks['done'] ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-4">
        <Card className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text mb-1">{project.title}</h3>
              {project.description && <p className="text-sm text-text2">{project.description}</p>}
            </div>
            <Select value={project.status} onValueChange={v => updateProject.mutate({ status: v })}>
              <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['planning','active','on_hold','completed','cancelled'] as const).map(s => (
                  <SelectItem key={s} value={s} className="text-xs">{s.replace('_',' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs mb-4">
            <div>
              <p className="text-text2 mb-0.5">Priority</p>
              <p className={`font-medium ${priorityColor(project.priority)}`}>{PRIORITY_LABELS[project.priority]}</p>
            </div>
            {project.startDate && (
              <div>
                <p className="text-text2 mb-0.5">Start Date</p>
                <p className="text-text">{new Date(project.startDate).toLocaleDateString()}</p>
              </div>
            )}
            {project.dueDate && (
              <div>
                <p className="text-text2 mb-0.5">Due Date</p>
                <p className="text-text">{new Date(project.dueDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs text-text2">
              <span>Progress</span><span>{pct}% · {done}/{total} tasks</span>
            </div>
            <div className="h-2 rounded-full bg-surface2">
              <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-5 gap-1 mt-3 text-center">
              {TASK_STATUSES.map(s => (
                <div key={s}>
                  <p className="text-lg font-semibold text-text">{tasks[s] ?? 0}</p>
                  <p className="text-[10px] text-text2">{STATUS_LABELS[s]}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold text-text mb-3">Team Access</h3>
          <div className="space-y-2">
            {team.map(row => (
              <div key={row.id} className="flex items-center gap-3">
                <UserAvatar name={row.user.name} avatarUrl={row.user.avatarUrl} className="h-7 w-7 text-xs" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-text">{row.user.name}</p>
                  <p className="text-[10px] text-text2">{row.user.email}</p>
                </div>
                <Badge variant="muted" className="text-[10px]">{row.reason}</Badge>
              </div>
            ))}
            {team.length === 0 && <p className="text-sm text-text2">No team members.</p>}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-text mb-3">Links</h3>
          <div className="space-y-2">
            {links.map(l => (
              <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-accent hover:underline">
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{l.label ?? l.url}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ))}
            {links.length === 0 && <p className="text-xs text-text2">No links added.</p>}
          </div>
        </Card>
        {project.tags.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map(t => (
                <span key={t} className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-text2">{t}</span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Tasks ───────────────────────────────────────────────────────────────

type AddTaskForm = { title: string; priority: Priority; dueDate: string };

function TasksTab({ projectId }: { projectId: string }) {
  const { data: rawTasks = [], isLoading } = useTasks(projectId);
  const createTask = useCreateTask(projectId);
  const [showAdd, setShowAdd] = useState<string | 'root' | null>(null);
  const [form, setForm] = useState<AddTaskForm>({ title: '', priority: 'medium', dueDate: '' });
  const [subtaskParentId, setSubtaskParentId] = useState('');
  const createSubtask = useCreateSubtask(subtaskParentId, projectId);

  const tasks: Task[] = rawTasks.map(t => ({ ...t, children: [] }));
  const byId: Record<string, Task> = {};
  tasks.forEach(t => { byId[t.id] = t; });
  const roots: Task[] = [];
  tasks.forEach(t => {
    if (t.parentTaskId && byId[t.parentTaskId]) {
      byId[t.parentTaskId].children!.push(t);
    } else {
      roots.push(t);
    }
  });

  const openSubtask = (parentId: string) => {
    setSubtaskParentId(parentId);
    setShowAdd(parentId);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { title: form.title, priority: form.priority, dueDate: form.dueDate || null };
    if (showAdd === 'root') {
      await createTask.mutateAsync(data);
    } else {
      await createSubtask.mutateAsync(data);
    }
    setShowAdd(null);
    setForm({ title: '', priority: 'medium', dueDate: '' });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowAdd('root')}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Add Task
        </Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-c-border bg-surface2/50">
              <th className="w-8 py-2" />
              <th className="py-2 pl-2 text-left text-xs font-medium text-text2">Task</th>
              <th className="py-2 px-2 text-left text-xs font-medium text-text2 w-32">Status</th>
              <th className="py-2 px-2 text-left text-xs font-medium text-text2 w-20">Priority</th>
              <th className="py-2 px-2 text-left text-xs font-medium text-text2 w-20">Assignee</th>
              <th className="py-2 px-2 text-left text-xs font-medium text-text2 w-20">Due</th>
              <th className="py-2 px-2 text-left text-xs font-medium text-text2 w-20" />
              <th className="py-2 px-2 w-14" />
            </tr>
          </thead>
          <tbody className="divide-y divide-c-border">
            {roots.map(t => (
              <TaskTreeRow key={t.id} task={t} depth={0} projectId={projectId} onAddSubtask={openSubtask} />
            ))}
            {roots.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-text2">No tasks yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!showAdd} onOpenChange={o => !o && setShowAdd(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{showAdd === 'root' ? 'Add Task' : 'Add Subtask'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowAdd(null)}>Cancel</Button>
              <Button type="submit">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Gantt ───────────────────────────────────────────────────────────────

function GanttTab({ projectId }: { projectId: string }) {
  const { data: ganttTasks = [], isLoading } = useGantt(projectId);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const withDates = ganttTasks.filter(t => t.startDate && t.dueDate);
  if (!withDates.length) return <p className="text-sm text-text2 py-8 text-center">No tasks with start and due dates.</p>;

  const allDates = withDates.flatMap(t => [new Date(t.startDate!), new Date(t.dueDate!)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const span = Math.max(maxDate.getTime() - minDate.getTime(), 86400000);

  const statusColors: Record<string, string> = {
    todo: '#8892aa', in_progress: '#4f8ef7', in_review: '#fbbf24', blocked: '#f87171', done: '#34d399',
  };

  return (
    <Card className="p-4 overflow-x-auto">
      <div className="space-y-2 min-w-[600px]">
        {withDates.map(t => {
          const left = (new Date(t.startDate!).getTime() - minDate.getTime()) / span * 100;
          const width = Math.max((new Date(t.dueDate!).getTime() - new Date(t.startDate!).getTime()) / span * 100, 1.5);
          return (
            <div key={t.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-xs text-text2">{t.title}</div>
              <div className="flex-1 h-6 relative rounded bg-surface2">
                <div
                  className="absolute h-full rounded text-[10px] text-white flex items-center px-1.5 overflow-hidden whitespace-nowrap"
                  style={{ left: `${left}%`, width: `${width}%`, background: statusColors[t.status] ?? '#4f8ef7' }}
                >
                  {width > 8 ? t.title : ''}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Tab: Kanban ──────────────────────────────────────────────────────────────

function KanbanTab({ projectId }: { projectId: string }) {
  const { data: board, isLoading } = useKanban(projectId);
  const updateTask = useUpdateTask(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (isLoading || !board) return <div className="flex justify-center py-12"><Spinner /></div>;

  const allTasks = TASK_STATUSES.flatMap(s => board[s] ?? []);
  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = over.id as string;
    const newStatus = TASK_STATUSES.find(s => s === overId || board[s]?.some(t => t.id === overId));
    if (newStatus) {
      updateTask.mutate({ id: active.id as string, data: { status: newStatus } });
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {TASK_STATUSES.map(status => (
          <div key={status} className="shrink-0 w-56">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant={statusVariant(status)} className="text-[10px]">{STATUS_LABELS[status]}</Badge>
              <span className="text-xs text-text2">{board[status]?.length ?? 0}</span>
            </div>
            <SortableContext items={board[status]?.map(t => t.id) ?? []} strategy={verticalListSortingStrategy} id={status}>
              <div className="space-y-2 min-h-[200px] rounded-lg border border-dashed border-c-border p-2">
                {board[status]?.map(task => <KanbanCard key={task.id} task={task} />)}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeTask && <KanbanCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Tab: Links ───────────────────────────────────────────────────────────────

function LinksTab({ projectId }: { projectId: string }) {
  const { data: links = [], isLoading } = useLinks('project', projectId);
  const addLink = useCreateLink();
  const deleteLink = useDeleteLink('project', projectId);
  const [form, setForm] = useState({ url: '', label: '' });
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addLink.mutateAsync({ entityType: 'project', entityId: projectId, url: form.url, label: form.label || undefined });
    setForm({ url: '', label: '' });
    setAdding(false);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Add Link
        </Button>
      </div>
      <Card className="divide-y divide-c-border">
        {links.length === 0 ? (
          <div className="py-8 text-center">
            <Link2 className="h-8 w-8 text-text2 mx-auto mb-2" />
            <p className="text-sm text-text2">No links added.</p>
          </div>
        ) : links.map(l => (
          <div key={l.id} className="flex items-center gap-3 p-3">
            <Link2 className="h-4 w-4 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <a href={l.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1 truncate">
                {l.label ?? l.url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              {l.label && <p className="text-xs text-text2 truncate">{l.url}</p>}
            </div>
            <button onClick={() => deleteLink.mutate(l.id)} className="text-text2 hover:text-red shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </Card>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Link</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Design doc" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              <Button type="submit" disabled={addLink.isPending}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Time ────────────────────────────────────────────────────────────────

function TimeTab({ projectId }: { projectId: string }) {
  const { data: report } = useTimeReport(projectId);
  const { data: tasks = [] } = useTasks(projectId);
  const [showLog, setShowLog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const logTime = useCreateTimeLog(selectedTaskId, projectId);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), hours: '', note: '' });

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    await logTime.mutateAsync({ date: form.date, hours: parseFloat(form.hours), note: form.note || undefined });
    setShowLog(false);
    setForm({ date: new Date().toISOString().slice(0, 10), hours: '', note: '' });
  };

  const logs: Array<{ id: string; task?: { title: string }; user?: { name: string }; date: string; hours: number; note: string | null }> = report?.logs ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-3 text-center">
          <p className="text-xs text-text2 mb-1">Total Logged</p>
          <p className="text-xl font-semibold text-text">{report?.totalHours ?? 0}h</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-text2 mb-1">Estimated</p>
          <p className="text-xl font-semibold text-text">{report?.estimatedHours ?? 0}h</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-text2 mb-1">Contributors</p>
          <p className="text-xl font-semibold text-text">{report?.byUser?.length ?? 0}</p>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowLog(true)}>
          <Clock className="h-3.5 w-3.5 mr-1.5" />Log Time
        </Button>
      </div>
      <Card className="divide-y divide-c-border">
        {logs.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="h-8 w-8 text-text2 mx-auto mb-2" />
            <p className="text-sm text-text2">No time logged.</p>
          </div>
        ) : logs.map(l => (
          <div key={l.id} className="flex items-center gap-4 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text truncate">{l.task?.title ?? '—'}</p>
              <p className="text-[10px] text-text2">{l.user?.name ?? '—'} · {new Date(l.date).toLocaleDateString()}</p>
            </div>
            <span className="text-sm font-semibold text-text">{l.hours}h</span>
            {l.note && <span className="text-xs text-text2 truncate max-w-[120px]">{l.note}</span>}
          </div>
        ))}
      </Card>

      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Time</DialogTitle></DialogHeader>
          <form onSubmit={handleLog} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Task</Label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  {tasks.filter(t => !t.parentTaskId).map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Hours</Label>
                <Input type="number" min="0.25" max="24" step="0.25" value={form.hours}
                  onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowLog(false)}>Cancel</Button>
              <Button type="submit" disabled={!selectedTaskId || logTime.isPending}>Log</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Activity ────────────────────────────────────────────────────────────

function ActivityTab({ projectId }: { projectId: string }) {
  const { data: activity = [], isLoading } = useActivity(projectId);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const entries = activity as Array<{
    id: string; action: string; metadata: Record<string, unknown> | null; createdAt: string;
  }>;

  return (
    <div>
      {entries.length === 0 ? (
        <p className="text-sm text-text2 py-8 text-center">No activity yet.</p>
      ) : entries.map(entry => (
        <div key={entry.id} className="flex items-start gap-3 py-3 border-b border-c-border last:border-0">
          <div className="h-2 w-2 rounded-full bg-accent/60 shrink-0 mt-2" />
          <div className="flex-1">
            <p className="text-xs text-text">{entry.action}</p>
            {entry.metadata && (
              <p className="text-[10px] text-text2 mt-0.5">
                {JSON.stringify(entry.metadata).slice(0, 100)}
              </p>
            )}
          </div>
          <span className="text-[10px] text-text2 shrink-0">
            {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['overview', 'tasks', 'gantt', 'kanban', 'links', 'time', 'activity'] as const;
type Tab = typeof TABS[number];

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>('overview');
  const { data: project, isLoading } = useProject(id);

  if (isLoading) return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Project" />
      <div className="flex justify-center py-12"><Spinner /></div>
    </div>
  );

  if (!project) return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Project" />
      <div className="flex justify-center py-12"><p className="text-sm text-text2">Project not found.</p></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title={project.title}
        actions={
          <Badge variant={projectStatusVariant(project.status)} className="text-[10px]">
            {project.status.replace('_', ' ')}
          </Badge>
        }
      />
      <div className="border-b border-c-border bg-surface px-6 flex items-center gap-1 shrink-0">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text2 hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'overview' && <OverviewTab projectId={id} />}
        {tab === 'tasks' && <TasksTab projectId={id} />}
        {tab === 'gantt' && <GanttTab projectId={id} />}
        {tab === 'kanban' && <KanbanTab projectId={id} />}
        {tab === 'links' && <LinksTab projectId={id} />}
        {tab === 'time' && <TimeTab projectId={id} />}
        {tab === 'activity' && <ActivityTab projectId={id} />}
      </div>
    </div>
  );
}
