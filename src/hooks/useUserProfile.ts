import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url: string | null
  budget_start_day: number
  created_at: string
  updated_at: string
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setProfile(null)
        return
      }

      // Usar id en lugar de user_id para la tabla pública users
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // Si no existe perfil, crear uno con valores por defecto
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              password_hash: '', // Se establecerá en el trigger de auth
              name: user.user_metadata?.name || '',
              budget_start_day: 1,
            })
            .select()
            .single()
          if (insertError) throw insertError
          setProfile(newProfile)
          return
        }
        throw error
      }
      setProfile(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      return data
    } catch (err: any) {
      throw err
    }
  }

  // Función para calcular el rango del ciclo de presupuesto actual
  const getCurrentBudgetCycle = () => {
    const budgetStartDay = profile?.budget_start_day || 1
    const now = new Date()
    const currentDay = now.getDate()
    
    // Si estamos en o después del día de inicio, el ciclo empezó este mes
    // Si estamos antes del día de inicio, el ciclo empezó el mes anterior
    let startMonth: Date
    let endMonth: Date
    
    if (currentDay >= budgetStartDay) {
      // Ciclo actual: budgetStartDay de este mes a (budgetStartDay - 1) del siguiente mes
      startMonth = new Date(now.getFullYear(), now.getMonth(), budgetStartDay)
      endMonth = new Date(now.getFullYear(), now.getMonth() + 1, budgetStartDay - 1)
    } else {
      // Ciclo actual: budgetStartDay del mes anterior a (budgetStartDay - 1) de este mes
      startMonth = new Date(now.getFullYear(), now.getMonth() - 1, budgetStartDay)
      endMonth = new Date(now.getFullYear(), now.getMonth(), budgetStartDay - 1)
    }
    
    return { start: startMonth, end: endMonth }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
    getCurrentBudgetCycle,
  }
}
