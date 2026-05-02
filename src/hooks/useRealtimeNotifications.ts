import { useEffect, useState } from 'react';
import { supabase } from '../api/supabase';
import { useAuthStore } from '../store/authStore';

export interface RealtimeNotification {
  type: 'budget_alert';
  payload: {
    threshold: number;
    percentage: number;
    spent: number;
    budget: number;
    category_id: string;
  };
}

export function useRealtimeNotifications() {
  const { user } = useAuthStore();
  const [notification, setNotification] = useState<RealtimeNotification | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to Realtime broadcasts only (simpler, no postgres_changes)
    const channel = supabase
      .channel(`user-${user.id}`)
      .on('broadcast', { event: 'budget_alert' }, (payload: any) => {
        setNotification(payload);
        
        // Show toast notification
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Alerta de Presupuesto', {
              body: `Has gastado el ${payload.payload.percentage.toFixed(0)}% de tu presupuesto`,
              icon: '/favicon.svg',
            });
          }
        }
      })
      .subscribe();

    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { notification };
}
