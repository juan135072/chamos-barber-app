-- =====================================================
-- INVENTARIO MODULE - Database Tables (Multi-tenant)
-- =====================================================
-- Run this SQL in the Supabase SQL Editor
-- =====================================================

-- 1. Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_venta NUMERIC(10,2) NOT NULL DEFAULT 0,
    precio_costo NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 5,
    categoria TEXT NOT NULL DEFAULT 'General',
    imagen_url TEXT,
    codigo_barras TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    comercio_id UUID NOT NULL REFERENCES comercios(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Movimientos de Inventario
CREATE TABLE IF NOT EXISTS inventario_movimientos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL DEFAULT 0,
    stock_nuevo INTEGER NOT NULL DEFAULT 0,
    motivo TEXT,
    referencia_id TEXT,
    created_by UUID,
    comercio_id UUID NOT NULL REFERENCES comercios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_productos_comercio ON productos(comercio_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_comercio_activo ON productos(comercio_id, activo);
CREATE INDEX IF NOT EXISTS idx_inventario_mov_producto ON inventario_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_mov_comercio ON inventario_movimientos(comercio_id);
CREATE INDEX IF NOT EXISTS idx_inventario_mov_tipo ON inventario_movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_inventario_mov_created ON inventario_movimientos(created_at DESC);

-- 4. Función helper: obtener comercio_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_comercio_id()
RETURNS UUID AS $$
  SELECT comercio_id FROM admin_users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. RLS Policies (aislamiento por comercio_id)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;

-- Productos: solo ver/modificar los de tu comercio
CREATE POLICY "productos_select" ON productos
    FOR SELECT TO authenticated
    USING (comercio_id = get_user_comercio_id());

CREATE POLICY "productos_insert" ON productos
    FOR INSERT TO authenticated
    WITH CHECK (comercio_id = get_user_comercio_id());

CREATE POLICY "productos_update" ON productos
    FOR UPDATE TO authenticated
    USING (comercio_id = get_user_comercio_id());

CREATE POLICY "productos_delete" ON productos
    FOR DELETE TO authenticated
    USING (comercio_id = get_user_comercio_id());

-- Movimientos: solo ver/crear los de tu comercio
CREATE POLICY "inv_mov_select" ON inventario_movimientos
    FOR SELECT TO authenticated
    USING (comercio_id = get_user_comercio_id());

CREATE POLICY "inv_mov_insert" ON inventario_movimientos
    FOR INSERT TO authenticated
    WITH CHECK (comercio_id = get_user_comercio_id());

-- 6. Trigger para updated_at en productos
CREATE OR REPLACE FUNCTION update_productos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_productos_updated_at();
