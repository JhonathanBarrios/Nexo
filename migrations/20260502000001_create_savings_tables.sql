-- ============================================
-- MIGRACIÓN: Sistema de Ahorro (Savings)
-- ============================================

-- 1. Tabla de cuentas de ahorro (bolsillos)
CREATE TABLE IF NOT EXISTS savings_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal_amount DECIMAL(10, 2) NOT NULL CHECK (goal_amount > 0),
    goal_duration_months INTEGER NOT NULL CHECK (goal_duration_months > 0 AND goal_duration_months <= 24),
    current_balance DECIMAL(10, 2) DEFAULT 0,
    color VARCHAR(7) DEFAULT '#10b981',
    icon VARCHAR(50) DEFAULT 'piggy-bank',
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    deposit_day INTEGER NOT NULL CHECK (deposit_day >= 1 AND deposit_day <= 31),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de depósitos de ahorro
CREATE TABLE IF NOT EXISTS savings_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    savings_account_id UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    deposit_date DATE NOT NULL,
    period_number INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_savings_accounts_user_id ON savings_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_is_active ON savings_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_savings_deposits_user_id ON savings_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_deposits_account_id ON savings_deposits(savings_account_id);
CREATE INDEX IF NOT EXISTS idx_savings_deposits_date ON savings_deposits(deposit_date);

-- 4. Trigger para updated_at en savings_accounts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_savings_accounts_updated_at ON savings_accounts;
CREATE TRIGGER update_savings_accounts_updated_at
    BEFORE UPDATE ON savings_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_savings_deposits_updated_at ON savings_deposits;
CREATE TRIGGER update_savings_deposits_updated_at
    BEFORE UPDATE ON savings_deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Habilitar RLS
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_deposits ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para savings_accounts
DROP POLICY IF EXISTS "Users can view their own savings accounts" ON savings_accounts;
CREATE POLICY "Users can view their own savings accounts"
    ON savings_accounts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own savings accounts" ON savings_accounts;
CREATE POLICY "Users can insert their own savings accounts"
    ON savings_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own savings accounts" ON savings_accounts;
CREATE POLICY "Users can update their own savings accounts"
    ON savings_accounts FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own savings accounts" ON savings_accounts;
CREATE POLICY "Users can delete their own savings accounts"
    ON savings_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Políticas RLS para savings_deposits
DROP POLICY IF EXISTS "Users can view their own savings deposits" ON savings_deposits;
CREATE POLICY "Users can view their own savings deposits"
    ON savings_deposits FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own savings deposits" ON savings_deposits;
CREATE POLICY "Users can insert their own savings deposits"
    ON savings_deposits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own savings deposits" ON savings_deposits;
CREATE POLICY "Users can update their own savings deposits"
    ON savings_deposits FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own savings deposits" ON savings_deposits;
CREATE POLICY "Users can delete their own savings deposits"
    ON savings_deposits FOR DELETE
    USING (auth.uid() = user_id);

-- 8. Agregar 'savings' como tipo válido en transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_type;
ALTER TABLE transactions ADD CONSTRAINT check_transaction_type 
    CHECK (type IN ('income', 'expense', 'savings'));

-- 9. Agregar campos de alertas de ahorro en user_notifications
ALTER TABLE user_notifications 
ADD COLUMN IF NOT EXISTS savings_alerts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS savings_reminder_days_before INTEGER DEFAULT 1;
