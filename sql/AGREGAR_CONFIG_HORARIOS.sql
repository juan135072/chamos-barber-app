-- =====================================================
-- AGREGAR CONFIGURACIÓN DE HORARIOS
-- =====================================================
-- Ejecuta este script DESPUÉS de SETUP_COMPLETO_GPS.sql
-- para agregar la funcionalidad de horarios configurables
-- =====================================================

-- Tabla para almacenar configuración de horarios
CREATE TABLE IF NOT EXISTS configuracion_horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  hora_entrada_puntual TIME NOT NULL DEFAULT '09:30:00',
  hora_salida_minima TIME,
  activa BOOLEAN DEFAULT true,
  ubicacion_barberia_id UUID REFERENCES ubicaciones_barberia(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_config_horarios_activa ON configuracion_horarios(activa);
CREATE INDEX IF NOT EXISTS idx_config_horarios_ubicacion ON configuracion_horarios(ubicacion_barberia_id);

-- Agregar columnas para salida en asistencias
ALTER TABLE asistencias 
  ADD COLUMN IF NOT EXISTS hora_salida TIME,
  ADD COLUMN IF NOT EXISTS salida_registrada BOOLEAN DEFAULT false;

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

-- =====================================================
-- ✅ ¡Listo! Configuración de horarios agregada
-- =====================================================
-- El admin ahora puede configurar horarios desde:
-- Panel Admin → Asistencia → Configuración de Horarios
-- =====================================================
