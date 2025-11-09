-- ================================================
-- MIGRACIÓN: Rol de Cajero para Panel POS
-- Fecha: 2025-11-08
-- Descripción: Agregar rol 'cajero' y permisos
-- ================================================

-- 1. Ya existe la tabla admin_users, solo documentar los roles
COMMENT ON COLUMN public.admin_users.rol IS 'Roles disponibles: admin, barbero, cajero';

-- 2. Crear tabla de permisos por rol (opcional, para futuro)
CREATE TABLE IF NOT EXISTS public.roles_permisos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rol VARCHAR(50) NOT NULL UNIQUE,
  nombre_display VARCHAR(100) NOT NULL,
  descripcion TEXT,
  permisos JSONB NOT NULL,
  -- Formato permisos:
  -- {
  --   "pos": { "cobrar": true, "anular": false, "ver_reportes": false },
  --   "admin": { "ver": false, "editar": false },
  --   "configuracion": { "editar": false }
  -- }
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insertar roles por defecto
INSERT INTO public.roles_permisos (rol, nombre_display, descripcion, permisos) VALUES
('admin', 'Administrador', 'Acceso completo a todas las funcionalidades', '{
  "pos": {"cobrar": true, "anular": true, "ver_reportes": true, "cerrar_caja": true},
  "admin": {"ver": true, "editar": true, "eliminar": true},
  "configuracion": {"editar": true},
  "reportes": {"ver_todos": true, "exportar": true}
}'::jsonb),

('cajero', 'Cajero/Punto de Venta', 'Solo acceso al punto de venta para cobrar', '{
  "pos": {"cobrar": true, "anular": false, "ver_reportes": false, "cerrar_caja": true},
  "admin": {"ver": false, "editar": false, "eliminar": false},
  "configuracion": {"editar": false},
  "reportes": {"ver_todos": false, "exportar": false}
}'::jsonb),

('barbero', 'Barbero', 'Panel de barbero con sus citas y notas', '{
  "pos": {"cobrar": true, "anular": false, "ver_reportes": false, "cerrar_caja": false},
  "admin": {"ver": false, "editar": false, "eliminar": false},
  "configuracion": {"editar": false},
  "reportes": {"ver_todos": false, "exportar": false}
}'::jsonb)

ON CONFLICT (rol) DO UPDATE SET
  nombre_display = EXCLUDED.nombre_display,
  descripcion = EXCLUDED.descripcion,
  permisos = EXCLUDED.permisos;

-- 4. FUNCIÓN: Verificar permisos
CREATE OR REPLACE FUNCTION verificar_permiso(
  p_user_id UUID,
  p_modulo TEXT,
  p_accion TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rol VARCHAR(50);
  v_permisos JSONB;
BEGIN
  -- Obtener rol del usuario
  SELECT rol INTO v_rol
  FROM public.admin_users
  WHERE id = p_user_id;
  
  -- Si es admin, siempre tiene permiso
  IF v_rol = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Obtener permisos del rol
  SELECT permisos INTO v_permisos
  FROM public.roles_permisos
  WHERE rol = v_rol;
  
  -- Verificar permiso específico
  RETURN COALESCE(
    (v_permisos -> p_modulo ->> p_accion)::boolean,
    FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS para roles_permisos
ALTER TABLE public.roles_permisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_permisos_select_all"
  ON public.roles_permisos FOR SELECT
  USING (true);

-- 6. VISTA: Usuarios con permisos
CREATE OR REPLACE VIEW public.usuarios_con_permisos AS
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.rol,
  u.activo,
  u.telefono,
  u.barbero_id,
  u.created_at,
  r.nombre_display as rol_nombre,
  r.descripcion as rol_descripcion,
  r.permisos
FROM public.admin_users u
LEFT JOIN public.roles_permisos r ON r.rol = u.rol
ORDER BY u.created_at DESC;

-- 7. Índices
CREATE INDEX IF NOT EXISTS idx_admin_users_rol ON public.admin_users(rol);

-- ================================================
-- DATOS DE EJEMPLO: Crear usuario cajero
-- ================================================

-- IMPORTANTE: Este usuario NO tiene auth en Supabase Auth
-- Se debe crear manualmente en Admin Panel o usar invitación

-- Ejemplo de cómo se crearía:
-- INSERT INTO public.admin_users (email, nombre, rol, activo)
-- VALUES ('caja@chamos.com', 'Caja Principal', 'cajero', true);

-- ================================================
-- FIN DE MIGRACIÓN
-- ================================================

SELECT 'Migración de roles completada exitosamente' as resultado;
SELECT COUNT(*) as roles_configurados FROM public.roles_permisos;
