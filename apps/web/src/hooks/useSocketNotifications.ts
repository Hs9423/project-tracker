'use client';
import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { pushToast } from '@/components/ui/toast';
import type { Notification } from '@/types/api';

export function useSocketNotifications() {
  const { accessToken } = useAuthStore();
  const { increment } = useNotificationStore();

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);

    const handleNotification = (n: Notification) => {
      increment();
      pushToast({ message: n.message, entityType: n.entityType, entityId: n.entityId });
    };

    socket.on('notification', handleNotification);
    return () => { socket.off('notification', handleNotification); };
  }, [accessToken, increment]);
}
