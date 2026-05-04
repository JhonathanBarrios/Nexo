-- Migration: Replace prepaid type with cash for cash management
-- Description: Updates card type from 'prepaid' to 'cash' to represent physical cash holdings

-- 1. Update the CHECK constraint on cards table to allow 'cash' instead of 'prepaid'
ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_type_check;
ALTER TABLE public.cards ADD CONSTRAINT cards_type_check CHECK (type IN ('credit', 'debit', 'cash'));

-- 2. Update trigger functions to use 'cash' instead of 'prepaid'
CREATE OR REPLACE FUNCTION update_card_balance() RETURNS TRIGGER AS $$
DECLARE
  card_record RECORD;
  source_card_record RECORD;
BEGIN
  SELECT * INTO card_record FROM public.cards WHERE id = NEW.card_id;
  
  IF NEW.type = 'expense' THEN
    IF card_record.type = 'credit' THEN
      UPDATE public.cards SET current_debt = current_debt + NEW.amount WHERE id = NEW.card_id;
    ELSIF card_record.type IN ('debit', 'cash') THEN
      UPDATE public.cards SET current_balance = current_balance - NEW.amount WHERE id = NEW.card_id;
    END IF;
  ELSIF NEW.type = 'income' THEN
    IF card_record.type IN ('debit', 'cash') THEN
      UPDATE public.cards SET current_balance = current_balance + NEW.amount WHERE id = NEW.card_id;
    END IF;
  ELSIF NEW.type = 'payment' THEN
    IF card_record.type = 'credit' THEN
      UPDATE public.cards SET current_debt = current_debt - NEW.amount WHERE id = NEW.card_id;
    END IF;
  ELSIF NEW.type = 'withdrawal' THEN
    SELECT * INTO source_card_record FROM public.cards WHERE id = NEW.source_card_id;
    IF source_card_record.type = 'credit' THEN
      UPDATE public.cards SET current_debt = current_debt + NEW.amount WHERE id = NEW.source_card_id;
    ELSIF source_card_record.type IN ('debit', 'cash') THEN
      UPDATE public.cards SET current_balance = current_balance - NEW.amount WHERE id = NEW.source_card_id;
    END IF;
    IF card_record.type = 'cash' THEN
      UPDATE public.cards SET current_balance = current_balance + NEW.amount WHERE id = NEW.card_id;
    END IF;
  ELSIF NEW.type = 'savings' THEN
    SELECT * INTO source_card_record FROM public.cards WHERE id = NEW.source_card_id;
    IF source_card_record.type = 'credit' THEN
      UPDATE public.cards SET current_debt = current_debt + NEW.amount WHERE id = NEW.source_card_id;
    ELSIF source_card_record.type IN ('debit', 'cash') THEN
      UPDATE public.cards SET current_balance = current_balance - NEW.amount WHERE id = NEW.source_card_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reverse_card_balance() RETURNS TRIGGER AS $$
DECLARE
  card_record RECORD;
  source_card_record RECORD;
BEGIN
  SELECT * INTO card_record FROM public.cards WHERE id = OLD.card_id;
  
  IF OLD.type = 'expense' THEN
    IF card_record.type = 'credit' THEN
      UPDATE public.cards SET current_debt = current_debt - OLD.amount WHERE id = OLD.card_id;
    ELSIF card_record.type IN ('debit', 'cash') THEN
      UPDATE public.cards SET current_balance = current_balance + OLD.amount WHERE id = OLD.card_id;
    END IF;
  ELSIF OLD.type = 'income' THEN
    IF card_record.type IN ('debit', 'cash') THEN
      UPDATE public.cards SET current_balance = current_balance - OLD.amount WHERE id = OLD.card_id;
    END IF;
  ELSIF OLD.type = 'payment' THEN
    IF card_record.type = 'credit' THEN
      UPDATE public.cards SET current_debt = current_debt + OLD.amount WHERE id = OLD.card_id;
    END IF;
  ELSIF OLD.type = 'withdrawal' THEN
    SELECT * INTO source_card_record FROM public.cards WHERE id = OLD.source_card_id;
    IF source_card_record.type = 'credit' THEN
      UPDATE public.cards SET current_debt = current_debt - OLD.amount WHERE id = OLD.source_card_id;
    ELSIF source_card_record.type IN ('debit', 'cash') THEN
      UPDATE public.cards SET current_balance = current_balance + OLD.amount WHERE id = OLD.source_card_id;
    END IF;
    IF card_record.type = 'cash' THEN
      UPDATE public.cards SET current_balance = current_balance - OLD.amount WHERE id = OLD.card_id;
    END IF;
  ELSIF OLD.type = 'savings' THEN
    SELECT * INTO source_card_record FROM public.cards WHERE id = OLD.source_card_id;
    IF source_card_record.type = 'credit' THEN
      UPDATE public.cards SET current_debt = current_debt - OLD.amount WHERE id = OLD.source_card_id;
    ELSIF source_card_record.type IN ('debit', 'cash') THEN
      UPDATE public.cards SET current_balance = current_balance + OLD.amount WHERE id = OLD.source_card_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate triggers to use the updated functions
DROP TRIGGER IF EXISTS trigger_update_card_balance_insert ON public.transactions;
DROP TRIGGER IF EXISTS trigger_update_card_balance_update ON public.transactions;
DROP TRIGGER IF EXISTS trigger_update_card_balance_delete ON public.transactions;

CREATE TRIGGER trigger_update_card_balance_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_card_balance();

CREATE TRIGGER trigger_update_card_balance_update
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_card_balance();

CREATE TRIGGER trigger_update_card_balance_delete
  AFTER DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION reverse_card_balance();