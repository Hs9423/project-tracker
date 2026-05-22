'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { UserAvatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { Settings, Bell, Mail, User, Lock } from 'lucide-react';

interface Prefs { emailNotifications: boolean; notificationDigest: string }

function inputCls() {
  return 'w-full rounded-md border border-c-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text2 focus:outline-none focus:border-accent';
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();

  // ── Profile ──────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const saveProfile = useMutation({
    mutationFn: () => api.patch('/users/me', { name: name.trim(), avatarUrl: avatarUrl.trim() || null }).then(r => r.data),
    onSuccess: (data) => {
      if (user) setUser({ ...user, name: data.name, avatarUrl: data.avatarUrl });
      setProfileMsg('Saved!');
      setTimeout(() => setProfileMsg(null), 2000);
    },
  });

  // ── Password ─────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const changePassword = useMutation({
    mutationFn: () => api.patch('/users/me/password', { currentPassword, newPassword }).then(r => r.data),
    onSuccess: () => {
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setPwMsg({ text: 'Password changed!', ok: true });
      setTimeout(() => setPwMsg(null), 2000);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setPwMsg({ text: e?.response?.data?.message ?? 'Failed', ok: false });
    },
  });

  const handlePasswordSave = () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) { setPwMsg({ text: 'Passwords do not match', ok: false }); return; }
    if (newPassword.length < 8) { setPwMsg({ text: 'Must be at least 8 characters', ok: false }); return; }
    changePassword.mutate();
  };

  // ── Notification prefs ────────────────────────────────────────────────────
  const { data: prefs, isLoading: prefsLoading } = useQuery<Prefs>({
    queryKey: ['users', 'me', 'preferences'],
    queryFn: () => api.get('/users/me/preferences').then(r => r.data),
  });
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [digest, setDigest] = useState('off');

  useEffect(() => {
    if (prefs) { setEmailNotifications(prefs.emailNotifications); setDigest(prefs.notificationDigest); }
  }, [prefs]);

  const savePrefs = useMutation({
    mutationFn: () => api.patch('/users/me/preferences', { emailNotifications, notificationDigest: digest }),
  });

  if (prefsLoading) return <div className="flex justify-center p-12"><Spinner /></div>;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-bold text-text">Settings</h1>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-c-border bg-surface divide-y divide-c-border">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
            <User className="h-4 w-4" /> Profile
          </h2>
          <div className="flex items-center gap-4 mb-5">
            <UserAvatar name={name || user?.name || ''} avatarUrl={avatarUrl || null} className="h-12 w-12 text-sm" />
            <div>
              <p className="text-sm font-medium text-text">{name || user?.name}</p>
              <p className="text-xs text-text2">{user?.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text2 mb-1">Display name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls()} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-xs text-text2 mb-1">Avatar URL</label>
              <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className={inputCls()} placeholder="https://…" />
            </div>
          </div>
        </div>
        <div className="px-6 py-3 flex items-center justify-end gap-3">
          {profileMsg && <span className="text-xs text-green">{profileMsg}</span>}
          {saveProfile.isError && <span className="text-xs text-red">Failed to save</span>}
          <Button size="sm" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
            {saveProfile.isPending ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-xl border border-c-border bg-surface divide-y divide-c-border">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-text flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4" /> Change Password
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-text2 mb-1">Current password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputCls()} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs text-text2 mb-1">New password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls()} placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="block text-xs text-text2 mb-1">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls()} placeholder="••••••••" />
            </div>
          </div>
        </div>
        <div className="px-6 py-3 flex items-center justify-end gap-3">
          {pwMsg && <span className={`text-xs ${pwMsg.ok ? 'text-green' : 'text-red'}`}>{pwMsg.text}</span>}
          <Button size="sm" onClick={handlePasswordSave} disabled={changePassword.isPending || !currentPassword || !newPassword}>
            {changePassword.isPending ? 'Saving…' : 'Change Password'}
          </Button>
        </div>
      </div>

      {/* Notification preferences */}
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
                  <button key={opt.value} onClick={() => setDigest(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${digest === opt.value ? 'bg-accent text-white' : 'bg-surface2 text-text2 hover:text-text border border-c-border'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-3 flex items-center justify-end gap-3">
          {savePrefs.isSuccess && <span className="text-xs text-green">Saved!</span>}
          <Button size="sm" onClick={() => savePrefs.mutate()} disabled={savePrefs.isPending}>
            {savePrefs.isPending ? 'Saving…' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
}
