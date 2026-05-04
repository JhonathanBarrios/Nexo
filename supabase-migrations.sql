-- ============================================
-- MIGRACIÓN: Pagos Recurrentes Mejorados y Pagos a Tarjetas
-- ============================================

-- 0. Agregar tipo 'payment' a la tabla transactions
-- Primero, eliminar los constraints CHECK existentes
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_type;

-- Luego, agregar el nuevo constraint con el valor 'payment'
ALTER TABLE transactions
ADD CONSTRAINT check_transaction_type
CHECK (type IN ('income', 'expense', 'savings', 'payment'));

-- 0.5. Agregar campos de saldo a la tabla cards
ALTER TABLE cards
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_debt DECIMAL(10, 2) DEFAULT 0;

-- 0.6. Agregar campo source_card_id para pagos a tarjetas
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS source_card_id UUID REFERENCES cards(id) ON DELETE SET NULL;

-- 0.7. Agregar campo budget_start_day a users para personalizar día de reinicio de presupuesto
ALTER TABLE users
ADD COLUMN IF NOT EXISTS budget_start_day INTEGER DEFAULT 1;

-- 1. Agregar campos a la tabla recurring_payments
ALTER TABLE recurring_payments
ADD COLUMN IF NOT EXISTS is_variable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pending_cycles INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pending_amount DECIMAL(10, 2) DEFAULT 0;

-- Permitir NULL en amount para pagos variables
ALTER TABLE recurring_payments ALTER COLUMN amount DROP NOT NULL;

-- Eliminar columnas obsoletas
ALTER TABLE recurring_payments DROP COLUMN IF EXISTS cost_per_unit;
ALTER TABLE recurring_payments DROP COLUMN IF EXISTS unit_label;

-- 2. Si la tabla service_usage_tracking ya existe, migrar de count a amount
-- Primero, agregar la columna amount como nullable
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_usage_tracking' AND column_name = 'count') THEN
        -- La columna count existe, necesitamos migrar a amount
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_usage_tracking' AND column_name = 'amount') THEN
            ALTER TABLE service_usage_tracking ADD COLUMN amount DECIMAL(10, 2);
        END IF;
        
        -- Copiar valores de count a amount
        UPDATE service_usage_tracking SET amount = count WHERE amount IS NULL AND count IS NOT NULL;
        
        -- Eliminar columna count
        ALTER TABLE service_usage_tracking DROP COLUMN IF EXISTS count;
        
        -- Ahora hacer amount NOT NULL (después de copiar los datos)
        ALTER TABLE service_usage_tracking ALTER COLUMN amount SET NOT NULL;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_usage_tracking') THEN
        -- La tabla no existe, crearla con amount desde el inicio
        CREATE TABLE service_usage_tracking (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            recurring_payment_id UUID NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            UNIQUE(recurring_payment_id, date)
        );
    END IF;
END $$;

-- 3. Crear índices para service_usage_tracking
CREATE INDEX IF NOT EXISTS idx_service_usage_tracking_payment_id ON service_usage_tracking(recurring_payment_id);
CREATE INDEX IF NOT EXISTS idx_service_usage_tracking_date ON service_usage_tracking(date);
CREATE INDEX IF NOT EXISTS idx_service_usage_tracking_user_id ON service_usage_tracking(user_id);

-- 4. Habilitar RLS para service_usage_tracking
ALTER TABLE service_usage_tracking ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS para service_usage_tracking
DROP POLICY IF EXISTS "Users can view their own service usage tracking" ON service_usage_tracking;
CREATE POLICY "Users can view their own service usage tracking"
    ON service_usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own service usage tracking" ON service_usage_tracking;
CREATE POLICY "Users can insert their own service usage tracking"
    ON service_usage_tracking FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own service usage tracking" ON service_usage_tracking;
CREATE POLICY "Users can update their own service usage tracking"
    ON service_usage_tracking FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own service usage tracking" ON service_usage_tracking;
CREATE POLICY "Users can delete their own service usage tracking"
    ON service_usage_tracking FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_service_usage_tracking_updated_at ON service_usage_tracking;
CREATE TRIGGER update_service_usage_tracking_updated_at
    BEFORE UPDATE ON service_usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Triggers para actualizar saldos de tarjetas automáticamente
-- Función para actualizar el saldo de una tarjeta cuando se crea/actualiza/elimina una transacción
CREATE OR REPLACE FUNCTION update_card_balance()
RETURNS TRIGGER AS $$
DECLARE
  card_record RECORD;
  source_card_record RECORD;
