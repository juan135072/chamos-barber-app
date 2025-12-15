-- ================================================================
-- 📱 CHAMOS BARBER APP - CONFIGURACIÓN DE BASE DE DATOS
-- ================================================================
-- 
-- INSTRUCCIONES:
-- 1. Abre Supabase SQL Editor
-- 2. Copia y ejecuta este script
-- 3. Verifica que no haya errores
--
-- ================================================================

-- ================================================================
-- PARTE 1: AGREGAR CAMPOS NUEVOS A TABLA BARBEROS
-- ================================================================

-- Agregar campo de disponibilidad (para el toggle Disponible/Ocupado)
ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS disponibilidad BOOLEAN DEFAULT true;

-- Agregar campo de última conexión (para tracking)
ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS ultima_conexion TIMESTAMP WITH TIME ZONE;

-- Agregar comentarios descriptivos
COMMENT ON COLUMN public.barberos.disponibilidad IS 'Estado de disponibilidad del barbero: true = Disponible, false = Ocupado/Descanso';
COMMENT ON COLUMN public.barberos.ultima_conexion IS 'Última vez que el barbero se conectó a la app';

-- ================================================================
-- PARTE 2: CREAR ÍNDICES PARA OPTIMIZAR QUERIES EN TIEMPO REAL
-- ================================================================

-- Índice para búsquedas rápidas de citas por barbero y fecha
CREATE INDEX IF NOT EXISTS idx_citas_barbero_fecha 
ON public.citas(barbero_id, fecha_hora DESC);

-- Índice para citas de hoy por estado
CREATE INDEX IF NOT EXISTS idx_citas_estado_fecha 
ON public.citas(estado, fecha_hora);

-- Índice para barberos activos y disponibles
CREATE INDEX IF NOT EXISTS idx_barberos_activo_disponibilidad 
ON public.barberos(activo, disponibilidad) 
WHERE activo = true;

-- ================================================================
-- PARTE 3: FUNCIÓN PARA ACTUALIZAR ÚLTIMA CONEXIÓN
-- ================================================================

