-- ========================================
-- Tabla: solicitudes_barberos
-- Descripción: Almacena solicitudes de registro de nuevos barberos
-- ========================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS public.solicitudes_barberos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  email text NOT NULL UNIQUE,
  telefono text NOT NULL,
  especialidad text NOT NULL,
  descripcion text,
  experiencia_anos integer NOT NULL DEFAULT 0,
  imagen_url text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  barbero_id uuid REFERENCES public.barberos(id) ON DELETE SET NULL,
  revisada_por uuid REFERENCES public.admin_users(id),
  fecha_solicitud timestamptz NOT NULL DEFAULT now(),
  fecha_revision timestamptz,
  notas_revision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_barberos_estado ON public.solicitudes_barberos(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_barberos_email ON public.solicitudes_barberos(email);
CREATE INDEX IF NOT EXISTS idx_solicitudes_barberos_fecha ON public.solicitudes_barberos(fecha_solicitud DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_solicitudes_barberos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solicitudes_barberos_updated_at
  BEFORE UPDATE ON public.solicitudes_barberos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_solicitudes_barberos_updated_at();

-- Políticas RLS
ALTER TABLE public.solicitudes_barberos ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede insertar una solicitud (registro público)
CREATE POLICY "Permitir inserción pública de solicitudes"
  ON public.solicitudes_barberos
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Política: Solo admins pueden ver todas las solicitudes
CREATE POLICY "Admins pueden ver todas las solicitudes"
  ON public.solicitudes_barberos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.rol = 'admin'
      AND admin_users.activo = true
    )
  );

-- Política: Solo admins pueden actualizar solicitudes
CREATE POLICY "Admins pueden actualizar solicitudes"
  ON public.solicitudes_barberos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.rol = 'admin'
      AND admin_users.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.rol = 'admin'
      AND admin_users.activo = true
    )
  );

-- Comentarios
COMMENT ON TABLE public.solicitudes_barberos IS 'Almacena solicitudes de registro de nuevos barberos';
COMMENT ON COLUMN public.solicitudes_barberos.estado IS 'Estado de la solicitud: pendiente, aprobada, rechazada';
COMMENT ON COLUMN public.solicitudes_barberos.barbero_id IS 'ID del barbero creado si fue aprobado';

-- Tests de verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla solicitudes_barberos creada exitosamente';
  RAISE NOTICE '✅ Políticas RLS configuradas';
  RAISE NOTICE '✅ Índices creados para optimización';
  RAISE NOTICE '✅ Trigger de updated_at configurado';
END $$;