BEGIN
  -- Manejar pagos a tarjetas (tipo payment)
  IF NEW.type = 'payment' THEN
    -- Actualizar tarjeta destino (card_id) - disminuir deuda
    IF NEW.card_id IS NOT NULL THEN
      SELECT * FROM cards WHERE id = NEW.card_id INTO card_record;
      IF card_record IS NOT NULL AND card_record.type = 'credit' THEN
        IF TG_OP = 'INSERT' THEN
          UPDATE cards SET current_debt = GREATEST(current_debt - NEW.amount, 0) WHERE id = NEW.card_id;
        ELSIF TG_OP = 'UPDATE' THEN
          UPDATE cards SET current_debt = (
            SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN amount WHEN type = 'payment' THEN -amount ELSE 0 END), 0)
            FROM transactions
            WHERE card_id = NEW.card_id
          ) WHERE id = NEW.card_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE cards SET current_debt = (
            SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN amount WHEN type = 'payment' THEN -amount ELSE 0 END), 0)
            FROM transactions
            WHERE card_id = OLD.card_id
          ) WHERE id = OLD.card_id;
        END IF;
      END IF;
    END IF;
    
    -- Actualizar tarjeta origen (source_card_id) - disminuir saldo
    IF NEW.source_card_id IS NOT NULL THEN
      SELECT * FROM cards WHERE id = NEW.source_card_id INTO source_card_record;
      IF source_card_record IS NOT NULL AND (source_card_record.type = 'debit' OR source_card_record.type = 'prepaid') THEN
        IF TG_OP = 'INSERT' THEN
          UPDATE cards SET current_balance = current_balance - NEW.amount WHERE id = NEW.source_card_id;
        ELSIF TG_OP = 'UPDATE' THEN
          UPDATE cards SET current_balance = (
            SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END), 0)
            FROM transactions
            WHERE source_card_id = NEW.source_card_id
          ) WHERE id = NEW.source_card_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE cards SET current_balance = (
            SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END), 0)
            FROM transactions
            WHERE source_card_id = OLD.source_card_id
          ) WHERE id = OLD.source_card_id;
        END IF;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Obtener la tarjeta asociada a la transacción (para tipos no payment)
  SELECT * FROM cards WHERE id = NEW.card_id INTO card_record;
  
  -- Si no hay tarjeta asociada, retornar
  IF card_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Lógica según tipo de tarjeta y tipo de transacción (para tipos income/expense)
  IF card_record.type = 'debit' OR card_record.type = 'prepaid' THEN
    -- Tarjeta débito/prepaid: actualizar current_balance
    IF TG_OP = 'INSERT' THEN
      IF NEW.type = 'income' THEN
        UPDATE cards SET current_balance = current_balance + NEW.amount WHERE id = NEW.card_id;
      ELSIF NEW.type = 'expense' THEN
        UPDATE cards SET current_balance = current_balance - NEW.amount WHERE id = NEW.card_id;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Recalcular el saldo desde cero
      UPDATE cards SET current_balance = (
        SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END), 0)
        FROM transactions
        WHERE card_id = NEW.card_id
      ) WHERE id = NEW.card_id;
    ELSIF TG_OP = 'DELETE' THEN
      -- Recalcular el saldo desde cero
      UPDATE cards SET current_balance = (
        SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -amount ELSE 0 END), 0)
        FROM transactions
        WHERE card_id = OLD.card_id
      ) WHERE id = OLD.card_id;
    END IF;
  ELSIF card_record.type = 'credit' THEN
    -- Tarjeta crédito: actualizar current_debt
    IF TG_OP = 'INSERT' THEN
      IF NEW.type = 'expense' THEN
        UPDATE cards SET current_debt = current_debt + NEW.amount WHERE id = NEW.card_id;
      ELSIF NEW.type = 'payment' THEN
        UPDATE cards SET current_debt = GREATEST(current_debt - NEW.amount, 0) WHERE id = NEW.card_id;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Recalcular la deuda desde cero
      UPDATE cards SET current_debt = (
        SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN amount WHEN type = 'payment' THEN -amount ELSE 0 END), 0)
        FROM transactions
        WHERE card_id = NEW.card_id
      ) WHERE id = NEW.card_id;
    ELSIF TG_OP = 'DELETE' THEN
      -- Recalcular la deuda desde cero
      UPDATE cards SET current_debt = (
        SELECT COALESCE(SUM(CASE WHEN type = 'expense' THEN amount WHEN type = 'payment' THEN -amount ELSE 0 END), 0)
        FROM transactions
        WHERE card_id = OLD.card_id
      ) WHERE id = OLD.card_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger AFTER INSERT en transactions
DROP TRIGGER IF EXISTS trigger_update_card_balance_insert ON transactions;
CREATE TRIGGER trigger_update_card_balance_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_balance();

-- Trigger AFTER UPDATE en transactions
DROP TRIGGER IF EXISTS trigger_update_card_balance_update ON transactions;
CREATE TRIGGER trigger_update_card_balance_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_balance();

-- Trigger AFTER DELETE en transactions
DROP TRIGGER IF EXISTS trigger_update_card_balance_delete ON transactions;
CREATE TRIGGER trigger_update_card_balance_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_balance();