CREATE OR REPLACE FUNCTION public.actualizar_ultima_conexion(barbero_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.barberos
  SET ultima_conexion = NOW()
  WHERE id = barbero_uuid;
END;
$$;

-- Agregar comentario a la función
COMMENT ON FUNCTION public.actualizar_ultima_conexion IS 'Actualiza el timestamp de última conexión del barbero';

-- ================================================================
-- PARTE 4: FUNCIÓN PARA TOGGLE DE DISPONIBILIDAD
-- ================================================================

CREATE OR REPLACE FUNCTION public.toggle_disponibilidad_barbero(
  barbero_uuid UUID,
  nueva_disponibilidad BOOLEAN
)
RETURNS TABLE(
  id UUID,
  nombre VARCHAR,
  disponibilidad BOOLEAN,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.barberos
  SET 
    disponibilidad = nueva_disponibilidad,
    updated_at = NOW(),
    ultima_conexion = NOW()
  WHERE barberos.id = barbero_uuid
  RETURNING barberos.id, barberos.nombre, barberos.disponibilidad, barberos.updated_at;
END;
$$;

-- Agregar comentario
COMMENT ON FUNCTION public.toggle_disponibilidad_barbero IS 'Cambia el estado de disponibilidad del barbero y actualiza timestamps';

-- ================================================================
-- PARTE 5: FUNCIÓN PARA OBTENER CITAS DE HOY DEL BARBERO
-- ================================================================

CREATE OR REPLACE FUNCTION public.obtener_citas_hoy_barbero(barbero_uuid UUID)
RETURNS TABLE(
  id UUID,
  barbero_id UUID,
  servicio_id UUID,
  cliente_nombre VARCHAR,
  cliente_email VARCHAR,
  cliente_telefono VARCHAR,
  fecha_hora TIMESTAMP WITH TIME ZONE,
  duracion INTEGER,
  estado VARCHAR,
  notas TEXT,
  servicio_nombre VARCHAR,
  servicio_precio DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.barbero_id,
    c.servicio_id,
    c.cliente_nombre,
    c.cliente_email,
    c.cliente_telefono,
    c.fecha_hora,
    c.duracion,
    c.estado,
    c.notas,
    s.nombre as servicio_nombre,
    s.precio as servicio_precio,
    c.created_at
  FROM public.citas c
  LEFT JOIN public.servicios s ON c.servicio_id = s.id
  WHERE c.barbero_id = barbero_uuid
    AND DATE(c.fecha_hora AT TIME ZONE 'America/Santiago') = CURRENT_DATE
  ORDER BY c.fecha_hora ASC;
END;
$$;

-- Agregar comentario
COMMENT ON FUNCTION public.obtener_citas_hoy_barbero IS 'Obtiene todas las citas de hoy para un barbero específico con información del servicio';

-- ================================================================
-- PARTE 6: FUNCIÓN PARA MÉTRICAS DIARIAS DEL BARBERO
-- ================================================================

CREATE OR REPLACE FUNCTION public.obtener_metricas_diarias_barbero(barbero_uuid UUID)
RETURNS TABLE(
  total_citas INTEGER,
  citas_completadas INTEGER,
  citas_pendientes INTEGER,
  ganancia_total DECIMAL,
  promedio_por_cita DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_citas,
    COUNT(*) FILTER (WHERE c.estado = 'completada')::INTEGER as citas_completadas,
    COUNT(*) FILTER (WHERE c.estado IN ('pendiente', 'confirmada'))::INTEGER as citas_pendientes,
    COALESCE(SUM(s.precio) FILTER (WHERE c.estado = 'completada'), 0) as ganancia_total,
    COALESCE(AVG(s.precio) FILTER (WHERE c.estado = 'completada'), 0) as promedio_por_cita
  FROM public.citas c
  LEFT JOIN public.servicios s ON c.servicio_id = s.id
  WHERE c.barbero_id = barbero_uuid
    AND DATE(c.fecha_hora AT TIME ZONE 'America/Santiago') = CURRENT_DATE;
END;
$$;

-- Agregar comentario
COMMENT ON FUNCTION public.obtener_metricas_diarias_barbero IS 'Calcula métricas del día actual para un barbero: total de citas, completadas, pendientes y ganancias';

-- ================================================================
-- PARTE 7: FUNCIÓN PARA CAMBIAR ESTADO DE CITA (Check-in, Completar)
-- ================================================================

CREATE OR REPLACE FUNCTION public.cambiar_estado_cita(
  cita_uuid UUID,
  nuevo_estado VARCHAR,
  barbero_uuid UUID
)
RETURNS TABLE(
  id UUID,
  estado VARCHAR,
  updated_at TIMESTAMP WITH TIME ZONE,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cita_encontrada public.citas%ROWTYPE;
BEGIN
  -- Verificar que la cita existe y pertenece al barbero
  SELECT * INTO cita_encontrada
  FROM public.citas
  WHERE citas.id = cita_uuid AND citas.barbero_id = barbero_uuid;

  IF cita_encontrada IS NULL THEN
    RETURN QUERY
    SELECT 
      NULL::UUID,
      NULL::VARCHAR,
      NULL::TIMESTAMP WITH TIME ZONE,
      false as success,
      'Cita no encontrada o no pertenece a este barbero'::TEXT as message;
    RETURN;
  END IF;

  -- Actualizar el estado
  RETURN QUERY
  UPDATE public.citas
  SET 
    estado = nuevo_estado,
    updated_at = NOW()
  WHERE citas.id = cita_uuid
  RETURNING 
    citas.id, 
    citas.estado, 
    citas.updated_at,
    true as success,
    'Estado actualizado correctamente'::TEXT as message;
END;
$$;

-- Agregar comentario
COMMENT ON FUNCTION public.cambiar_estado_cita IS 'Cambia el estado de una cita verificando que pertenezca al barbero especificado';

-- ================================================================
-- PARTE 8: HABILITAR ROW LEVEL SECURITY (RLS) PARA BARBER APP
-- ================================================================

-- Habilitar RLS si no está habilitado
ALTER TABLE public.barberos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- Política para que los barberos solo vean sus propias citas
CREATE POLICY IF NOT EXISTS "barberos_ven_sus_citas" 
ON public.citas
FOR SELECT
TO authenticated
USING (
  barbero_id IN (
    SELECT barbero_id 
    FROM public.admin_users 
    WHERE id = auth.uid() AND rol = 'barbero'
  )
);

-- Política para que los barberos puedan actualizar sus citas
CREATE POLICY IF NOT EXISTS "barberos_actualizan_sus_citas" 
ON public.citas
FOR UPDATE
TO authenticated
USING (
  barbero_id IN (
    SELECT barbero_id 
    FROM public.admin_users 
    WHERE id = auth.uid() AND rol = 'barbero'
  )
)
WITH CHECK (
  barbero_id IN (
    SELECT barbero_id 
    FROM public.admin_users 
    WHERE id = auth.uid() AND rol = 'barbero'
  )
);

-- Política para que los barberos vean su propio perfil
CREATE POLICY IF NOT EXISTS "barberos_ven_su_perfil" 
ON public.barberos
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT barbero_id 
    FROM public.admin_users 
    WHERE admin_users.id = auth.uid() AND rol = 'barbero'
  )
);

-- Política para que los barberos actualicen su disponibilidad
CREATE POLICY IF NOT EXISTS "barberos_actualizan_disponibilidad" 
ON public.barberos
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT barbero_id 
    FROM public.admin_users 
    WHERE admin_users.id = auth.uid() AND rol = 'barbero'
  )
)
WITH CHECK (
  id IN (
    SELECT barbero_id 
    FROM public.admin_users 
    WHERE admin_users.id = auth.uid() AND rol = 'barbero'
  )
);

-- ================================================================
-- PARTE 9: HABILITAR REALTIME PARA TABLA CITAS
-- ================================================================

-- Habilitar publicación de cambios en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.citas;

-- ================================================================
-- VERIFICACIÓN FINAL
-- ================================================================

-- Verificar que los campos se agregaron correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'barberos' 
      AND column_name IN ('disponibilidad', 'ultima_conexion')
  ) THEN
    RAISE NOTICE '✅ Campos agregados correctamente a tabla barberos';
  ELSE
    RAISE EXCEPTION '❌ Error: No se agregaron los campos a la tabla barberos';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname IN ('idx_citas_barbero_fecha', 'idx_citas_estado_fecha', 'idx_barberos_activo_disponibilidad')
  ) THEN
    RAISE NOTICE '✅ Índices creados correctamente';
  ELSE
    RAISE NOTICE '⚠️ Advertencia: Algunos índices pueden no haberse creado';
  END IF;

  RAISE NOTICE '✅ Configuración de Barber App completada exitosamente';
END $$;
