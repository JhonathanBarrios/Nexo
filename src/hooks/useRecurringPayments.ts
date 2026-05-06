import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

export interface RecurringPayment {
  id: string
  user_id: string
  category_id: string | null
  description: string
  amount: number | null
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'
  next_due_date: string
  custom_days: number | null
  is_active: boolean
  is_variable: boolean
  pending_cycles: number
  total_pending_amount: number
  is_installment?: boolean
  total_cycles?: number | null
  remaining_cycles?: number | null
  card_id?: string | null
  created_at: string
  updated_at: string
}

export interface ServiceUsageTracking {
  id: string
  recurring_payment_id: string
  date: string
  amount: number
  notes: string | null
  created_at: string
  updated_at: string
  user_id: string
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
      case 'biweekly':
        date.setDate(date.getDate() + 15)
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

  const fetchServiceUsageTracking = async (paymentId: string, startDate?: string, endDate?: string) => {
    try {
      let query = supabase
        .from('service_usage_tracking')
        .select('*')
        .eq('recurring_payment_id', paymentId)
        .order('date', { ascending: true });

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      throw err
    }
  }

  const upsertServiceUsageTracking = async (
    paymentId: string,
    date: string,
    amount: number,
    userId: string,
    notes?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('service_usage_tracking')
        .upsert({
          recurring_payment_id: paymentId,
          date,
          amount,
          notes: notes || null,
          user_id: userId,
        })
        .select()
        .single()

      if (error) throw error

      // Actualizar el total del pago recurrente
      await updatePaymentTotalFromTracking(paymentId);

      return data
    } catch (err: any) {
      throw err
    }
  }

  const deleteServiceUsageTracking = async (id: string, paymentId?: string) => {
    try {
      const { error } = await supabase
        .from('service_usage_tracking')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Actualizar el total del pago recurrente si se proporcionó paymentId
      if (paymentId) {
        await updatePaymentTotalFromTracking(paymentId);
      }
    } catch (err: any) {
      throw err
    }
  }

  const calculateUsageTotal = async (paymentId: string, startDate: string, endDate: string): Promise<number> => {
    try {
      const trackingData = await fetchServiceUsageTracking(paymentId, startDate, endDate);
      return trackingData.reduce((sum, item) => sum + item.amount, 0);
    } catch (err) {
      return 0;
    }
  }

  const updatePaymentTotalFromTracking = async (paymentId: string) => {
    try {
      // Obtener todo el tracking del pago (sin límite de fecha)
      const { data: trackingData, error: trackingError } = await supabase
        .from('service_usage_tracking')
        .select('amount')
        .eq('recurring_payment_id', paymentId);

      if (trackingError) throw trackingError;

      // Calcular el total de todo el tracking
      const total = trackingData?.reduce((sum, item) => sum + item.amount, 0) || 0;

      // Actualizar el total_pending_amount en el pago recurrente
      const { error: updateError } = await supabase
        .from('recurring_payments')
        .update({ total_pending_amount: total })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      // Actualizar el estado local
      setPayments(payments.map(p => p.id === paymentId ? { ...p, total_pending_amount: total } : p));

      return total;
    } catch (err: any) {
      throw err;
    }
  }

  const markAsPaid = async (
    paymentId: string,
    amount: number,
    userId: string,
    _payAllPending: boolean = true,
    installmentsToPay: number = 1
  ) => {
    try {
      const payment = payments.find(p => p.id === paymentId)
      if (!payment) throw new Error('Payment not found')

      const today = new Date().toISOString().split('T')[0]

      if (payment.is_installment) {
        const totalCycles = payment.total_cycles || 0
        const remainingCycles = payment.remaining_cycles ?? totalCycles
        const installments = Math.max(1, Math.floor(installmentsToPay || 1))

        if (!payment.card_id) {
          throw new Error('Este pago a cuotas no tiene tarjeta asociada')
        }

        if (installments > remainingCycles) {
          throw new Error(`No puedes pagar ${installments} cuotas. Solo quedan ${remainingCycles}.`)
        }

        const amountPerInstallment = Number(payment.amount || 0)
        const paidInstallments = Math.max(totalCycles - remainingCycles, 0)

        const installmentTransactions = Array.from({ length: installments }, (_, index) => ({
          user_id: userId,
          category_id: payment.category_id,
          card_id: payment.card_id,
          source_card_id: null,
          description: totalCycles > 0
            ? `${payment.description} - Cuota ${paidInstallments + index + 1}/${totalCycles}`
            : payment.description,
          amount: amountPerInstallment,
          type: 'payment',
          date: today,
          notes: null,
        }))

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert(installmentTransactions)

        if (transactionError) throw transactionError

        const newRemainingCycles = remainingCycles - installments
        const nextDueDate = newRemainingCycles > 0
          ? getNextDueDate('monthly', payment.next_due_date)
          : payment.next_due_date

        const { error: updateError } = await supabase
          .from('recurring_payments')
          .update({
            next_due_date: nextDueDate,
            remaining_cycles: newRemainingCycles,
            is_active: newRemainingCycles > 0,
            pending_cycles: 0,
            total_pending_amount: 0,
          })
          .eq('id', paymentId)

        if (updateError) throw updateError
      } else {
        // Create transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            category_id: payment.category_id,
            description: payment.description,
            amount: amount,
            type: 'expense',
            date: today,
          })

        if (transactionError) throw transactionError

        // Update payment with new due date and reset pending cycles
        const newDueDate = getNextDueDate(payment.frequency, payment.next_due_date, payment.custom_days || undefined)
        const { error: updateError } = await supabase
          .from('recurring_payments')
          .update({
            next_due_date: newDueDate,
            pending_cycles: 0,
            total_pending_amount: 0,
          })
          .eq('id', paymentId)

        if (updateError) throw updateError
      }

      // Refresh payments
      await fetchPayments()
      return true
    } catch (err: any) {
      throw err
    }
  }

  const calculatePendingCycles = (payment: RecurringPayment): number => {
    const today = new Date()
    const dueDate = new Date(payment.next_due_date)
    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return 0

    switch (payment.frequency) {
      case 'daily':
        return Math.floor(daysDiff / 1)
      case 'weekly':
        return Math.floor(daysDiff / 7)
      case 'biweekly':
        return Math.floor(daysDiff / 15)
      case 'monthly':
        return Math.floor(daysDiff / 30)
      case 'yearly':
        return Math.floor(daysDiff / 365)
      case 'custom':
        return payment.custom_days ? Math.floor(daysDiff / payment.custom_days) : 0
      default:
        return 0
    }
  }

  const getVariableExpensesForCycle = async (paymentId: string, startDate: string, endDate: string): Promise<number> => {
    try {
      const trackingData = await fetchServiceUsageTracking(paymentId, startDate, endDate);
      return trackingData.reduce((sum, item) => sum + item.amount, 0);
    } catch (err) {
      return 0;
    }
  }

  const getAllVariableExpensesForCycle = async (startDate: string, endDate: string): Promise<Record<string, number>> => {
    const variableExpenses: Record<string, number> = {};
    
    const variablePayments = payments.filter(p => p.is_variable && p.is_active && p.category_id);
    
    for (const payment of variablePayments) {
      if (!payment.category_id) continue;
      const expense = await getVariableExpensesForCycle(payment.id, startDate, endDate);
      variableExpenses[payment.category_id] = (variableExpenses[payment.category_id] || 0) + expense;
    }
    
    return variableExpenses;
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
    fetchServiceUsageTracking,
    upsertServiceUsageTracking,
    deleteServiceUsageTracking,
    calculateUsageTotal,
    updatePaymentTotalFromTracking,
    markAsPaid,
    calculatePendingCycles,
    getVariableExpensesForCycle,
    getAllVariableExpensesForCycle,
  }
}