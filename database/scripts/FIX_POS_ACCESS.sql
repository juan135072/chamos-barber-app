-- ================================================================
-- 🔧 FIX: Acceso al POS para usuarios admin
-- ================================================================
-- 
-- PROBLEMA: 
-- - El hook usePermissions busca en la vista 'usuarios_con_permisos'
-- - Esta vista no existe o no incluye los usuarios de admin_users
--
-- SOLUCIÓN:
-- - Crear/actualizar la vista usuarios_con_permisos
-- - Incluir datos de admin_users con sus permisos
-- ================================================================

-- PASO 1: Eliminar vista anterior si existe
DROP VIEW IF EXISTS public.usuarios_con_permisos CASCADE;

-- PASO 2: Crear vista usuarios_con_permisos
CREATE OR REPLACE VIEW public.usuarios_con_permisos AS
SELECT 
  au.id,
  au.email,
  au.nombre,
  au.rol,
  au.activo,
  au.telefono,
  au.barbero_id,
  au.created_at,
  au.updated_at,
  
  -- Agregar información del rol (si existe tabla roles_permisos)
  NULL::text as rol_nombre,
  NULL::text as rol_descripcion,
  
  -- Permisos según el rol
  CASE 
    -- Admin: todos los permisos
    WHEN au.rol = 'admin' THEN 
      jsonb_build_object(
        'pos', jsonb_build_object(
          'cobrar', true,
          'anular', true,
          'ver_reportes', true,
          'cerrar_caja', true
        ),
        'admin', jsonb_build_object(
          'ver', true,
          'editar', true,
          'eliminar', true
        ),
        'configuracion', jsonb_build_object(
          'editar', true
        ),
        'reportes', jsonb_build_object(
          'ver_todos', true,
          'exportar', true
        )
      )
    
    -- Cajero: permisos limitados
    WHEN au.rol = 'cajero' THEN 
      jsonb_build_object(
        'pos', jsonb_build_object(
          'cobrar', true,
          'anular', false,
          'ver_reportes', false,
          'cerrar_caja', true
        ),
        'admin', jsonb_build_object(
          'ver', false,
          'editar', false,
          'eliminar', false
        ),
        'configuracion', jsonb_build_object(
          'editar', false
        ),
        'reportes', jsonb_build_object(
          'ver_todos', false,
          'exportar', false
        )
      )
    
    -- Barbero: solo acceso a POS para cobrar
    WHEN au.rol = 'barbero' THEN 
      jsonb_build_object(
        'pos', jsonb_build_object(
          'cobrar', true,
          'anular', false,
          'ver_reportes', false,
          'cerrar_caja', false
        ),
        'admin', jsonb_build_object(
          'ver', false,
          'editar', false,
          'eliminar', false
        ),
        'configuracion', jsonb_build_object(
          'editar', false
        ),
        'reportes', jsonb_build_object(
          'ver_todos', false,
          'exportar', false
        )
      )
    
    ELSE NULL
  END as permisos,
  
  NULL::timestamp with time zone as rol_created_at
  
FROM public.admin_users au
WHERE au.activo = true;

-- PASO 3: Dar permisos de SELECT a usuarios autenticados
GRANT SELECT ON public.usuarios_con_permisos TO authenticated;
GRANT SELECT ON public.usuarios_con_permisos TO anon;

-- ================================================================
-- ✅ VERIFICACIÓN
-- ================================================================

-- Ver todos los usuarios con permisos
SELECT 
  id,
  email,
  nombre,
  rol,
  activo,
  permisos
FROM usuarios_con_permisos;

-- Verificar permisos específicos del usuario admin
SELECT 
  email,
  rol,
  permisos->'pos'->>'cobrar' as puede_cobrar,
  permisos->'admin'->>'ver' as puede_ver_admin,
  permisos->'pos'->>'cerrar_caja' as puede_cerrar_caja
FROM usuarios_con_permisos
WHERE email = 'contacto@chamosbarber.com';

-- ================================================================
-- 📋 RESUMEN
-- ================================================================
-- ✅ Vista usuarios_con_permisos creada
-- ✅ Permisos por rol definidos (admin, cajero, barbero)
-- ✅ Admin puede acceder a POS
-- ✅ Permisos SELECT otorgados
-- ================================================================
