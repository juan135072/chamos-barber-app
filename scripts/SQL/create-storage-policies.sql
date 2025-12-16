-- ================================================================
-- POLÍTICAS DE STORAGE PARA BUCKETS DE FOTOS
-- ================================================================
-- Este script crea las políticas RLS necesarias para que los usuarios
-- autenticados puedan subir, ver y eliminar archivos en los buckets
-- de barberos-fotos y servicios-fotos
-- ================================================================

-- ========================================
-- BUCKET: servicios-fotos
-- ========================================

-- 1. POLÍTICA: Permitir lectura pública (cualquiera puede ver las fotos)
DROP POLICY IF EXISTS "Public read access for servicios-fotos" ON storage.objects;
CREATE POLICY "Public read access for servicios-fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'servicios-fotos');

-- 2. POLÍTICA: Permitir subida solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can upload servicios-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can upload servicios-fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'servicios-fotos'
  AND auth.role() = 'authenticated'
);

-- 3. POLÍTICA: Permitir actualización solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can update servicios-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can update servicios-fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'servicios-fotos'
  AND auth.role() = 'authenticated'
);

-- 4. POLÍTICA: Permitir eliminación solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can delete servicios-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can delete servicios-fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'servicios-fotos'
  AND auth.role() = 'authenticated'
);

-- ========================================
-- BUCKET: barberos-fotos
-- ========================================

-- 1. POLÍTICA: Permitir lectura pública (cualquiera puede ver las fotos)
DROP POLICY IF EXISTS "Public read access for barberos-fotos" ON storage.objects;
CREATE POLICY "Public read access for barberos-fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'barberos-fotos');

-- 2. POLÍTICA: Permitir subida solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can upload barberos-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can upload barberos-fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barberos-fotos'
  AND auth.role() = 'authenticated'
);

-- 3. POLÍTICA: Permitir actualización solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can update barberos-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can update barberos-fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barberos-fotos'
  AND auth.role() = 'authenticated'
);

-- 4. POLÍTICA: Permitir eliminación solo a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated users can delete barberos-fotos" ON storage.objects;
CREATE POLICY "Authenticated users can delete barberos-fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barberos-fotos'
  AND auth.role() = 'authenticated'
);

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (
    policyname LIKE '%servicios-fotos%'
    OR policyname LIKE '%barberos-fotos%'
  )
ORDER BY policyname;

-- ================================================================
-- RESULTADO ESPERADO
-- ================================================================
-- Deberías ver 8 políticas en total:
-- 
-- servicios-fotos:
--   1. Public read access for servicios-fotos (SELECT)
--   2. Authenticated users can upload servicios-fotos (INSERT)
--   3. Authenticated users can update servicios-fotos (UPDATE)
--   4. Authenticated users can delete servicios-fotos (DELETE)
--
-- barberos-fotos:
--   5. Public read access for barberos-fotos (SELECT)
--   6. Authenticated users can upload barberos-fotos (INSERT)
--   7. Authenticated users can update barberos-fotos (UPDATE)
--   8. Authenticated users can delete barberos-fotos (DELETE)
-- ================================================================
