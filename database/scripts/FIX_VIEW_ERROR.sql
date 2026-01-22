-- ================================================
-- CORRECCIÓN: Vista usuarios_con_permisos
-- Problema: admin_users no tiene columna created_at
-- ================================================

-- Eliminar vista con error
DROP VIEW IF EXISTS public.usuarios_con_permisos;

-- Recrear vista SIN la columna created_at de admin_users
CREATE OR REPLACE VIEW public.usuarios_con_permisos AS
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.rol,
  u.activo,
  u.telefono,
  u.barbero_id,
  r.nombre_display as rol_nombre,
  r.descripcion as rol_descripcion,
  r.permisos,
  r.created_at as rol_created_at
FROM public.admin_users u
LEFT JOIN public.roles_permisos r ON r.rol = u.rol
ORDER BY u.nombre;

-- Verificar que funciona
SELECT 'Vista corregida exitosamente' as resultado;
SELECT COUNT(*) as total_usuarios FROM public.usuarios_con_permisos;
