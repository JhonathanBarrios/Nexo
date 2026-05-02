-- ============================================
-- MIGRACIÓN: Pagos Recurrentes Mejorados
-- ============================================

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
