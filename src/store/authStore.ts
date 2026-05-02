import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../api/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  initialize: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: false,
      error: null,

      signIn: async (email: string, password: string) => {
        set({ loading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) throw error
          set({ user: data.user, session: data.session, loading: false })
        } catch (error: any) {
          set({ error: error.message, loading: false })
          throw error
        }
      },

      signUp: async (email: string, password: string, name: string) => {
        set({ loading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
            },
          })
          if (error) throw error
          set({ user: data.user, session: data.session, loading: false })
        } catch (error: any) {
          set({ error: error.message, loading: false })
          throw error
        }
      },

      signOut: async () => {
        set({ loading: true, error: null })
        try {
          const { error } = await supabase.auth.signOut()
          if (error) throw error
          set({ user: null, session: null, loading: false })
        } catch (error: any) {
          set({ error: error.message, loading: false })
          throw error
        }
      },

      updatePassword: async (newPassword: string) => {
        set({ loading: true, error: null })
        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          })
          if (error) throw error
          set({ loading: false })
        } catch (error: any) {
          set({ error: error.message, loading: false })
          throw error
        }
      },

      initialize: async () => {
        set({ loading: true })
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            set({ user: session.user, session })
          }
          
          supabase.auth.onAuthStateChange((_event, session) => {
            set({ user: session?.user ?? null, session: session ?? null })
          })
        } catch (error: any) {
          set({ error: error.message })
        } finally {
          set({ loading: false })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'app-gastos-auth',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
)