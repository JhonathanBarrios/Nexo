import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import toast from 'react-hot-toast';

export interface NotificationSettings {
  budget_alerts_enabled: boolean;
  alert_at_50: boolean;
  alert_at_80: boolean;
  alert_at_100: boolean;
  payment_reminders_enabled: boolean;
  reminder_days_before: number;
}

export function useNotifications(userId: string | undefined) {
  const [settings, setSettings] = useState<NotificationSettings>({
    budget_alerts_enabled: true,
    alert_at_50: true,
    alert_at_80: true,
    alert_at_100: true,
    payment_reminders_enabled: true,
    reminder_days_before: 3,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading notification settings:', error);
        throw error;
      }

      if (data) {
        setSettings({
          budget_alerts_enabled: data.budget_alerts_enabled ?? true,
          alert_at_50: data.alert_at_50 ?? true,
          alert_at_80: data.alert_at_80 ?? true,
          alert_at_100: data.alert_at_100 ?? true,
          payment_reminders_enabled: data.payment_reminders_enabled ?? true,
          reminder_days_before: data.reminder_days_before ?? 3,
        });
      }
      // Si no existe data, se usan los valores por defecto del estado inicial
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!userId) return;

    try {
      // Primero verificar si existe un registro
      const { data: existingData } = await supabase
        .from('user_notifications')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingData) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('user_notifications')
          .update({
            ...newSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingData.id)
          .select()
          .single();

        if (updateError) throw updateError;
      } else {
        // Insertar nuevo registro
        const { error: insertError } = await supabase
          .from('user_notifications')
          .insert({
            user_id: userId,
            ...settings,
            ...newSettings,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
      }

      setSettings(prev => ({ ...prev, ...newSettings }));
      toast.success('Preferencias de notificación actualizadas');
    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      toast.error('Error al actualizar preferencias: ' + error.message);
      throw error;
    }
  };

  return { settings, updateSettings, loading };
}
