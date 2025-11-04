-- ========================================
-- Función SQL: aprobar_solicitud_barbero
-- Descripción: Aprueba una solicitud y crea barbero + admin_user
-- ========================================

CREATE OR REPLACE FUNCTION public.aprobar_solicitud_barbero(
  p_solicitud_id uuid,
  p_admin_id uuid,
  p_auth_user_id uuid,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_solicitud record;
  v_barbero_id uuid;
  v_result jsonb;
BEGIN
  -- 1. Obtener la solicitud
  SELECT * INTO v_solicitud
  FROM public.solicitudes_barberos
  WHERE id = p_solicitud_id AND estado = 'pendiente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada o ya fue procesada';
  END IF;

  -- 2. Crear barbero
  INSERT INTO public.barberos (
    id,
    nombre,
    apellido,
    email,
    telefono,
    especialidad,
    descripcion,
    experiencia_anos,
    imagen_url,
    activo
  ) VALUES (
    p_auth_user_id,
    v_solicitud.nombre,
    v_solicitud.apellido,
    v_solicitud.email,
    v_solicitud.telefono,
    v_solicitud.especialidad,
    v_solicitud.descripcion,
    v_solicitud.experiencia_anos,
    v_solicitud.imagen_url,
    true
  );

  v_barbero_id := p_auth_user_id;

  -- 3. Crear admin_user
  INSERT INTO public.admin_users (
    id,
    email,
    nombre,
    rol,
    barbero_id,
    activo
  ) VALUES (
    p_auth_user_id,
    v_solicitud.email,
    v_solicitud.nombre || ' ' || v_solicitud.apellido,
    'barbero',
    v_barbero_id,
    true
  );

  -- 4. Actualizar solicitud
  UPDATE public.solicitudes_barberos
  SET 
    estado = 'aprobada',
    barbero_id = v_barbero_id,
    revisada_por = p_admin_id,
    fecha_revision = now()
  WHERE id = p_solicitud_id;

  -- 5. Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'barbero_id', v_barbero_id,
    'email', v_solicitud.email,
    'password', p_password
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- En caso de error, PostgreSQL hace rollback automático
  RAISE EXCEPTION 'Error en aprobar_solicitud_barbero: %', SQLERRM;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION public.aprobar_solicitud_barbero IS 'Aprueba una solicitud de barbero y crea las entradas necesarias en barberos y admin_users';

-- Test de la función
DO $$
BEGIN
  RAISE NOTICE '✅ Función aprobar_solicitud_barbero creada exitosamente';
  RAISE NOTICE '📝 Uso: SELECT public.aprobar_solicitud_barbero(solicitud_id, admin_id, auth_user_id, password);';
END $$;
