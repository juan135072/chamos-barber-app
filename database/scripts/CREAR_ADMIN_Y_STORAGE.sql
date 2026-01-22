-- ================================================================
-- 🔐 CREAR USUARIO ADMINISTRADOR Y CONFIGURAR STORAGE
-- ================================================================
-- 
-- IMPORTANTE: 
-- 1. Ejecuta PRIMERO el archivo: INICIALIZACION_COMPLETA_BD.sql
-- 2. Luego ejecuta ESTE archivo
-- 3. Necesitarás crear el usuario en Supabase Auth primero
--
-- ================================================================

-- ================================================================
-- PARTE 1: CONFIGURAR STORAGE
-- ================================================================

-- Crear bucket para fotos de barberos (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barberos-fotos',
  'barberos-fotos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- Políticas RLS para Storage - LECTURA PÚBLICA
DROP POLICY IF EXISTS "barberos_fotos_public_read" ON storage.objects;
CREATE POLICY "barberos_fotos_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'barberos-fotos');

-- Políticas RLS para Storage - INSERCIÓN AUTENTICADA
DROP POLICY IF EXISTS "barberos_fotos_authenticated_insert" ON storage.objects;
CREATE POLICY "barberos_fotos_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'barberos-fotos');

-- Políticas RLS para Storage - ACTUALIZACIÓN AUTENTICADA
DROP POLICY IF EXISTS "barberos_fotos_authenticated_update" ON storage.objects;
CREATE POLICY "barberos_fotos_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'barberos-fotos')
WITH CHECK (bucket_id = 'barberos-fotos');

-- Políticas RLS para Storage - ELIMINACIÓN AUTENTICADA
DROP POLICY IF EXISTS "barberos_fotos_authenticated_delete" ON storage.objects;
CREATE POLICY "barberos_fotos_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'barberos-fotos');

SELECT '✅ Storage configurado correctamente' AS status;

-- ================================================================
-- PARTE 2: CREAR USUARIO ADMINISTRADOR
-- ================================================================

-- IMPORTANTE: Primero debes crear el usuario en Supabase Auth
-- 1. Ve a Authentication → Users en el panel de Supabase
-- 2. Crea un nuevo usuario con:
--    Email: admin@chamosbarber.com
--    Password: (tu contraseña segura)
-- 3. Copia el UUID del usuario creado
-- 4. Reemplaza 'UUID_DEL_USUARIO_CREADO' abajo con el UUID real

-- Una vez tengas el UUID, ejecuta:

-- EJEMPLO (reemplaza el UUID con el real):
/*
INSERT INTO public.admin_users (
  id,
  email,
  nombre,
  telefono,
  rol,
  activo,
  barbero_id
) VALUES (
  'UUID_DEL_USUARIO_CREADO', -- Reemplaza esto con el UUID real de auth.users
  'admin@chamosbarber.com',
  'Administrador Principal',
  '+56912345678',
  'admin',
  true,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  rol = 'admin',
  activo = true;
*/

SELECT '⚠️ RECUERDA: Debes crear el usuario en Authentication primero' AS recordatorio;
SELECT '📝 Luego ejecuta el INSERT de admin_users con el UUID correcto' AS siguiente_paso;

-- ================================================================
-- PARTE 3: CREAR BARBERO DE EJEMPLO (OPCIONAL)
-- ================================================================

-- Insertar un barbero de ejemplo
INSERT INTO public.barberos (
  nombre,
  apellido,
  telefono,
  email,
  instagram,
  descripcion,
  especialidades,
  activo,
  slug
) VALUES (
  'Carlos',
  'Pérez',
  '+56987654321',
  'carlos@chamosbarber.com',
  '@carlosbarber',
  'Barbero profesional con 10 años de experiencia. Especialista en cortes modernos y degradados.',
  ARRAY['Cortes Modernos', 'Degradados', 'Diseños'],
  true,
  'carlos-perez'
) ON CONFLICT (email) DO NOTHING
RETURNING id, nombre, apellido, email;

-- Configurar horarios de atención para el barbero de ejemplo
WITH barbero_carlos AS (
  SELECT id FROM public.barberos WHERE email = 'carlos@chamosbarber.com' LIMIT 1
)
INSERT INTO public.horarios_atencion (barbero_id, dia_semana, hora_inicio, hora_fin, activo)
SELECT 
  barbero_carlos.id,
  dia,
  '09:00'::TIME,
  '18:00'::TIME,
  true
FROM barbero_carlos, generate_series(1, 5) AS dia -- Lunes a Viernes
ON CONFLICT (barbero_id, dia_semana) DO NOTHING;

SELECT '✅ Barbero de ejemplo creado' AS status;

-- ================================================================
-- PARTE 4: VERIFICACIÓN FINAL
-- ================================================================

-- Verificar Storage
SELECT 
  'Storage Bucket' AS tipo,
  id AS nombre,
  public AS es_publico,
  file_size_limit / 1048576 || ' MB' AS limite_tamaño
FROM storage.buckets
WHERE id = 'barberos-fotos';

-- Verificar Políticas de Storage
SELECT 
  'Política Storage' AS tipo,
  policyname AS nombre,
  cmd AS operacion
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%barberos_fotos%';

-- Verificar Barberos
SELECT 
  'Barberos' AS tipo,
  COUNT(*) AS cantidad
FROM public.barberos
WHERE activo = true;

-- Verificar Servicios
SELECT 
  'Servicios' AS tipo,
  COUNT(*) AS cantidad
FROM public.servicios
WHERE activo = true;

-- Verificar Categorías
SELECT 
  'Categorías' AS tipo,
  COUNT(*) AS cantidad
FROM public.categorias_servicios
WHERE activo = true;

SELECT '🎉 ¡TODO CONFIGURADO CORRECTAMENTE!' AS resultado;

-- ================================================================
-- INSTRUCCIONES FINALES
-- ================================================================

SELECT '
📋 PASOS SIGUIENTES:

1. Ve a Authentication → Users en Supabase
2. Crea un usuario con:
   - Email: admin@chamosbarber.com
   - Password: (tu contraseña segura)

3. Copia el UUID del usuario creado

4. Ejecuta este comando reemplazando el UUID:

INSERT INTO public.admin_users (id, email, nombre, rol, activo)
VALUES (
  ''TU_UUID_AQUÍ'',
  ''admin@chamosbarber.com'',
  ''Administrador Principal'',
  ''admin'',
  true
);

5. ¡Listo! Ya puedes hacer login con admin@chamosbarber.com
' AS instrucciones_finales;

-- ================================================================
-- FIN
-- ================================================================
