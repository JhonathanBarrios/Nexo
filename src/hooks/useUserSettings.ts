import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

export interface UserSettings {
  id: string
  user_id: string
  currency: string
  date_format: string
  first_day_of_week: string
  savings_goal: number
  created_at: string
  updated_at: string
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSettings(null)
        return
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      setSettings(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data: existingData } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingData) {
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingData.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          })

        if (insertError) throw insertError
      }

      setSettings(prev => prev ? { ...prev, ...updates } : null)
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSettings,
  }
}
