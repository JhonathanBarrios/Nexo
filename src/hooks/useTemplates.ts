import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

export interface Template {
  id: string
  user_id: string
  name: string
  type: 'income' | 'expense' | 'payment' | 'withdrawal'
  description: string
  amount: number
  category_id: string | null
  card_id: string | null
  source_card_id: string | null
  is_fixed: boolean
  icon: string
  color: string
  created_at: string
  updated_at: string
}

interface CreateTemplateInput {
  user_id: string
  name: string
  type: 'income' | 'expense' | 'payment' | 'withdrawal'
  description: string
  amount: number
  category_id: string | null
  card_id: string | null
  source_card_id: string | null
  is_fixed: boolean
  icon: string
  color: string
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (err: any) {
      console.error('Error fetching templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async (template: CreateTemplateInput) => {
    const { data, error } = await supabase
      .from('templates')
      .insert(template)
      .select()
      .single()

    if (error) throw error
    setTemplates([data, ...templates])
    return data
  }

  const updateTemplate = async (id: string, updates: Partial<CreateTemplateInput>) => {
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setTemplates(templates.map(t => t.id === id ? data : t))
    return data
  }

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)

    if (error) throw error
    setTemplates(templates.filter(t => t.id !== id))
  }

  return {
    templates,
    loading,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
