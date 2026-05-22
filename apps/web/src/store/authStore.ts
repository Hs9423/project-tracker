'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  path: string;
  depth: number;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  login: (user: AuthUser, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAccessToken: (token) => set({ accessToken: token }),
      setUser: (user) => set({ user }),
      login: (user, accessToken) => {
        set({ user, accessToken });
        connectSocket(accessToken);
      },
      logout: () => {
        set({ user: null, accessToken: null });
        disconnectSocket();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
