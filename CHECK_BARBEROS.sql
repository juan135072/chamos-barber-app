-- =====================================================
-- 🔍 VERIFICAR BARBEROS EN LA BASE DE DATOS
-- =====================================================

-- Ver todos los barberos
SELECT 
  id,
  nombre,
  apellido,
  email,
  telefono,
  instagram,
  descripcion,
  especialidades,
  imagen_url,
  activo,
  slug,
  created_at
FROM public.barberos
ORDER BY created_at DESC;

-- Contar barberos activos
SELECT COUNT(*) as total_barberos_activos
FROM public.barberos
WHERE activo = true;

-- Contar todos los barberos
SELECT COUNT(*) as total_barberos
FROM public.barberos;
