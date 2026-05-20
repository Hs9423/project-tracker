'use client';
import { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';
import { X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function pushToast(toast: Omit<Toast, 'id'>) {
  useToastStore.getState().push(toast);
}

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToastStore();
  const href = toast.entityType && toast.entityId
    ? toast.entityType === 'project' ? `/projects/${toast.entityId}` : `/projects?task=${toast.entityId}`
    : null;

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-lg border border-c-border bg-surface p-3 shadow-lg',
      'animate-in slide-in-from-right-4 duration-200',
    )}>
      <div className="mt-0.5 rounded-md bg-accent/15 p-1.5 text-accent shrink-0">
        <Bell className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        {href ? (
          <a href={href} className="text-xs font-medium text-text hover:text-accent transition-colors line-clamp-2">
            {toast.message}
          </a>
        ) : (
          <p className="text-xs font-medium text-text line-clamp-2">{toast.message}</p>
        )}
      </div>
      <button onClick={() => dismiss(toast.id)} className="text-text2 hover:text-text shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();
  if (!toasts.length) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
