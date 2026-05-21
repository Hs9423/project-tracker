'use client';
import { useState } from 'react';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { UserAvatar } from '@/components/ui/avatar';
import { projectStatusVariant, priorityDot } from '@/lib/statusHelpers';
import { Plus, Search, Calendar, FolderOpen, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import type { Project } from '@/types/api';
import { useMyTeam } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/authStore';

function ProjectListCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  const tasks: Partial<Record<string, number>> = project.tasksByStatus ?? {};
  const total = Object.values(tasks).reduce<number>((s, n) => s + (n ?? 0), 0);
  const done = tasks['done'] ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card className="p-4 hover:border-accent/50 transition-colors group relative">
      <div className="flex items-start gap-3">
        <div className="rounded-lg p-2 bg-surface2 text-accent shrink-0">
          <FolderOpen className="h-4 w-4" />
        </div>
        <Link href={`/projects/${project.id}`} className="flex-1 min-w-0 block">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-medium text-text group-hover:text-accent transition-colors truncate">
              {project.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`h-1.5 w-1.5 rounded-full ${priorityDot(project.priority)}`} />
              <Badge variant={projectStatusVariant(project.status)} className="text-[10px]">
                {project.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
            {project.description && (
              <p className="text-xs text-text2 line-clamp-1 mb-2">{project.description}</p>
            )}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-text2">{pct}%</span>
                  <span className="text-[10px] text-text2">{done}/{total} tasks</span>
                </div>
                <div className="h-1 rounded-full bg-surface2">
                  <div className="h-1 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {project.assignments?.slice(0, 3).map(a => (
                  <UserAvatar key={a.id} name={a.assignee.name} avatarUrl={a.assignee.avatarUrl} className="h-5 w-5 text-[9px]" />
                ))}
              </div>
              {project.dueDate && (
                <span className="text-[10px] text-text2 flex items-center gap-1 shrink-0">
                  <Calendar className="h-3 w-3" />
                  {new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
        </Link>
        <button
          onClick={e => { e.stopPropagation(); onDelete(project.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-text2 hover:text-red p-1 shrink-0 self-start mt-0.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<{ title: string; description: string; priority: string; status: string; startDate: string; dueDate: string; assignedTo: string[]; tagsInput: string }>({ title: '', description: '', priority: 'medium', status: 'planning', startDate: '', dueDate: '', assignedTo: [], tagsInput: '' });

  const params: Record<string, string> = {};
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: projects = [], isLoading } = useProjects(Object.keys(params).length ? params : undefined);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const { data: team = [] } = useMyTeam();
  const { user } = useAuthStore();

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assignedTo = form.assignedTo.length > 0 ? form.assignedTo : undefined;
      const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      await createProject.mutateAsync({
        title: form.title, description: form.description, priority: form.priority,
        status: form.status, startDate: form.startDate || null, dueDate: form.dueDate || null,
        assignedTo, tags,
      });
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium', status: 'planning', startDate: '', dueDate: '', assignedTo: [], tagsInput: '' });
    } catch {
      // error stays in createProject.error
    }
  };

  const toggleAssignee = (id: string) => {
    setForm(f => ({
      ...f,
      assignedTo: f.assignedTo.includes(id) ? f.assignedTo.filter(x => x !== id) : [...f.assignedTo, id],
    }));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProject.mutateAsync(deleteId);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Projects"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Project
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text2" />
            <Input
              className="pl-8 text-sm h-8"
              placeholder="Search projects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-10 w-10 text-text2 mb-3" />
            <p className="text-sm text-text2">No projects found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => <ProjectListCard key={p.id} project={p} onDelete={setDeleteId} />)}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text2">This will permanently delete the project and all its tasks. This cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
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
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <Input
                value={form.tagsInput}
                onChange={e => setForm(f => ({ ...f, tagsInput: e.target.value }))}
                placeholder="design, backend, api  (comma-separated)"
              />
            </div>
            {(user || team.length > 0) && (
              <div className="space-y-1.5">
                <Label>Assignees</Label>
                <div className="max-h-36 overflow-y-auto rounded-md border border-c-border bg-surface divide-y divide-c-border">
                  {user && (
                    <button
                      type="button"
                      onClick={() => toggleAssignee(user.id)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-surface2/50 transition-colors"
                    >
                      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} className="h-5 w-5 text-[9px] shrink-0" />
                      <span className="text-xs text-text flex-1 truncate">{user.name} <span className="text-text2">(you)</span></span>
                      {form.assignedTo.includes(user.id) && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                    </button>
                  )}
                  {team.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAssignee(m.id)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-surface2/50 transition-colors"
                    >
                      <UserAvatar name={m.name} avatarUrl={m.avatarUrl} className="h-5 w-5 text-[9px] shrink-0" />
                      <span className="text-xs text-text flex-1 truncate">{m.name}</span>
                      {form.assignedTo.includes(m.id) && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? 'Creating…' : 'Create Project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
