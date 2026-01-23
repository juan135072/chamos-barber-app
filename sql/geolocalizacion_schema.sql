-- =====================================================
-- GEOLOCALIZACIÓN PARA ASISTENCIA
-- =====================================================
-- Extensión para cálculos de distancia
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Tabla: ubicaciones_barberia
-- Almacena las coordenadas GPS de cada barbería
CREATE TABLE IF NOT EXISTS ubicaciones_barberia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  radio_permitido INTEGER DEFAULT 100, -- metros
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_ubicaciones_nombre ON ubicaciones_barberia(nombre);

COMMENT ON TABLE ubicaciones_barberia IS 'Coordenadas GPS de cada ubicación de barbería';
COMMENT ON COLUMN ubicaciones_barberia.latitud IS 'Latitud en formato decimal (-90 a 90)';
COMMENT ON COLUMN ubicaciones_barberia.longitud IS 'Longitud en formato decimal (-180 a 180)';
COMMENT ON COLUMN ubicaciones_barberia.radio_permitido IS 'Radio de tolerancia en metros';

-- Insertar ubicación de ejemplo (Santiago, Chile - Centro)
-- REEMPLAZAR CON LAS COORDENADAS REALES DE TU BARBERÍA
INSERT INTO ubicaciones_barberia (nombre, latitud, longitud, radio_permitido)
VALUES ('Barbería Principal', -33.4489, -70.6693, 100)
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- Modificar tabla asistencias para incluir geolocalización
-- =====================================================

-- Agregar columnas de ubicación a asistencias
ALTER TABLE asistencias 
  ADD COLUMN IF NOT EXISTS latitud_registrada DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitud_registrada DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS distancia_metros INTEGER,
  ADD COLUMN IF NOT EXISTS ubicacion_barberia_id UUID REFERENCES ubicaciones_barberia(id);

COMMENT ON COLUMN asistencias.latitud_registrada IS 'Latitud donde el barbero marcó asistencia';
COMMENT ON COLUMN asistencias.longitud_registrada IS 'Longitud donde el barbero marcó asistencia';
COMMENT ON COLUMN asistencias.distancia_metros IS 'Distancia en metros de la ubicación registrada a la barbería';
COMMENT ON COLUMN asistencias.ubicacion_barberia_id IS 'Barbería desde donde marcó';

-- =====================================================
-- FUNCIÓN: Calcular distancia entre dos puntos GPS
-- =====================================================

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
  -- Fórmula de Haversine para calcular distancia entre coordenadas
  distancia_km := (
    6371 * acos(
      cos(radians(lat1)) * 
      cos(radians(lat2)) * 
      cos(radians(lon2) - radians(lon1)) + 
      sin(radians(lat1)) * 
      sin(radians(lat2))
    )
  );
  
  -- Convertir a metros
  RETURN ROUND(distancia_km * 1000)::INTEGER;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCIÓN: Validar si una ubicación está dentro del rango
-- =====================================================

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
  -- Obtener coordenadas de la barbería
  SELECT latitud, longitud, radio_permitido
  INTO v_lat_barberia, v_lon_barberia, v_radio
  FROM ubicaciones_barberia
  WHERE id = p_ubicacion_id AND activa = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  -- Calcular distancia
  v_distancia := calcular_distancia_metros(
    p_latitud, 
    p_longitud, 
    v_lat_barberia, 
    v_lon_barberia
  );

  -- Validar si está dentro del rango
  RETURN QUERY SELECT 
    (v_distancia <= v_radio)::BOOLEAN as es_valida,
    v_distancia as distancia,
    v_radio as radio_permitido;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS para ubicaciones_barberia
-- =====================================================

ALTER TABLE ubicaciones_barberia ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver ubicaciones activas
CREATE POLICY "Usuarios ven ubicaciones activas"
ON ubicaciones_barberia
FOR SELECT
TO authenticated
USING (activa = true);

-- Solo admin puede modificar
CREATE POLICY "Admin gestiona ubicaciones"
ON ubicaciones_barberia
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid() AND rol = 'administrador'
  )
);
