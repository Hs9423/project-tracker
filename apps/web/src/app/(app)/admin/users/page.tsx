'use client';
import { useState } from 'react';
import {
  useAdminUsers, useCreateAdminUser, useUpdateAdminUser, useDeactivateUser,
} from '@/hooks/useAdmin';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, UserX, Pencil } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { User } from '@/types/api';

type UserForm = {
  name: string; email: string; password: string;
  role: 'super_admin' | 'user'; reportsToId: string;
};

const EMPTY_FORM: UserForm = { name: '', email: '', password: '', role: 'user', reportsToId: '' };

function UserActions({ user, onEdit }: { user: User; onEdit: (u: User) => void }) {
  const deactivate = useDeactivateUser(user.id);
  const [confirm, setConfirm] = useState(false);

  return (
    <>
      <ConfirmDialog
        open={confirm}
        title={`Deactivate ${user.name}?`}
        description="This user will no longer be able to log in. Their data will be preserved."
        confirmLabel="Deactivate"
        destructive
        onConfirm={async () => { await deactivate.mutateAsync(); setConfirm(false); }}
        onCancel={() => setConfirm(false)}
        isPending={deactivate.isPending}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-text2 hover:text-text p-1 rounded hover:bg-surface2">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="h-3.5 w-3.5 mr-2" />Edit
          </DropdownMenuItem>
          {user.isActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red focus:text-red" onClick={() => setConfirm(true)}>
                <UserX className="h-3.5 w-3.5 mr-2" />Deactivate
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);

  const { data, isLoading } = useAdminUsers({ page, limit: 20, ...(search ? { search } : {}) });
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser(editUser?.id ?? '');

  const users = data?.data ?? [];
  const meta = data?.meta;

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role, reportsToId: u.reportsTo ?? '' });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createUser.mutateAsync({ ...form, reportsToId: form.reportsToId || null });
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser.mutateAsync({
      name: form.name,
      email: form.email,
      role: form.role,
      ...(form.password ? { password: form.password } : {}),
    });
    setEditUser(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Users"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />New User
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="relative max-w-xs mb-5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text2" />
          <Input
            className="pl-8 text-sm h-8"
            placeholder="Search users…"
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
                  <th className="py-2.5 pl-4 text-left text-xs font-medium text-text2">User</th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-text2">Email</th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-text2">Role</th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-text2">Manager</th>
                  <th className="py-2.5 px-3 text-left text-xs font-medium text-text2">Status</th>
                  <th className="py-2.5 pr-4 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-c-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-surface2/30 transition-colors">
                    <td className="py-2.5 pl-4">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} avatarUrl={u.avatarUrl} className="h-7 w-7 text-xs" />
                        <span className="text-sm font-medium text-text">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-sm text-text2">{u.email}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={u.role === 'super_admin' ? 'warning' : 'muted'} className="text-[10px]">
                        {u.role === 'super_admin' ? 'Admin' : 'User'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs text-text2">{u.manager?.name ?? '—'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <UserActions user={u} onEdit={openEdit} />
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-text2">No users found.</td>
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New User</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserForm['role'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="super_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createUser.isPending}>Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit {editUser?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserForm['role'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="super_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" disabled={updateUser.isPending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