-- ============================================
-- MIGRACIÓN: Presupuesto por Período en Categorías
-- ============================================

-- 8. Agregar columnas para presupuesto por período a categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS budget_period VARCHAR(20) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS budget_amount DECIMAL(15,2) DEFAULT 0;

-- 9. Migrar datos existentes de budget_monthly a budget_amount (solo si la columna existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'budget_monthly') THEN
        UPDATE categories
        SET budget_amount = budget_monthly,
            budget_period = 'monthly'
        WHERE budget_monthly IS NOT NULL;
    END IF;
END $$;

-- 10. Opcional: Eliminar budget_monthly después de migración (descomentar después de verificar)
-- ALTER TABLE categories DROP COLUMN IF EXISTS budget_monthly;

-- 11. Actualizar registros existentes que tengan períodos no válidos
UPDATE categories
SET budget_period = 'monthly'
WHERE budget_period IS NULL OR budget_period NOT IN ('biweekly', 'monthly');

-- 12. Agregar restricción CHECK a categories.budget_period
ALTER TABLE categories
ADD CONSTRAINT IF NOT EXISTS check_budget_period_categories 
CHECK (budget_period IN ('biweekly', 'monthly'));

-- ============================================
-- MIGRACIÓN: Tabla category_budgets para historial de presupuestos
-- ============================================

CREATE TABLE IF NOT EXISTS category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  budget_amount DECIMAL(15,2) NOT NULL,
  budget_period VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_category_budgets_category_id ON category_budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_category_budgets_date_range ON category_budgets(start_date, end_date);

-- Actualizar registros existentes que tengan períodos no válidos
UPDATE category_budgets
SET budget_period = 'monthly'
WHERE budget_period IS NULL OR budget_period NOT IN ('biweekly', 'monthly');

-- Agregar restricción CHECK a category_budgets.budget_period
ALTER TABLE category_budgets
ADD CONSTRAINT IF NOT EXISTS check_budget_period_category_budgets 
CHECK (budget_period IN ('biweekly', 'monthly'));

-- Políticas RLS
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propios presupuestos
CREATE POLICY "Users can view own category budgets"
  ON category_budgets FOR SELECT
  USING (
    category_id IN (
      SELECT id FROM categories WHERE user_id = auth.uid()
    )
  );

-- Usuarios pueden insertar sus propios presupuestos
CREATE POLICY "Users can insert own category budgets"
  ON category_budgets FOR INSERT
  WITH CHECK (
    category_id IN (
      SELECT id FROM categories WHERE user_id = auth.uid()
    )
  );

-- Usuarios pueden actualizar sus propios presupuestos
CREATE POLICY "Users can update own category budgets"
  ON category_budgets FOR UPDATE
  USING (
    category_id IN (
      SELECT id FROM categories WHERE user_id = auth.uid()
    )
  );

-- Usuarios pueden eliminar sus propios presupuestos
CREATE POLICY "Users can delete own category budgets"
  ON category_budgets FOR DELETE
  USING (
    category_id IN (
      SELECT id FROM categories WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_category_budgets_updated_at
  BEFORE UPDATE ON category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRACIÓN: Recrear foreign keys de user_settings y user_notifications
-- ============================================

-- Eliminar foreign keys existentes (si apuntan a auth.users, eliminarlos)
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_user_id_fkey;

-- Recrear foreign key de user_settings apuntando a users.id
ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recrear foreign key de user_notifications apuntando a users.id
ALTER TABLE user_notifications 
ADD CONSTRAINT user_notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- MIGRACIÓN: Política INSERT para tabla users
-- ============================================

-- Agregar política INSERT para que usuarios autenticados puedan crear su perfil
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- MIGRACIÓN: Triggers para inicializar configuraciones de usuario
-- (En tabla users pública, no en auth.users)
-- ============================================

-- Función para crear user_settings al registrar usuario
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_settings (user_id, currency, date_format, first_day_of_week, savings_goal)
  VALUES (
    NEW.id,
    'COP',
    'DD/MM/YYYY',
    'Monday',
    0
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Función para crear user_notifications al registrar usuario
CREATE OR REPLACE FUNCTION create_user_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_notifications (
    user_id,
    budget_alerts_enabled,
    alert_at_50,
    alert_at_80,
    alert_at_100,
    payment_reminders_enabled,
    reminder_days_before,
    savings_alerts_enabled,
    savings_reminder_days_before
  )
  VALUES (
    NEW.id,
    true,
    true,
    true,
    true,
    true,
    3,
    false,
    1
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- NO modificar el trigger existente on_user_created (ya inserta categorías)
-- Solo agregar triggers adicionales para settings y notifications
DROP TRIGGER IF EXISTS on_user_created_settings ON users;
CREATE TRIGGER on_user_created_settings
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings();

DROP TRIGGER IF EXISTS on_user_created_notifications ON users;
CREATE TRIGGER on_user_created_notifications
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_notifications();

