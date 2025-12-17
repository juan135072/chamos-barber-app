/**
 * =====================================================
 * 🚶 TABLA WALK-IN CLIENTS
 * =====================================================
 * Tabla para almacenar clientes que llegan sin reserva
 * Permite capturar datos de contacto para futuras comunicaciones
 */

-- Crear tabla walk_in_clients
CREATE TABLE IF NOT EXISTS public.walk_in_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL UNIQUE,
  email TEXT,
  notas TEXT,
  origen TEXT DEFAULT 'sin_reserva' CHECK (origen IN ('sin_reserva', 'referido', 'otro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios de documentación
COMMENT ON TABLE public.walk_in_clients IS 'Clientes que llegan sin reserva (walk-in)';
COMMENT ON COLUMN public.walk_in_clients.id IS 'ID único del cliente walk-in';
COMMENT ON COLUMN public.walk_in_clients.nombre IS 'Nombre completo del cliente';
COMMENT ON COLUMN public.walk_in_clients.telefono IS 'Teléfono del cliente (único)';
COMMENT ON COLUMN public.walk_in_clients.email IS 'Email del cliente (opcional)';
COMMENT ON COLUMN public.walk_in_clients.notas IS 'Notas adicionales sobre el cliente';
COMMENT ON COLUMN public.walk_in_clients.origen IS 'Origen del cliente (sin_reserva, referido, otro)';
COMMENT ON COLUMN public.walk_in_clients.created_at IS 'Fecha de registro';
COMMENT ON COLUMN public.walk_in_clients.updated_at IS 'Fecha de última actualización';

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_walk_in_clients_telefono ON public.walk_in_clients(telefono);
CREATE INDEX IF NOT EXISTS idx_walk_in_clients_created_at ON public.walk_in_clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_walk_in_clients_origen ON public.walk_in_clients(origen);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_walk_in_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_walk_in_clients_updated_at
  BEFORE UPDATE ON public.walk_in_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_walk_in_clients_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.walk_in_clients ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver walk-in clients
CREATE POLICY "Admins pueden ver walk-in clients"
  ON public.walk_in_clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'admin'
      AND activo = true
    )
  );

-- Política: Solo admins pueden insertar walk-in clients
CREATE POLICY "Admins pueden crear walk-in clients"
  ON public.walk_in_clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'admin'
      AND activo = true
    )
  );

-- Política: Solo admins pueden actualizar walk-in clients
CREATE POLICY "Admins pueden actualizar walk-in clients"
  ON public.walk_in_clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'admin'
      AND activo = true
    )
  );

-- Política: Solo admins pueden eliminar walk-in clients
CREATE POLICY "Admins pueden eliminar walk-in clients"
  ON public.walk_in_clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'admin'
      AND activo = true
    )
  );

-- =====================================================
-- DATOS DE PRUEBA (OPCIONAL)
-- =====================================================

-- Descomentar para agregar datos de prueba
/*
INSERT INTO public.walk_in_clients (nombre, telefono, email, notas, origen)
VALUES
  ('Juan Pérez', '+56912345678', 'juan@ejemplo.com', 'Cliente nuevo, prefiere corte fade', 'sin_reserva'),
  ('María González', '+56987654321', 'maria@ejemplo.com', 'Primera visita, llegó sin cita', 'sin_reserva'),
  ('Pedro Rodríguez', '+56923456789', NULL, 'Referido por Juan Pérez', 'referido');
*/

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que la tabla se creó correctamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'walk_in_clients'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'walk_in_clients';
