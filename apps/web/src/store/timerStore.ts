'use client';

import { create } from 'zustand';

interface TimerEntry {
  taskId: string;
  startedAt: number;
}

interface TimerState {
  activeTimer: TimerEntry | null;
  elapsed: number;
  startTimer: (taskId: string) => void;
  stopTimer: () => TimerEntry | null;
  tick: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeTimer: null,
  elapsed: 0,

  startTimer: (taskId) => {
    const current = get().activeTimer;
    if (current?.taskId === taskId) return;
    set({ activeTimer: { taskId, startedAt: Date.now() }, elapsed: 0 });
  },

  stopTimer: () => {
    const timer = get().activeTimer;
    set({ activeTimer: null, elapsed: 0 });
    return timer;
  },

  tick: () => {
    const { activeTimer } = get();
    if (!activeTimer) return;
    set({ elapsed: Math.floor((Date.now() - activeTimer.startedAt) / 1000) });
  },
}));
