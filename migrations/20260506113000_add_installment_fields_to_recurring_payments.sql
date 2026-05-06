-- Migration: Add installment support fields to recurring_payments
-- Description: Enables tracking finite credit-card installment plans inside recurring_payments.

ALTER TABLE public.recurring_payments
  ADD COLUMN IF NOT EXISTS is_installment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_cycles integer,
  ADD COLUMN IF NOT EXISTS remaining_cycles integer,
  ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.cards(id);

CREATE INDEX IF NOT EXISTS idx_recurring_payments_card_id
  ON public.recurring_payments(card_id);

CREATE INDEX IF NOT EXISTS idx_recurring_payments_is_installment
  ON public.recurring_payments(is_installment);
