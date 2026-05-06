-- Migration: Create templates table for quick transaction templates
-- Description: Allows users to create reusable transaction templates with pre-filled values.

CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'payment', 'withdrawal')),
  description text NOT NULL DEFAULT '',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  source_card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  is_fixed boolean NOT NULL DEFAULT true,
  icon text NOT NULL DEFAULT 'FileText',
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON public.templates(type);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own templates
CREATE POLICY "Users can view own templates"
  ON public.templates FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can insert their own templates
CREATE POLICY "Users can insert own templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.templates FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.templates FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_templates_updated_at ON public.templates;
CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();
