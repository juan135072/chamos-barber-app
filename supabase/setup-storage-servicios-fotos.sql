-- =====================================================
-- SCRIPT: Configuración de Storage para Fotos de Servicios
-- FECHA: 2025-11-09
-- PROPÓSITO: Crear bucket y políticas RLS para imágenes de servicios
-- =====================================================

-- 1. CREAR BUCKET PÚBLICO PARA FOTOS DE SERVICIOS
-- =================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'servicios-fotos',
  'servicios-fotos',
  true,  -- Público para que las imágenes se muestren sin autenticación
  5242880,  -- 5MB (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;


-- 2. POLÍTICAS RLS PARA EL BUCKET
-- =================================================

-- 2.1. Permitir lectura pública (para mostrar imágenes en el frontend)
CREATE POLICY "allow_public_read_servicios_fotos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'servicios-fotos');

-- 2.2. Permitir subida autenticada (admin puede subir fotos)
CREATE POLICY "allow_authenticated_insert_servicios_fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'servicios-fotos');

-- 2.3. Permitir actualización autenticada (admin puede reemplazar fotos)
CREATE POLICY "allow_authenticated_update_servicios_fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'servicios-fotos')
WITH CHECK (bucket_id = 'servicios-fotos');

-- 2.4. Permitir eliminación autenticada (admin puede eliminar fotos)
CREATE POLICY "allow_authenticated_delete_servicios_fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'servicios-fotos');


-- 3. VERIFICACIÓN
-- =================================================

-- Verificar que el bucket fue creado correctamente
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'servicios-fotos';

-- Verificar que las políticas fueron creadas
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%servicios_fotos%'
ORDER BY policyname;


-- =====================================================
-- RESULTADO ESPERADO
-- =====================================================
-- ✅ 1 bucket creado: 'servicios-fotos'
-- ✅ 4 políticas RLS creadas:
--    - allow_public_read_servicios_fotos (SELECT, public)
--    - allow_authenticated_insert_servicios_fotos (INSERT, authenticated)
--    - allow_authenticated_update_servicios_fotos (UPDATE, authenticated)
--    - allow_authenticated_delete_servicios_fotos (DELETE, authenticated)
-- =====================================================

-- INSTRUCCIONES DE USO:
-- 1. Abre el SQL Editor en Supabase Dashboard
-- 2. Copia y pega este script completo
-- 3. Ejecuta con Ctrl+Enter o click en "Run"
-- 4. Verifica que no haya errores
-- 5. Las consultas SELECT al final mostrarán la configuración creada
