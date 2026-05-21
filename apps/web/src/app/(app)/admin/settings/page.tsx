'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Settings, Bell, Shield, Users } from 'lucide-react';

interface SystemSettings {
  allowSelfRegistration: boolean;
  defaultNotificationsEnabled: boolean;
  maxHierarchyDepth: number;
  sessionTimeoutMinutes: number;
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<SystemSettings>({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get('/admin/settings').then(r => r.data),
  });

  const [form, setForm] = useState<SystemSettings>({
    allowSelfRegistration: false,
    defaultNotificationsEnabled: true,
    maxHierarchyDepth: 10,
    sessionTimeoutMinutes: 60,
  });

  const [initialized, setInitialized] = useState(false);
  if (data && !initialized) {
    setForm(data);
    setInitialized(true);
  }

  const save = useMutation({
    mutationFn: () => api.patch('/admin/settings', form).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'settings'] }),
  });

  if (isLoading) return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Admin Settings" />
      <div className="flex justify-center py-12"><Spinner /></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar
        title="Admin Settings"
        actions={
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {save.isSuccess && (
            <div className="rounded-md bg-green/10 border border-green/30 px-4 py-2 text-sm text-green">
              Settings saved successfully.
            </div>
          )}
          {save.isError && (
            <div className="rounded-md bg-red/10 border border-red/30 px-4 py-2 text-sm text-red">
              Failed to save settings. Check that the API endpoint exists.
            </div>
          )}

          {/* User Management */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-accent" />
              User Management
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text">Allow self-registration</p>
                  <p className="text-xs text-text2">Allow users to sign up without admin invitation</p>
                </div>
                <button
                  role="switch"
                  aria-checked={form.allowSelfRegistration}
                  onClick={() => setForm(f => ({ ...f, allowSelfRegistration: !f.allowSelfRegistration }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.allowSelfRegistration ? 'bg-accent' : 'bg-surface2 border border-c-border'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.allowSelfRegistration ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </label>

              <div className="space-y-1.5">
                <Label>Max hierarchy depth</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.maxHierarchyDepth}
                    onChange={e => setForm(f => ({ ...f, maxHierarchyDepth: parseInt(e.target.value) || 10 }))}
                    className="w-24 h-8 text-sm"
                  />
                  <span className="text-xs text-text2">levels deep (1–20)</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
              <Bell className="h-4 w-4 text-accent" />
              Notification Defaults
            </h2>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text">Email notifications enabled by default</p>
                <p className="text-xs text-text2">New users will have email notifications turned on</p>
              </div>
              <button
                role="switch"
                aria-checked={form.defaultNotificationsEnabled}
                onClick={() => setForm(f => ({ ...f, defaultNotificationsEnabled: !f.defaultNotificationsEnabled }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.defaultNotificationsEnabled ? 'bg-accent' : 'bg-surface2 border border-c-border'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.defaultNotificationsEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </label>
          </Card>

          {/* Security */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-accent" />
              Security
            </h2>
            <div className="space-y-1.5">
              <Label>Session timeout (minutes)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={15}
                  max={10080}
                  value={form.sessionTimeoutMinutes}
                  onChange={e => setForm(f => ({ ...f, sessionTimeoutMinutes: parseInt(e.target.value) || 60 }))}
                  className="w-28 h-8 text-sm"
                />
                <span className="text-xs text-text2">minutes (15 min – 7 days)</span>
              </div>
              <p className="text-xs text-text2">Controls how long refresh tokens remain valid</p>
            </div>
          </Card>

          <Card className="p-5 border-amber/30 bg-amber/5">
            <div className="flex items-start gap-3">
              <Settings className="h-4 w-4 text-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text">Backend persistence note</p>
                <p className="text-xs text-text2 mt-1">
                  This page requires a <code className="bg-surface2 px-1 rounded text-[11px]">GET/PATCH /admin/settings</code> endpoint on the API.
                  Until that endpoint is implemented, changes will return a 404 — the UI is ready and waiting.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
