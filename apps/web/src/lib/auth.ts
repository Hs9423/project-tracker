'use client';

import { useAuthStore } from '@/store/authStore';
import api from './api';

export async function fetchAndStoreMe(): Promise<void> {
  try {
    const { data } = await api.get('/auth/me');
    useAuthStore.getState().login(data, useAuthStore.getState().accessToken ?? '');
  } catch {
    useAuthStore.getState().logout();
  }
}

export function isAuthenticated(): boolean {
  return useAuthStore.getState().user !== null;
}

export function isSuperAdmin(): boolean {
  return useAuthStore.getState().user?.role === 'super_admin';
}
