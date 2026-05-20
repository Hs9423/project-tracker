'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Settings, Bell, Mail } from 'lucide-react';

interface Prefs { emailNotifications: boolean; notificationDigest: string }

export default function SettingsPage() {
  const { data, isLoading } = useQuery<Prefs>({
    queryKey: ['users', 'me', 'preferences'],
    queryFn: () => api.get('/users/me/preferences').then(r => r.data),
  });

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [digest, setDigest] = useState('off');

  useEffect(() => {
    if (data) { setEmailNotifications(data.emailNotifications); setDigest(data.notificationDigest); }
  }, [data]);

  const save = useMutation({
    mutationFn: () => api.patch('/users/me/preferences', { emailNotifications, notificationDigest: digest }),
  });

  if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-bold text-text">Settings</h1>
      </div>

      <div className="rounded-xl border border-c-border bg-surface divide-y divide-c-border">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4" /> Notification Preferences
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text">Email notifications</p>
                <p className="text-xs text-text2">Receive email alerts for task assignments, mentions, and due dates</p>
              </div>
              <button
                role="switch"
                aria-checked={emailNotifications}
                onClick={() => setEmailNotifications(e => !e)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${emailNotifications ? 'bg-accent' : 'bg-surface2 border border-c-border'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${emailNotifications ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </label>

            <div>
              <p className="text-sm text-text mb-1 flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Digest mode</p>
              <p className="text-xs text-text2 mb-2">Batch unread notifications into a single email summary</p>
              <div className="flex gap-2">
                {[{ value: 'off', label: 'Off' }, { value: 'daily', label: 'Daily (7am)' }, { value: 'weekly', label: 'Weekly (Mon 7am)' }].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDigest(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${digest === opt.value ? 'bg-accent text-white' : 'bg-surface2 text-text2 hover:text-text border border-c-border'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-3">
          {save.isSuccess && <span className="text-xs text-green">Saved!</span>}
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
