'use client';
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Play, Square } from 'lucide-react';

const STORAGE_KEY = 'task_timer';

interface TimerState { taskId: string; startMs: number }

function getActive(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch { return null; }
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function TaskTimer({ taskId, projectId }: { taskId: string; projectId: string }) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const active = getActive();
    if (active?.taskId === taskId) {
      setRunning(true);
      setElapsed(Date.now() - active.startMs);
    }
  }, [taskId]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const active = getActive();
        if (active?.taskId === taskId) setElapsed(Date.now() - active.startMs);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, taskId]);

  const logTime = useMutation({
    mutationFn: (hours: number) =>
      api.post(`/tasks/${taskId}/time-logs`, {
        date: new Date().toISOString().slice(0, 10),
        hours: Math.max(0.01, Math.round(hours * 100) / 100),
        note: 'Timer',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['time-logs', taskId] });
    },
  });

  const start = () => {
    const existing = getActive();
    if (existing) return; // another task is running
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ taskId, startMs: Date.now() }));
    setRunning(true);
    setElapsed(0);
  };

  const stop = () => {
    const active = getActive();
    if (!active || active.taskId !== taskId) return;
    const hours = (Date.now() - active.startMs) / 3600_000;
    localStorage.removeItem(STORAGE_KEY);
    setRunning(false);
    setElapsed(0);
    if (hours >= 1 / 60) logTime.mutate(hours);
  };

  return (
    <div className="flex items-center gap-1">
      {running && (
        <span className="text-[10px] font-mono text-green tabular-nums">{fmt(elapsed)}</span>
      )}
      <button
        onClick={running ? stop : start}
        title={running ? 'Stop timer' : 'Start timer'}
        className={`rounded p-0.5 transition-colors ${running ? 'text-green hover:text-red' : 'text-text2 hover:text-accent opacity-0 group-hover:opacity-100'}`}
      >
        {running ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
    </div>
  );
}
