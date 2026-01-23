-- =====================================================
-- SISTEMA DE ASISTENCIA DIARIA
-- =====================================================
-- Tablas para registrar asistencia de barberos con claves diarias

-- Tabla: claves_diarias
-- Almacena las claves generadas para cada día
CREATE TABLE IF NOT EXISTS claves_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(20) NOT NULL,
  fecha DATE NOT NULL,
  activa BOOLEAN DEFAULT true,
  creada_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Una clave por día
  UNIQUE(fecha)
);

-- Índice para consultas rápidas por fecha
CREATE INDEX IF NOT EXISTS idx_claves_fecha ON claves_diarias(fecha);

-- Comentarios para documentación
COMMENT ON TABLE claves_diarias IS 'Claves diarias generadas por recepción para marcar asistencia';
COMMENT ON COLUMN claves_diarias.clave IS 'Clave alfanumérica del día (ej: B4R-2201)';
COMMENT ON COLUMN claves_diarias.fecha IS 'Fecha para la cual es válida la clave';
COMMENT ON COLUMN claves_diarias.activa IS 'Si la clave está activa o ha sido deshabilitada';

-- =====================================================

-- Tabla: asistencias
-- Registra la asistencia diaria de cada barbero
CREATE TABLE IF NOT EXISTS asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  clave_usada VARCHAR(20) NOT NULL,
  estado VARCHAR(20) DEFAULT 'normal', -- normal, tarde, ausente
  dispositivo TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Una asistencia por día por barbero (regla de negocio clave)
  UNIQUE(barbero_id, fecha)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_asistencias_barbero ON asistencias(barbero_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_barbero_fecha ON asistencias(barbero_id, fecha);

-- Comentarios para documentación
COMMENT ON TABLE asistencias IS 'Registro de asistencia diaria de barberos';
COMMENT ON COLUMN asistencias.barbero_id IS 'ID del barbero que marcó asistencia';
COMMENT ON COLUMN asistencias.fecha IS 'Fecha de la asistencia';
COMMENT ON COLUMN asistencias.hora IS 'Hora exacta en que marcó';
COMMENT ON COLUMN asistencias.estado IS 'Estado: normal (puntual), tarde, ausente';
COMMENT ON COLUMN asistencias.dispositivo IS 'Información del dispositivo (user agent)';
COMMENT ON COLUMN asistencias.ip_address IS 'IP desde donde marcó (auditoría)';

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en ambas tablas
ALTER TABLE claves_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: claves_diarias
-- =====================================================

-- Admin puede gestionar todas las claves
CREATE POLICY "Admin gestiona claves"
ON claves_diarias
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- =====================================================
-- POLICIES: asistencias
-- =====================================================

-- Barbero puede ver solo sus propias asistencias
CREATE POLICY "Barbero ve sus asistencias"
ON asistencias
FOR SELECT
TO authenticated
USING (
  barbero_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- Barbero puede insertar su propia asistencia
CREATE POLICY "Barbero registra su asistencia"
ON asistencias
FOR INSERT
TO authenticated
WITH CHECK (
  barbero_id = auth.uid()
);

-- Admin puede ver todas las asistencias
CREATE POLICY "Admin ve todas las asistencias"
ON asistencias
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);

-- =====================================================
-- FUNCIONES HELPER (OPCIONAL)
-- =====================================================

-- Función para obtener clave activa del día
CREATE OR REPLACE FUNCTION obtener_clave_del_dia()
RETURNS TABLE (
  clave VARCHAR,
  fecha DATE,
  existe BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.clave,
    c.fecha,
    true as existe
  FROM claves_diarias c
  WHERE c.fecha = CURRENT_DATE
    AND c.activa = true
  LIMIT 1;
  
  -- Si no hay resultados, retornar NULL
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::VARCHAR as clave,
      CURRENT_DATE as fecha,
      false as existe;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un barbero ya marcó hoy
CREATE OR REPLACE FUNCTION barbero_marco_hoy(p_barbero_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM asistencias
    WHERE barbero_id = p_barbero_id
      AND fecha = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DATOS DE EJEMPLO (DESARROLLO)
-- =====================================================

-- Insertar clave de prueba para desarrollo
-- COMENTAR O ELIMINAR EN PRODUCCIÓN
INSERT INTO claves_diarias (clave, fecha, activa, created_at)
VALUES ('DEV-2201', CURRENT_DATE, true, NOW())
ON CONFLICT (fecha) DO NOTHING;
