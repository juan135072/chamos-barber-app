-- =====================================================
-- SCRIPT COMPLETO Y CONSOLIDADO
-- Sistema de Asistencia con Geolocalización GPS
-- =====================================================
-- ⚠️ COPIA TODO ESTE ARCHIVO Y PÉGALO EN SUPABASE SQL EDITOR
-- Luego click en "Run" ▶️
-- =====================================================

-- =====================================================
-- PARTE 1: TABLAS BASE DE ASISTENCIA
-- =====================================================

-- Tabla: claves_diarias
CREATE TABLE IF NOT EXISTS claves_diarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(20) NOT NULL,
  fecha DATE NOT NULL,
  activa BOOLEAN DEFAULT true,
  creada_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fecha)
);

CREATE INDEX IF NOT EXISTS idx_claves_fecha ON claves_diarias(fecha);

-- Tabla: asistencias (sin GPS todavía)
CREATE TABLE IF NOT EXISTS asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbero_id UUID NOT NULL REFERENCES barberos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  clave_usada VARCHAR(20) NOT NULL,
  estado VARCHAR(20) DEFAULT 'normal',
  dispositivo TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbero_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_barbero ON asistencias(barbero_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_barbero_fecha ON asistencias(barbero_id, fecha);

-- =====================================================
-- PARTE 2: CONFIGURACIÓN DE GEOLOCALIZACIÓN
-- =====================================================

-- Extensiones para cálculos GPS
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Tabla: ubicaciones_barberia
CREATE TABLE IF NOT EXISTS ubicaciones_barberia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  radio_permitido INTEGER DEFAULT 100,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_nombre ON ubicaciones_barberia(nombre);

-- Agregar columnas GPS a asistencias
ALTER TABLE asistencias 
  ADD COLUMN IF NOT EXISTS latitud_registrada DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitud_registrada DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS distancia_metros INTEGER,
  ADD COLUMN IF NOT EXISTS ubicacion_barberia_id UUID REFERENCES ubicaciones_barberia(id);

-- =====================================================
-- PARTE 3: FUNCIONES SQL
-- =====================================================

-- Función: Calcular distancia GPS (Haversine)
CREATE OR REPLACE FUNCTION calcular_distancia_metros(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS INTEGER AS $$
DECLARE
  distancia_km DECIMAL;
BEGIN
  distancia_km := (
    6371 * acos(
      cos(radians(lat1)) * 
      cos(radians(lat2)) * 
      cos(radians(lon2) - radians(lon1)) + 
      sin(radians(lat1)) * 
      sin(radians(lat2))
    )
  );
  RETURN ROUND(distancia_km * 1000)::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función: Validar si barbero está en la barbería
CREATE OR REPLACE FUNCTION ubicacion_es_valida(
  p_latitud DECIMAL,
  p_longitud DECIMAL,
  p_ubicacion_id UUID
)
RETURNS TABLE (
  es_valida BOOLEAN,
  distancia INTEGER,
  radio_permitido INTEGER
) AS $$
DECLARE
  v_lat_barberia DECIMAL;
  v_lon_barberia DECIMAL;
  v_radio INTEGER;
  v_distancia INTEGER;
BEGIN
  SELECT latitud, longitud, ubicaciones_barberia.radio_permitido
  INTO v_lat_barberia, v_lon_barberia, v_radio
  FROM ubicaciones_barberia
  WHERE id = p_ubicacion_id AND activa = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  v_distancia := calcular_distancia_metros(
    p_latitud, 
    p_longitud, 
    v_lat_barberia, 
    v_lon_barberia
  );

  RETURN QUERY SELECT 
    (v_distancia <= v_radio)::BOOLEAN as es_valida,
    v_distancia as distancia,
    v_radio as radio_permitido;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 4: ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE claves_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubicaciones_barberia ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: claves_diarias
DROP POLICY IF EXISTS "Admin gestiona claves" ON claves_diarias;
CREATE POLICY "Admin gestiona claves"
ON claves_diarias
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- POLÍTICAS: asistencias
DROP POLICY IF EXISTS "Barbero ve sus asistencias" ON asistencias;
CREATE POLICY "Barbero ve sus asistencias"
ON asistencias
FOR SELECT
TO authenticated
USING (
  barbero_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

DROP POLICY IF EXISTS "Barbero registra su asistencia" ON asistencias;
CREATE POLICY "Barbero registra su asistencia"
ON asistencias
FOR INSERT
TO authenticated
WITH CHECK (
  barbero_id = auth.uid()
);

-- POLÍTICAS: ubicaciones_barberia
DROP POLICY IF EXISTS "Usuarios ven ubicaciones activas" ON ubicaciones_barberia;
CREATE POLICY "Usuarios ven ubicaciones activas"
ON ubicaciones_barberia
FOR SELECT
TO authenticated
USING (activa = true);

DROP POLICY IF EXISTS "Admin gestiona ubicaciones" ON ubicaciones_barberia;
CREATE POLICY "Admin gestiona ubicaciones"
ON ubicaciones_barberia
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- =====================================================
-- PARTE 5: UBICACIÓN DE PRUEBA
-- =====================================================

INSERT INTO ubicaciones_barberia (
    id,
    nombre,
    latitud,
    longitud,
    radio_permitido,
    activa
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Chamos Barber - Principal',
    -33.437916,
    -70.650410,
    100,
    true
)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    latitud = EXCLUDED.latitud,
    longitud = EXCLUDED.longitud,
    radio_permitido = EXCLUDED.radio_permitido,
    activa = EXCLUDED.activa,
    updated_at = NOW();

-- =====================================================
-- ✅ ¡LISTO! Sistema configurado correctamente
-- =====================================================
-- Próximos pasos:
-- 1. Ve al Panel Admin → "Ubicaciones GPS"
-- 2. Captura la ubicación REAL estando en la barbería
-- 3. Empieza a usar el sistema de asistencia
-- =====================================================
