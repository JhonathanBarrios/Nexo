import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

export interface RecurringPayment {
  id: string
  user_id: string
  category_id: string | null
  description: string
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  next_due_date: string
  custom_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaymentAlert {
  id: string
  payment: RecurringPayment
  daysUntilDue: number
  status: 'upcoming' | 'overdue'
}

export function useRecurringPayments() {
  const [payments, setPayments] = useState<RecurringPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('recurring_payments')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            color
          )
        `)
        .order('next_due_date', { ascending: true })

      if (error) throw error
      setPayments(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createPayment = async (payment: Omit<RecurringPayment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_payments')
        .insert(payment)
        .select()
        .single()

      if (error) throw error
      setPayments([...payments, data])
      return data
    } catch (err: any) {
      throw err
    }
  }

  const updatePayment = async (id: string, updates: Partial<RecurringPayment>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setPayments(payments.map(p => p.id === id ? data : p))
      return data
    } catch (err: any) {
      throw err
    }
  }

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_payments')
        .delete()
        .eq('id', id)

      if (error) throw error
      setPayments(payments.filter(p => p.id !== id))
    } catch (err: any) {
      throw err
    }
  }

  const getPaymentAlerts = (): PaymentAlert[] => {
    const today = new Date()
    const alerts: PaymentAlert[] = []

    payments.forEach(payment => {
      if (!payment.is_active) return

      const dueDate = new Date(payment.next_due_date)
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilDue <= 7 && daysUntilDue >= 0) {
        alerts.push({
          id: payment.id,
          payment,
          daysUntilDue,
          status: 'upcoming'
        })
      } else if (daysUntilDue < 0) {
        alerts.push({
          id: payment.id,
          payment,
          daysUntilDue,
          status: 'overdue'
        })
      }
    })

    return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue)
  }

  const getNextDueDate = (frequency: string, currentDate: string, customDays?: number): string => {
    const date = new Date(currentDate)
    
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1)
        break
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1)
        break
      case 'custom':
        if (customDays) {
          date.setDate(date.getDate() + customDays)
        }
        break
    }
    
    return date.toISOString().split('T')[0]
  }

  return {
    payments,
    loading,
    error,
    refetch: fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    getPaymentAlerts,
    getNextDueDate,
  }
}