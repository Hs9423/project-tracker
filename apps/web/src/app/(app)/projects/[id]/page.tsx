'use client';
import { useState, useEffect } from 'react';
import {
  useProject, useProjectTeam, useKanban, useGantt,
  useWorkload, useTimeReport, useActivity, useUpdateProject, useDeleteProject,
} from '@/hooks/useProjects';
import { useTasks, useTask, useCreateTask, useCreateSubtask, useUpdateTask, useDeleteTask, useTaskActivity } from '@/hooks/useTasks';
import { useLinks, useCreateLink, useUpdateLink, useDeleteLink } from '@/hooks/useLinks';
import { useCreateTimeLog, useDeleteTimeLog } from '@/hooks/useTimeLogs';
import { CommentThread } from '@/components/comments/CommentThread';
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
  Clock, Link2, MessageSquare, Pencil, Activity, AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { TaskTimer } from '@/components/tasks/TaskTimer';
import type { Task, TaskStatus, Priority, GanttTask } from '@/types/api';

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

// ─── Task Detail Modal ────────────────────────────────────────────────────────

type TaskDetailTab = 'details' | 'links' | 'comments' | 'activity';

function TaskDetailModal({ taskId, projectId, onClose }: { taskId: string; projectId: string; onClose: () => void }) {
  const { data: task, isLoading } = useTask(taskId);
  const { data: links = [], isLoading: linksLoading } = useLinks('task', taskId);
  const { data: activity = [], isLoading: activityLoading } = useTaskActivity(taskId);
  const addLink = useCreateLink();
  const updateLink = useUpdateLink('task', taskId);
  const deleteLink = useDeleteLink('task', taskId);
  const updateTask = useUpdateTask(projectId);
  const [tab, setTab] = useState<TaskDetailTab>('details');
  const [addingLink, setAddingLink] = useState(false);
  const [linkForm, setLinkForm] = useState({ url: '', label: '' });
  const [editLinkId, setEditLinkId] = useState<string | null>(null);
  const [editLinkForm, setEditLinkForm] = useState({ url: '', label: '' });
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    await addLink.mutateAsync({ entityType: 'task', entityId: taskId, url: linkForm.url, label: linkForm.label || undefined });
    setLinkForm({ url: '', label: '' });
    setAddingLink(false);
  };

  const handleEditLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLinkId) return;
    await updateLink.mutateAsync({ id: editLinkId, data: { url: editLinkForm.url, label: editLinkForm.label || undefined } });
    setEditLinkId(null);
  };

  const TABS: { key: TaskDetailTab; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'links', label: `Links${links.length ? ` (${links.length})` : ''}` },
    { key: 'comments', label: 'Comments' },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base pr-6">
            {isLoading ? 'Loading…' : task?.title}
          </DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-c-border -mx-6 px-6 shrink-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text2 hover:text-text'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto mt-2 min-h-0">
          {/* ─ Details ─ */}
          {tab === 'details' && (
            isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : task ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-text2 mb-0.5">Status</p>
                    <TaskStatusSelect taskId={task.id} current={task.status} projectId={projectId} />
                  </div>
                  <div>
                    <p className="text-xs text-text2 mb-0.5">Priority</p>
                    <p className={`text-sm font-medium ${priorityColor(task.priority)}`}>{PRIORITY_LABELS[task.priority]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text2 mb-0.5">Assignee</p>
                    {task.assignee
                      ? <div className="flex items-center gap-1.5"><UserAvatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} className="h-5 w-5 text-[9px]" /><span className="text-sm text-text">{task.assignee.name}</span></div>
                      : <span className="text-text2 text-xs">Unassigned</span>}
                  </div>
                  <div>
                    <p className="text-xs text-text2 mb-0.5">Due Date</p>
                    <p className="text-sm text-text">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</p>
                  </div>
                  {task.estimatedHours && (
                    <div>
                      <p className="text-xs text-text2 mb-0.5">Estimated</p>
                      <p className="text-sm text-text">{task.estimatedHours}h</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-text2 mb-0.5">Logged</p>
                    <p className="text-sm text-text">{task.timeLogged ?? 0}h</p>
                  </div>
                </div>
                <div className="pt-1 col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-text2">Description</p>
                    {!editingDesc && (
                      <button
                        onClick={() => { setDescDraft(task.description ?? ''); setEditingDesc(true); }}
                        className="text-text2 hover:text-accent p-0.5 rounded"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {editingDesc ? (
                    <div className="space-y-2">
                      <textarea
                        value={descDraft}
                        onChange={e => setDescDraft(e.target.value)}
                        rows={4}
                        autoFocus
                        className="w-full rounded-md border border-c-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text2 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Add a description…"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await updateTask.mutateAsync({ id: task.id, data: { description: descDraft } });
                            setEditingDesc(false);
                          }}
                          className="text-xs bg-accent text-white px-2.5 py-1 rounded hover:bg-accent/90"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingDesc(false)} className="text-xs text-text2 hover:text-text px-2.5 py-1 rounded border border-c-border">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text whitespace-pre-wrap min-h-[20px]">
                      {task.description || <span className="text-text2 italic">No description</span>}
                    </p>
                  )}
                </div>
              </div>
            ) : null
          )}

          {/* ─ Links ─ */}
          {tab === 'links' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setAddingLink(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add Link</Button>
              </div>
              <div className="space-y-1">
                {linksLoading ? <div className="flex justify-center py-4"><Spinner /></div> : links.length === 0 ? (
                  <p className="text-xs text-text2 py-4 text-center">No links yet.</p>
                ) : links.map(l => (
                  <div key={l.id} className="flex items-center gap-2 p-2 rounded hover:bg-surface2 group">
                    <Link2 className="h-3.5 w-3.5 text-accent shrink-0" />
                    <a href={l.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex-1 truncate">
                      {l.label ?? l.url}
                    </a>
                    <button onClick={() => { setEditLinkId(l.id); setEditLinkForm({ url: l.url, label: l.label ?? '' }); }}
                      className="text-text2 hover:text-accent opacity-0 group-hover:opacity-100">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={() => deleteLink.mutate(l.id)}
                      className="text-text2 hover:text-red opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <Dialog open={addingLink} onOpenChange={setAddingLink}>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Add Link</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddLink} className="space-y-3">
                    <div className="space-y-1.5"><Label>URL</Label>
                      <Input type="url" value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} required placeholder="https://" /></div>
                    <div className="space-y-1.5"><Label>Label (optional)</Label>
                      <Input value={linkForm.label} onChange={e => setLinkForm(f => ({ ...f, label: e.target.value }))} placeholder="Figma, PR, Doc…" /></div>
                    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAddingLink(false)}>Cancel</Button><Button type="submit">Add</Button></div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={!!editLinkId} onOpenChange={o => !o && setEditLinkId(null)}>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Edit Link</DialogTitle></DialogHeader>
                  <form onSubmit={handleEditLink} className="space-y-3">
                    <div className="space-y-1.5"><Label>URL</Label>
                      <Input type="url" value={editLinkForm.url} onChange={e => setEditLinkForm(f => ({ ...f, url: e.target.value }))} required /></div>
                    <div className="space-y-1.5"><Label>Label</Label>
                      <Input value={editLinkForm.label} onChange={e => setEditLinkForm(f => ({ ...f, label: e.target.value }))} /></div>
                    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditLinkId(null)}>Cancel</Button><Button type="submit">Save</Button></div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ─ Comments ─ */}
          {tab === 'comments' && (
            <CommentThread entityType="task" entityId={taskId} projectId={projectId} />
          )}

          {/* ─ Activity ─ */}
          {tab === 'activity' && (
            activityLoading ? <div className="flex justify-center py-8"><Spinner /></div> :
            activity.length === 0 ? <p className="text-xs text-text2 py-8 text-center">No activity yet.</p> :
            <div className="divide-y divide-c-border">
              {activity.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 py-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 mt-2 ${entry.type === 'comment' ? 'bg-accent/60' : 'bg-amber/60'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text2 mb-0.5">{entry.type === 'comment' ? 'Comment' : (entry.data as Record<string, unknown>).action as string ?? 'System event'}</p>
                    {entry.type === 'comment' && (
                      <p className="text-xs text-text truncate">{((entry.data as Record<string, unknown>).author as Record<string, unknown>)?.name as string ?? 'User'}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-text2 shrink-0">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Tree ────────────────────────────────────────────────────────────────

function TaskTreeRow({
  task, depth, projectId, onAddSubtask,
}: {
  task: Task; depth: number; projectId: string; onAddSubtask: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const deleteTask = useDeleteTask(projectId);
  const hasChildren = (task.children?.length ?? 0) > 0;

  return (
    <>
      {detailOpen && <TaskDetailModal taskId={task.id} projectId={projectId} onClose={() => setDetailOpen(false)} />}
      <tr className="group hover:bg-surface2/50 transition-colors">
        <td className="py-1.5 pr-2 w-6 pl-2">
          {hasChildren ? (
            <button onClick={() => setExpanded(e => !e)} className="text-text2 hover:text-text">
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          ) : <span className="inline-block w-3.5" />}
        </td>
        <td className="py-1.5" style={{ paddingLeft: depth * 20 }}>
          <button onClick={() => setDetailOpen(true)} className="text-sm text-text hover:text-accent hover:underline text-left">{task.title}</button>
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
        <td className="py-1.5 pl-2 pr-3">
          <div className="flex items-center gap-1">
            <TaskTimer taskId={task.id} projectId={projectId} />
            <button onClick={() => onAddSubtask(task.id)} className="text-text2 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => deleteTask.mutate(task.id)} className="text-text2 hover:text-red opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="flex items-center justify-between mt-1.5">
        {task.assignee
          ? <UserAvatar name={task.assignee.name} avatarUrl={task.assignee.avatarUrl} className="h-5 w-5 text-[9px]" />
          : <span />}
        <div className="flex items-center gap-2">
          {(task.subtaskCount ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-text2">
              <ChevronRight className="h-2.5 w-2.5" />{task.subtaskCount}
            </span>
          )}
          {(task.timeLogged ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-text2">
              <Clock className="h-2.5 w-2.5" />{task.timeLogged}h
            </span>
          )}
          {task.dueDate && (
            <span className="text-[10px] text-text2">
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
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

type AddTaskForm = { title: string; description: string; priority: Priority; dueDate: string; assigneeId: string };

function TasksTab({ projectId }: { projectId: string }) {
  const { data: rawTasks = [], isLoading } = useTasks(projectId);
  const { data: projectTeam = [] } = useProjectTeam(projectId);
  const createTask = useCreateTask(projectId);
  const qc = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { projectId: string }) => {
      if (data.projectId === projectId) {
        qc.invalidateQueries({ queryKey: ['tasks', projectId] });
        qc.invalidateQueries({ queryKey: ['kanban', projectId] });
      }
    };
    socket.on('task:updated', handler);
    return () => { socket.off('task:updated', handler); };
  }, [projectId, qc]);
  const [showAdd, setShowAdd] = useState<string | 'root' | null>(null);
  const [form, setForm] = useState<AddTaskForm>({ title: '', description: '', priority: 'medium', dueDate: '', assigneeId: '' });
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
    const data = {
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      dueDate: form.dueDate || null,
      assigneeId: form.assigneeId || undefined,
    };
    if (showAdd === 'root') {
      await createTask.mutateAsync(data);
    } else {
      await createSubtask.mutateAsync(data);
    }
    setShowAdd(null);
    setForm({ title: '', description: '', priority: 'medium', dueDate: '', assigneeId: '' });
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
            <div className="space-y-1.5">
              <Label>Description <span className="text-text2 font-normal">(optional)</span></Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-c-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text2 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Add details…"
              />
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
            {projectTeam.length > 0 && (
              <div className="space-y-1.5">
                <Label>Assignee</Label>
                <Select value={form.assigneeId} onValueChange={v => setForm(f => ({ ...f, assigneeId: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {projectTeam.map(row => (
                      <SelectItem key={row.id} value={row.user.id} className="text-xs">{row.user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

function computeCriticalPath(tasks: GanttTask[]): Set<string> {
  const byId = new Map(tasks.map(t => [t.id, t]));

  const dur = (t: GanttTask) => {
    if (t.startDate && t.dueDate)
      return Math.max(new Date(t.dueDate).getTime() - new Date(t.startDate).getTime(), 86400000);
    return (t.estimatedHours ?? 8) * 3600000;
  };

  // Forward pass: compute earliest finish
  const ef = new Map<string, number>();
  const visited = new Set<string>();

  function fwd(id: string): number {
    if (ef.has(id)) return ef.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);
    const t = byId.get(id);
    if (!t) return 0;
    const depFinish = t.dependencies.length
      ? Math.max(...t.dependencies.map(d => fwd(d.taskId)))
      : 0;
    const finish = depFinish + dur(t);
    ef.set(id, finish);
    return finish;
  }
  tasks.forEach(t => fwd(t.id));

  const projectEnd = Math.max(...Array.from(ef.values()));

  // Backward pass: compute latest finish
  const lf = new Map<string, number>();

  // Build reverse graph: successors of each task
  const successors = new Map<string, string[]>();
  tasks.forEach(t => {
    t.dependencies.forEach(d => {
      const arr = successors.get(d.taskId) ?? [];
      arr.push(t.id);
      successors.set(d.taskId, arr);
    });
  });

  function bwd(id: string): number {
    if (lf.has(id)) return lf.get(id)!;
    const succs = successors.get(id) ?? [];
    if (!succs.length) { lf.set(id, projectEnd); return projectEnd; }
    const t = byId.get(id)!;
    const latest = Math.min(...succs.map(s => bwd(s) - dur(byId.get(s)!)));
    lf.set(id, latest + dur(t));
    return lf.get(id)!;
  }
  tasks.forEach(t => bwd(t.id));

  const critical = new Set<string>();
  tasks.forEach(t => {
    const slack = (lf.get(t.id) ?? 0) - (ef.get(t.id) ?? 0);
    if (Math.abs(slack) < 1) critical.add(t.id);
  });
  return critical;
}

type GanttZoom = 'day' | 'week' | 'month' | 'quarter';

function buildRulerTicks(minDate: Date, span: number, zoom: GanttZoom): { label: string; pct: number }[] {
  const ticks: { label: string; pct: number }[] = [];
  const cur = new Date(minDate);
  cur.setHours(0, 0, 0, 0);

  while (cur.getTime() < minDate.getTime() + span) {
    const pct = ((cur.getTime() - minDate.getTime()) / span) * 100;
    if (pct < 0) { advance(); continue; }

    let label = '';
    if (zoom === 'day') {
      label = cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      cur.setDate(cur.getDate() + 1);
    } else if (zoom === 'week') {
      label = cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      cur.setDate(cur.getDate() + 7);
    } else if (zoom === 'month') {
      label = cur.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      cur.setMonth(cur.getMonth() + 1); cur.setDate(1);
    } else {
      const q = Math.floor(cur.getMonth() / 3) + 1;
      label = `Q${q} ${cur.getFullYear()}`;
      cur.setMonth(Math.ceil(cur.getMonth() / 3) * 3); cur.setDate(1);
    }
    ticks.push({ label, pct });
    continue;
    function advance() {
      if (zoom === 'day') cur.setDate(cur.getDate() + 1);
      else if (zoom === 'week') cur.setDate(cur.getDate() + 7);
      else if (zoom === 'month') { cur.setMonth(cur.getMonth() + 1); cur.setDate(1); }
      else { cur.setMonth(Math.ceil(cur.getMonth() / 3) * 3); cur.setDate(1); }
    }
  }
  return ticks.filter(t => t.pct >= 0 && t.pct <= 100);
}

function GanttTab({ projectId }: { projectId: string }) {
  const { data: ganttTasks = [], isLoading } = useGantt(projectId);
  const updateTask = useUpdateTask(projectId);
  const [showBaseline, setShowBaseline] = useState(false);
  const [showCritical, setShowCritical] = useState(false);
  const [zoom, setZoom] = useState<GanttZoom>('week');

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const withDates = ganttTasks.filter(t => t.startDate && t.dueDate);
  if (!withDates.length) return <p className="text-sm text-text2 py-8 text-center">No tasks with start and due dates.</p>;

  const allDates = withDates.flatMap(t => [new Date(t.startDate!), new Date(t.dueDate!)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  // Pad the span based on zoom for visual breathing room
  const zoomPadMs: Record<GanttZoom, number> = { day: 86400000, week: 7*86400000, month: 30*86400000, quarter: 90*86400000 };
  const paddedMin = new Date(minDate.getTime() - zoomPadMs[zoom]);
  const paddedMax = new Date(maxDate.getTime() + zoomPadMs[zoom]);
  const span = Math.max(paddedMax.getTime() - paddedMin.getTime(), 86400000);

  const criticalSet = showCritical ? computeCriticalPath(withDates) : new Set<string>();
  const rulerTicks = buildRulerTicks(paddedMin, span, zoom);

  const statusColors: Record<string, string> = {
    todo: '#8892aa', in_progress: '#4f8ef7', in_review: '#fbbf24', blocked: '#f87171', done: '#34d399',
  };

  const handleBarDrag = (
    taskId: string,
    origStart: string,
    origDue: string,
    e: React.PointerEvent<HTMLDivElement>,
    trackEl: HTMLDivElement,
  ) => {
    e.preventDefault();
    const trackRect = trackEl.getBoundingClientRect();
    const startX = e.clientX;
    const durationMs = new Date(origDue).getTime() - new Date(origStart).getTime();
    const msPerPx = span / trackRect.width;

    const onMove = (mv: PointerEvent) => {
      const deltaMs = (mv.clientX - startX) * msPerPx;
      const newStart = new Date(new Date(origStart).getTime() + deltaMs);
      (trackEl.querySelector(`[data-task-drag="${taskId}"]`) as HTMLElement | null)?.style.setProperty(
        'left',
        `${((newStart.getTime() - paddedMin.getTime()) / span) * 100}%`,
      );
    };

    const onUp = (up: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      const deltaMs = (up.clientX - startX) * msPerPx;
      if (Math.abs(deltaMs) < 86400000 / 2) return;
      const newStart = new Date(new Date(origStart).getTime() + deltaMs);
      const newDue = new Date(newStart.getTime() + durationMs);
      updateTask.mutate({
        id: taskId,
        data: {
          startDate: newStart.toISOString().slice(0, 10),
          dueDate: newDue.toISOString().slice(0, 10),
        },
      });
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  return (
    <Card className="p-4 overflow-x-auto">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Zoom selector */}
        <div className="flex items-center rounded-md border border-c-border overflow-hidden">
          {(['day', 'week', 'month', 'quarter'] as GanttZoom[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className={`px-2.5 py-1 text-xs capitalize transition-colors ${zoom === z ? 'bg-accent text-white' : 'text-text2 hover:text-text hover:bg-surface2'}`}>
              {z}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowCritical(c => !c)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors border ${showCritical ? 'bg-red/10 border-red text-red' : 'border-c-border text-text2 hover:text-text bg-surface2'}`}
          >
            Critical Path
          </button>
          <button
            onClick={() => setShowBaseline(b => !b)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors border ${showBaseline ? 'bg-accent/10 border-accent text-accent' : 'border-c-border text-text2 hover:text-text bg-surface2'}`}
          >
            Baseline
          </button>
        </div>
      </div>

      <div className="min-w-[700px]">
        {/* Date ruler */}
        <div className="flex items-end mb-1 pl-44">
          <div className="flex-1 relative h-5">
            {rulerTicks.map((tick, i) => (
              <span
                key={i}
                className="absolute text-[9px] text-text2 whitespace-nowrap"
                style={{ left: `${tick.pct}%`, transform: 'translateX(-50%)' }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>

        {/* Today line marker */}
        <div className="relative">
          {/* Rows */}
          <div className="space-y-2">
            {withDates.map(t => {
              const left = (new Date(t.startDate!).getTime() - paddedMin.getTime()) / span * 100;
              const width = Math.max((new Date(t.dueDate!).getTime() - new Date(t.startDate!).getTime()) / span * 100, 1);
              const isCritical = criticalSet.has(t.id);
              const barColor = isCritical ? '#f87171' : (statusColors[t.status] ?? '#4f8ef7');

              const hasBaseline = showBaseline && t.baselineStartDate && t.baselineDueDate;
              const blLeft = hasBaseline ? (new Date(t.baselineStartDate!).getTime() - paddedMin.getTime()) / span * 100 : 0;
              const blWidth = hasBaseline ? Math.max((new Date(t.baselineDueDate!).getTime() - new Date(t.baselineStartDate!).getTime()) / span * 100, 1) : 0;

              return (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 truncate text-xs text-text2" title={t.title}>{t.title}</div>
                  <div className="flex-1 h-6 relative rounded bg-surface2" data-track={t.id}>
                    {/* Today line */}
                    {(() => {
                      const todayPct = (Date.now() - paddedMin.getTime()) / span * 100;
                      return todayPct >= 0 && todayPct <= 100
                        ? <div className="absolute top-0 bottom-0 w-px bg-amber/70 z-10" style={{ left: `${todayPct}%` }} />
                        : null;
                    })()}
                    {hasBaseline && (
                      <div className="absolute h-1 rounded top-1/2 -translate-y-1/2 opacity-60"
                        style={{ left: `${blLeft}%`, width: `${blWidth}%`, background: '#818cf8' }} />
                    )}
                    <div
                      data-task-drag={t.id}
                      className={`absolute h-full rounded text-[10px] text-white flex items-center px-1.5 overflow-hidden whitespace-nowrap select-none cursor-grab active:cursor-grabbing ${isCritical ? 'ring-1 ring-red/70' : ''}`}
                      style={{ left: `${left}%`, width: `${width}%`, background: barColor }}
                      onPointerDown={e => {
                        const track = e.currentTarget.closest('[data-track]') as HTMLDivElement | null;
                        if (track) handleBarDrag(t.id, t.startDate!, t.dueDate!, e, track);
                      }}
                    >
                      {width > 8 ? t.title : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showBaseline && (
          <div className="flex items-center gap-4 mt-3 text-xs text-text2">
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-2 rounded" style={{ background: '#4f8ef7' }} /> current</span>
            <span className="flex items-center gap-1"><span className="inline-block w-4 h-1 rounded bg-indigo-400/60" /> baseline</span>
            <span className="flex items-center gap-1"><span className="inline-block w-px h-3 bg-amber/70" /> today</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Tab: Kanban ──────────────────────────────────────────────────────────────

type SwimMode = 'status' | 'assignee' | 'priority';

function KanbanTab({ projectId }: { projectId: string }) {
  const { data: board, isLoading } = useKanban(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const updateTask = useUpdateTask(projectId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<SwimMode>('status');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  if (isLoading || !board) return <div className="flex justify-center py-12"><Spinner /></div>;

  let allTasks = TASK_STATUSES.flatMap(s => board[s] ?? []);
  if (filterAssignee) allTasks = allTasks.filter(t => t.assignee?.id === filterAssignee);
  if (filterPriority) allTasks = allTasks.filter(t => t.priority === filterPriority);

  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : null;
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const overId = over.id as string;
    const newStatus = TASK_STATUSES.find(s => s === overId || allTasks.find(t => t.id === overId && board[s]?.some(bt => bt.id === overId)));
    if (newStatus) updateTask.mutate({ id: active.id as string, data: { status: newStatus } });
  };

  // Build swim lanes
  let lanes: { key: string; label: string; tasks: Task[] }[] = [];
  if (mode === 'status') {
    lanes = TASK_STATUSES.map(s => ({ key: s, label: STATUS_LABELS[s], tasks: allTasks.filter(t => t.status === s) }));
  } else if (mode === 'assignee') {
    const members = team.map(r => r.user);
    const unassigned = allTasks.filter(t => !t.assigneeId);
    lanes = [
      ...members.map(m => ({ key: m.id, label: m.name, tasks: allTasks.filter(t => t.assigneeId === m.id) })),
      ...(unassigned.length ? [{ key: 'unassigned', label: 'Unassigned', tasks: unassigned }] : []),
    ].filter(l => l.tasks.length);
  } else {
    const priorities = ['critical', 'high', 'medium', 'low'] as const;
    lanes = priorities.map(p => ({ key: p, label: PRIORITY_LABELS[p], tasks: allTasks.filter(t => t.priority === p) })).filter(l => l.tasks.length);
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text2">Group by:</span>
        {(['status', 'assignee', 'priority'] as SwimMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors capitalize ${mode === m ? 'bg-accent text-white' : 'bg-surface2 text-text2 hover:text-text border border-c-border'}`}>
            {m}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="rounded border border-c-border bg-surface2 px-2 py-1 text-xs text-text2 focus:outline-none">
            <option value="">All people</option>
            {team.map(r => <option key={r.user.id} value={r.user.id}>{r.user.name}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="rounded border border-c-border bg-surface2 px-2 py-1 text-xs text-text2 focus:outline-none">
            <option value="">All priorities</option>
            {(['critical', 'high', 'medium', 'low'] as const).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {lanes.map(lane => (
            <div key={lane.key} className="shrink-0 w-56">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-text">{lane.label}</span>
                <span className="text-xs text-text2">{lane.tasks.length}</span>
              </div>
              <SortableContext items={lane.tasks.map(t => t.id)} strategy={verticalListSortingStrategy} id={lane.key}>
                <div className="space-y-2 min-h-[200px] rounded-lg border border-dashed border-c-border p-2">
                  {lane.tasks.map(task => <KanbanCard key={task.id} task={task} />)}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeTask && <KanbanCard task={activeTask} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ─── Tab: Links ───────────────────────────────────────────────────────────────

function LinksTab({ projectId }: { projectId: string }) {
  const { data: links = [], isLoading } = useLinks('project', projectId);
  const addLink = useCreateLink();
  const updateLink = useUpdateLink('project', projectId);
  const deleteLink = useDeleteLink('project', projectId);
  const [addForm, setAddForm] = useState({ url: '', label: '' });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ url: '', label: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addLink.mutateAsync({ entityType: 'project', entityId: projectId, url: addForm.url, label: addForm.label || undefined });
    setAddForm({ url: '', label: '' });
    setAdding(false);
  };

  const openEdit = (l: { id: string; url: string; label: string | null }) => {
    setEditId(l.id);
    setEditForm({ url: l.url, label: l.label ?? '' });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    await updateLink.mutateAsync({ id: editId, data: { url: editForm.url, label: editForm.label || undefined } });
    setEditId(null);
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
          <div key={l.id} className="flex items-center gap-3 p-3 group">
            <Link2 className="h-4 w-4 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <a href={l.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1 truncate">
                {l.label ?? l.url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              {l.label && <p className="text-xs text-text2 truncate">{l.url}</p>}
            </div>
            <button onClick={() => openEdit(l)} className="text-text2 hover:text-accent shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => deleteLink.mutate(l.id)} className="text-text2 hover:text-red shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <Input type="url" value={addForm.url} onChange={e => setAddForm(f => ({ ...f, url: e.target.value }))} required placeholder="https://" />
            </div>
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input value={addForm.label} onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))} placeholder="Design doc" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              <Button type="submit" disabled={addLink.isPending}>Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={o => !o && setEditId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Link</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>URL</Label>
              <Input type="url" value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Label (optional)</Label>
              <Input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
              <Button type="submit" disabled={updateLink.isPending}>Save</Button>
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
  const deleteLog = useDeleteTimeLog();
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
          <div key={l.id} className="flex items-center gap-4 p-3 group">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text truncate">{l.task?.title ?? '—'}</p>
              <p className="text-[10px] text-text2">{l.user?.name ?? '—'} · {new Date(l.date).toLocaleDateString()}</p>
            </div>
            <span className="text-sm font-semibold text-text">{l.hours}h</span>
            {l.note && <span className="text-xs text-text2 truncate max-w-[120px]">{l.note}</span>}
            <button
              onClick={() => deleteLog.mutate(l.id)}
              className="text-text2 hover:text-red shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete log"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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

const TABS = ['overview', 'tasks', 'gantt', 'kanban', 'links', 'time', 'comments', 'activity'] as const;
type Tab = typeof TABS[number];

type EditProjectForm = { title: string; description: string; priority: string; status: string; startDate: string; dueDate: string; tagsInput: string };

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditProjectForm>({ title: '', description: '', priority: 'medium', status: 'planning', startDate: '', dueDate: '', tagsInput: '' });
  const { data: project, isLoading } = useProject(id);
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject(id);

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
          <div className="flex items-center gap-2">
            <Badge variant={projectStatusVariant(project.status)} className="text-[10px]">
              {project.status.replace('_', ' ')}
            </Badge>
            <button
              onClick={() => {
                setEditForm({
                  title: project.title,
                  description: project.description ?? '',
                  priority: project.priority,
                  status: project.status,
                  startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
                  dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '',
                  tagsInput: (project.tags ?? []).join(', '),
                });
                setShowEdit(true);
              }}
              className="text-text2 hover:text-accent transition-colors p-1 rounded"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setShowDeleteProject(true)} className="text-text2 hover:text-red transition-colors p-1 rounded">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />
      <Dialog open={showDeleteProject} onOpenChange={setShowDeleteProject}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red" />Delete Project</DialogTitle></DialogHeader>
          <p className="text-sm text-text2">This will permanently delete <span className="font-medium text-text">{project.title}</span> and all its tasks. This cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteProject(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteProject.isPending} onClick={async () => {
              await deleteProject.mutateAsync(id);
              router.replace('/projects');
            }}>
              {deleteProject.isPending ? 'Deleting…' : 'Delete Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <form
            onSubmit={async e => {
              e.preventDefault();
              const tags = editForm.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
              await updateProject.mutateAsync({
                title: editForm.title,
                description: editForm.description || undefined,
                priority: editForm.priority,
                status: editForm.status,
                startDate: editForm.startDate || null,
                dueDate: editForm.dueDate || null,
                tags,
              });
              setShowEdit(false);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Input
                value={editForm.tagsInput}
                onChange={e => setEditForm(f => ({ ...f, tagsInput: e.target.value }))}
                placeholder="design, backend, api  (comma-separated)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(f => ({ ...f, priority: v }))}>
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
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={editForm.dueDate} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
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
        {tab === 'comments' && <CommentThread entityType="project" entityId={id} projectId={id} />}
        {tab === 'activity' && <ActivityTab projectId={id} />}
      </div>
    </div>
  );
}
