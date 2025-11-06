-- ================================================
-- TABLA: notas_clientes
-- Descripción: Almacena notas que los barberos guardan sobre sus clientes
-- ================================================

-- Crear tabla notas_clientes
CREATE TABLE IF NOT EXISTS public.notas_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE CASCADE,
  cliente_email VARCHAR(255) NOT NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_telefono VARCHAR(50),
  notas TEXT NOT NULL,
  cita_id UUID REFERENCES public.citas(id) ON DELETE SET NULL,
  tags TEXT[], -- Array de etiquetas como ['corte_especial', 'alergia', 'preferencias']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notas_clientes_barbero_id ON public.notas_clientes(barbero_id);
CREATE INDEX IF NOT EXISTS idx_notas_clientes_cliente_email ON public.notas_clientes(cliente_email);
CREATE INDEX IF NOT EXISTS idx_notas_clientes_cita_id ON public.notas_clientes(cita_id);
CREATE INDEX IF NOT EXISTS idx_notas_clientes_created_at ON public.notas_clientes(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notas_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notas_clientes_updated_at
  BEFORE UPDATE ON public.notas_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_notas_clientes_updated_at();

-- ================================================
-- RLS POLICIES
-- ================================================

-- Habilitar RLS en la tabla
ALTER TABLE public.notas_clientes ENABLE ROW LEVEL SECURITY;

-- Política: Los barberos pueden ver todas sus propias notas
CREATE POLICY "barberos_can_view_own_notas"
  ON public.notas_clientes
  FOR SELECT
  TO authenticated
  USING (
    barbero_id IN (
      SELECT id FROM public.barberos 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los barberos pueden crear notas
CREATE POLICY "barberos_can_create_notas"
  ON public.notas_clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    barbero_id IN (
      SELECT id FROM public.barberos 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los barberos pueden actualizar sus propias notas
CREATE POLICY "barberos_can_update_own_notas"
  ON public.notas_clientes
  FOR UPDATE
  TO authenticated
  USING (
    barbero_id IN (
      SELECT id FROM public.barberos 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    barbero_id IN (
      SELECT id FROM public.barberos 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los barberos pueden eliminar sus propias notas
CREATE POLICY "barberos_can_delete_own_notas"
  ON public.notas_clientes
  FOR DELETE
  TO authenticated
  USING (
    barbero_id IN (
      SELECT id FROM public.barberos 
      WHERE user_id = auth.uid()
    )
  );

-- Política: Los administradores pueden ver todas las notas
CREATE POLICY "admin_can_view_all_notas"
  ON public.notas_clientes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Los administradores pueden modificar todas las notas
CREATE POLICY "admin_can_modify_all_notas"
  ON public.notas_clientes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ================================================
-- COMENTARIOS
-- ================================================

COMMENT ON TABLE public.notas_clientes IS 'Notas que los barberos guardan sobre sus clientes para recordar preferencias, alergias, estilos anteriores, etc.';
COMMENT ON COLUMN public.notas_clientes.barbero_id IS 'ID del barbero que creó la nota';
COMMENT ON COLUMN public.notas_clientes.cliente_email IS 'Email del cliente (para vinculación con citas)';
COMMENT ON COLUMN public.notas_clientes.cliente_nombre IS 'Nombre del cliente';
COMMENT ON COLUMN public.notas_clientes.notas IS 'Contenido de la nota';
COMMENT ON COLUMN public.notas_clientes.cita_id IS 'ID de la cita relacionada (opcional)';
COMMENT ON COLUMN public.notas_clientes.tags IS 'Etiquetas para categorizar notas';
