-- ========================================
-- CONFIGURACIÓN DE STORAGE PARA FOTOS DE BARBEROS
-- ========================================
-- Ejecuta este script completo en Supabase SQL Editor
-- Para que funcione la carga de fotos en:
--   1. Panel Admin (modales de barberos)
--   2. Formulario de registro público
--   3. Panel de barberos (perfil)
-- ========================================

-- ========================================
-- PASO 1: CREAR BUCKET DE STORAGE
-- ========================================

-- Crear bucket público para fotos de barberos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barberos-fotos',
  'barberos-fotos',
  true,                                                                    -- Bucket PÚBLICO (necesario para mostrar fotos)
  5242880,                                                                 -- 5MB límite de archivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] -- Tipos permitidos
)
ON CONFLICT (id) DO NOTHING;                                              -- No fallar si ya existe

-- ========================================
-- PASO 2: CONFIGURAR POLÍTICAS RLS (Row Level Security)
-- ========================================

-- Política 1: Permitir LECTURA PÚBLICA de fotos
-- Esto permite que cualquier persona vea las fotos de los barberos
CREATE POLICY "allow_public_read_barberos_fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'barberos-fotos');

-- Política 2: Permitir SUBIDA de fotos a usuarios autenticados
-- Admins y barberos autenticados pueden subir fotos
CREATE POLICY "allow_authenticated_insert_barberos_fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'barberos-fotos');

-- Política 3: Permitir ACTUALIZACIÓN de fotos a usuarios autenticados
-- Admins y barberos pueden actualizar sus fotos
CREATE POLICY "allow_authenticated_update_barberos_fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'barberos-fotos')
WITH CHECK (bucket_id = 'barberos-fotos');

-- Política 4: Permitir ELIMINACIÓN de fotos a usuarios autenticados
-- Admins y barberos pueden eliminar fotos (al actualizar, se borra la anterior)
CREATE POLICY "allow_authenticated_delete_barberos_fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'barberos-fotos');

-- ========================================
-- PASO 3: VERIFICAR CONFIGURACIÓN
-- ========================================

-- Verificar que el bucket se creó correctamente
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'barberos-fotos';

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%barberos_fotos%';

-- ========================================
-- RESULTADO ESPERADO
-- ========================================
-- ✅ Bucket 'barberos-fotos' creado
-- ✅ Bucket configurado como PÚBLICO
-- ✅ Límite de 5MB por archivo
-- ✅ Solo imágenes permitidas (JPG, PNG, WEBP, GIF)
-- ✅ 4 políticas RLS creadas:
--    - Lectura pública (SELECT)
--    - Subida autenticada (INSERT)
--    - Actualización autenticada (UPDATE)
--    - Eliminación autenticada (DELETE)
-- ========================================

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
-- 🔴 Si recibes error "bucket already exists":
--    - Es normal, significa que el bucket ya existe
--    - El script usa ON CONFLICT DO NOTHING para evitar error
--    - Continúa con las políticas RLS
--
-- 🔴 Si recibes error "policy already exists":
--    - Elimina las políticas existentes primero:
--      DROP POLICY IF EXISTS "allow_public_read_barberos_fotos" ON storage.objects;
--      DROP POLICY IF EXISTS "allow_authenticated_insert_barberos_fotos" ON storage.objects;
--      DROP POLICY IF EXISTS "allow_authenticated_update_barberos_fotos" ON storage.objects;
--      DROP POLICY IF EXISTS "allow_authenticated_delete_barberos_fotos" ON storage.objects;
--    - Luego ejecuta este script nuevamente
--
-- 🔴 Si las fotos no se ven en el frontend:
--    - Verifica que el bucket sea PÚBLICO (public = true)
--    - Verifica la política de lectura pública
--    - Verifica la URL completa de la imagen
--    - Prueba abrir la URL directamente en el navegador
--
-- 🔴 Si no puedes subir fotos:
--    - Verifica que estés autenticado (admin o barbero)
--    - Verifica las políticas INSERT/UPDATE/DELETE
--    - Verifica los logs de Supabase
-- ========================================

-- ========================================
-- TESTING
-- ========================================
-- Para probar que todo funciona:
--
-- 1. Ve al panel de administración
-- 2. Crea o edita un barbero
-- 3. Sube una foto (drag & drop o selecciona archivo)
-- 4. Guarda
-- 5. Verifica que la foto se muestre en:
--    - Lista de barberos (admin)
--    - Panel de barberos (perfil)
--    - Frontend (página de reservas)
--
-- 6. Ve al panel de barberos (como barbero)
-- 7. Ve a "Mi Perfil"
-- 8. Sube una nueva foto
-- 9. Guarda
-- 10. Verifica que la foto se actualizó
-- ========================================

-- ========================================
-- URLs DE EJEMPLO GENERADAS
-- ========================================
-- Las fotos se almacenarán con este patrón:
-- 
-- https://[TU_SUPABASE_URL]/storage/v1/object/public/barberos-fotos/{barberoId}-{timestamp}.{ext}
--
-- Ejemplo real:
-- https://abc123.supabase.co/storage/v1/object/public/barberos-fotos/550e8400-e29b-41d4-a716-446655440000-1699285600000.jpg
-- ========================================

-- ========================================
-- INFORMACIÓN DE STORAGE
-- ========================================
-- Ubicación en Supabase Dashboard:
-- 
-- 1. Ve a: https://supabase.com/dashboard/project/[TU_PROJECT_ID]
-- 2. Click en "Storage" en el menú lateral
-- 3. Deberías ver el bucket "barberos-fotos"
-- 4. Click en el bucket para ver las fotos subidas
-- ========================================
