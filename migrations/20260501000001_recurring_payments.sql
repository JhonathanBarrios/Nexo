-- Tabla de pagos recurrentes
CREATE TABLE IF NOT EXISTS recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
  next_due_date DATE NOT NULL,
  custom_days INTEGER CHECK (custom_days > 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recurring_payments_updated_at
  BEFORE UPDATE ON recurring_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Solo el usuario puede ver sus pagos recurrentes
CREATE POLICY "Users can view their own recurring payments"
  ON recurring_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Solo el usuario puede crear sus pagos recurrentes
CREATE POLICY "Users can create their own recurring payments"
  ON recurring_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Solo el usuario puede actualizar sus pagos recurrentes
CREATE POLICY "Users can update their own recurring payments"
  ON recurring_payments FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Solo el usuario puede eliminar sus pagos recurrentes
CREATE POLICY "Users can delete their own recurring payments"
  ON recurring_payments FOR DELETE
  USING (auth.uid() = user_id);

-- Índices para optimización
CREATE INDEX idx_recurring_payments_user_id ON recurring_payments(user_id);
CREATE INDEX idx_recurring_payments_next_due_date ON recurring_payments(next_due_date);
CREATE INDEX idx_recurring_payments_is_active ON recurring_payments(is_active);