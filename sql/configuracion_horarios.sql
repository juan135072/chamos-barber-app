-- =====================================================
-- CONFIGURACIÓN DE HORARIOS DE ASISTENCIA
-- =====================================================
-- Permite al admin configurar horarios personalizados

-- Tabla para almacenar configuración de horarios
CREATE TABLE IF NOT EXISTS configuracion_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  hora_entrada_puntual TIME NOT NULL DEFAULT '09:30:00', -- Límite para llegar puntual
  hora_salida_minima TIME, -- Hora mínima de salida (opcional)
  activa BOOLEAN DEFAULT true,
  ubicacion_barberia_id UUID REFERENCES ubicaciones_barberia(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_horarios_activa ON configuracion_horarios(activa);
CREATE INDEX IF NOT EXISTS idx_config_horarios_ubicacion ON configuracion_horarios(ubicacion_barberia_id);

COMMENT ON TABLE configuracion_horarios IS 'Configuración de horarios de entrada/salida';
COMMENT ON COLUMN configuracion_horarios.hora_entrada_puntual IS 'Hora límite para marcar entrada puntual (después = tarde)';
COMMENT ON COLUMN configuracion_horarios.hora_salida_minima IS 'Hora mínima permitida para marcar salida';

-- Insertar configuración por defecto
INSERT INTO configuracion_horarios (
    nombre,
    hora_entrada_puntual,
    hora_salida_minima,
    activa
) VALUES (
    'Horario General',
    '09:30:00',
    '18:00:00',
    true
)
ON CONFLICT (nombre) DO NOTHING;

-- Agregar columna para marcar salida en asistencias
ALTER TABLE asistencias 
  ADD COLUMN IF NOT EXISTS hora_salida TIME,
  ADD COLUMN IF NOT EXISTS salida_registrada BOOLEAN DEFAULT false;

COMMENT ON COLUMN asistencias.hora_salida IS 'Hora en que marcó salida (opcional)';
COMMENT ON COLUMN asistencias.salida_registrada IS 'Si ya marcó salida del día';

-- RLS para configuración de horarios
ALTER TABLE configuracion_horarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos ven configuración activa" ON configuracion_horarios;
CREATE POLICY "Todos ven configuración activa"
ON configuracion_horarios
FOR SELECT
TO authenticated
USING (activa = true);

DROP POLICY IF EXISTS "Admin gestiona configuración" ON configuracion_horarios;
CREATE POLICY "Admin gestiona configuración"
ON configuracion_horarios
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND rol = 'admin'
  )
);
