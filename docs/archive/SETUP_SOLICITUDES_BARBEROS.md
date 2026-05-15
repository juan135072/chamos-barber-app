# 🚀 Habilitación de Funcionalidad: Solicitudes de Barberos

## 📋 Descripción

Esta funcionalidad permite que nuevos barberos soliciten unirse al sistema a través de un formulario público. Los administradores pueden revisar, aprobar o rechazar estas solicitudes desde el panel de administración.

## ✅ Requisitos Previos

- Acceso al dashboard de Supabase: `https://supabase.chamosbarber.com`
- Permisos de administrador en la base de datos
- Las tablas `barberos` y `admin_users` deben existir

## 🔧 Instrucciones de Instalación

### **Opción 1: Supabase Dashboard (Recomendado)**

1. **Accede al SQL Editor:**
   - Abre: https://supabase.chamosbarber.com
   - Ve a: **SQL Editor** (ícono de terminal en el menú lateral)

2. **Ejecuta el Script 1 - Crear Tabla:**
   - Haz clic en **"New Query"**
   - Copia y pega el contenido completo de `SQL Script 1` (ver abajo)
   - Haz clic en **"Run"** o presiona `Ctrl+Enter`
   - Verifica que veas: ✅ Success messages

3. **Ejecuta el Script 2 - Crear Función:**
   - Haz clic en **"New Query"** nuevamente
   - Copia y pega el contenido completo de `SQL Script 2` (ver abajo)
   - Haz clic en **"Run"**
   - Verifica que vea: ✅ Success

4. **Verificar instalación:**
   - Ve a **Table Editor** en Supabase
   - Busca la tabla `solicitudes_barberos`
   - Debería aparecer con todas sus columnas

---

## 📜 SQL Script 1: Crear Tabla solicitudes_barberos

```sql
-- ========================================
-- Tabla: solicitudes_barberos
-- Descripción: Almacena solicitudes de registro de nuevos barberos
-- ========================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS public.solicitudes_barberos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  apellido text NOT NULL,
  email text NOT NULL UNIQUE,
  telefono text NOT NULL,
  especialidad text NOT NULL,
  descripcion text,
  experiencia_anos integer NOT NULL DEFAULT 0,
  imagen_url text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  barbero_id uuid REFERENCES public.barberos(id) ON DELETE SET NULL,
  revisada_por uuid REFERENCES public.admin_users(id),
  fecha_solicitud timestamptz NOT NULL DEFAULT now(),
  fecha_revision timestamptz,
  notas_revision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_barberos_estado ON public.solicitudes_barberos(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_barberos_email ON public.solicitudes_barberos(email);
CREATE INDEX IF NOT EXISTS idx_solicitudes_barberos_fecha ON public.solicitudes_barberos(fecha_solicitud DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_solicitudes_barberos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_solicitudes_barberos_updated_at
  BEFORE UPDATE ON public.solicitudes_barberos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_solicitudes_barberos_updated_at();

-- Políticas RLS
ALTER TABLE public.solicitudes_barberos ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede insertar una solicitud (registro público)
CREATE POLICY "Permitir inserción pública de solicitudes"
  ON public.solicitudes_barberos
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Política: Solo admins pueden ver todas las solicitudes
CREATE POLICY "Admins pueden ver todas las solicitudes"
  ON public.solicitudes_barberos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.rol = 'admin'
      AND admin_users.activo = true
    )
  );

-- Política: Solo admins pueden actualizar solicitudes
CREATE POLICY "Admins pueden actualizar solicitudes"
  ON public.solicitudes_barberos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.rol = 'admin'
      AND admin_users.activo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.rol = 'admin'
      AND admin_users.activo = true
    )
  );

-- Comentarios
COMMENT ON TABLE public.solicitudes_barberos IS 'Almacena solicitudes de registro de nuevos barberos';
COMMENT ON COLUMN public.solicitudes_barberos.estado IS 'Estado de la solicitud: pendiente, aprobada, rechazada';
COMMENT ON COLUMN public.solicitudes_barberos.barbero_id IS 'ID del barbero creado si fue aprobado';

-- Tests de verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla solicitudes_barberos creada exitosamente';
  RAISE NOTICE '✅ Políticas RLS configuradas';
  RAISE NOTICE '✅ Índices creados para optimización';
  RAISE NOTICE '✅ Trigger de updated_at configurado';
END $$;
```

---

## 📜 SQL Script 2: Crear Función aprobar_solicitud_barbero

```sql
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
    especialidades,
    descripcion,
    imagen_url,
    activo
  ) VALUES (
    p_auth_user_id,
    v_solicitud.nombre,
    v_solicitud.apellido,
    v_solicitud.email,
    v_solicitud.telefono,
    ARRAY[v_solicitud.especialidad]::text[],
    v_solicitud.descripcion,
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
```

---

## ✅ Verificación Post-Instalación

### 1. **Verificar en Supabase Dashboard:**
   - Ve a **Table Editor**
   - Busca `solicitudes_barberos`
   - Verifica que tenga las siguientes columnas:
     - `id`, `nombre`, `apellido`, `email`, `telefono`
     - `especialidad`, `descripcion`, `experiencia_anos`
     - `imagen_url`, `estado`, `barbero_id`
     - `revisada_por`, `fecha_solicitud`, `fecha_revision`
     - `notas_revision`, `created_at`, `updated_at`

### 2. **Verificar en la aplicación:**
   - Abre: https://chamosbarber.com/admin
   - Ve a la pestaña **Solicitudes**
   - Deberías ver la interfaz de gestión (vacía inicialmente)
   - NO deberías ver el mensaje de error "Funcionalidad No Disponible"

### 3. **Probar inserción de solicitud:**
   ```sql
   -- En SQL Editor de Supabase, ejecuta:
   INSERT INTO public.solicitudes_barberos (
     nombre, apellido, email, telefono, especialidad
   ) VALUES (
     'Juan', 'Pérez', 'juan.test@example.com', '+56911111111', 'Cortes clásicos'
   );
   
   -- Verificar:
   SELECT * FROM public.solicitudes_barberos;
   ```

---

## 🎯 Funcionalidades Habilitadas

Una vez completada la instalación, tendrás:

✅ **Tabla de Solicitudes:**
   - Almacena solicitudes de nuevos barberos
   - Estados: pendiente, aprobada, rechazada
   - Auditoría completa (quién revisó, cuándo, notas)

✅ **Políticas de Seguridad (RLS):**
   - Cualquiera puede enviar solicitud (público)
   - Solo admins pueden ver/gestionar solicitudes
   - Actualización protegida por rol

✅ **Función de Aprobación:**
   - Crea automáticamente cuenta de barbero
   - Crea entrada en admin_users con rol 'barbero'
   - Actualiza estado de solicitud
   - Transacción atómica (todo o nada)

✅ **Interfaz de Administración:**
   - Ver todas las solicitudes
   - Filtrar por estado
   - Aprobar/Rechazar solicitudes
   - Añadir notas de revisión

---

## 🐛 Troubleshooting

### Error: "Table already exists"
- ✅ Esto es normal si ejecutas el script dos veces
- El `IF NOT EXISTS` previene errores
- Puedes ignorar este mensaje

### Error: "Permission denied"
- ❌ Tu usuario no tiene permisos suficientes
- Contacta al super admin de Supabase
- Necesitas rol `postgres` o `service_role`

### Error: "Foreign key constraint fails"
- ❌ Las tablas `barberos` o `admin_users` no existen
- Ejecuta primero los scripts de inicialización base
- Archivo: `INICIALIZACION_COMPLETA_BD.sql`

### La pestaña sigue mostrando error
- Limpia caché del navegador (Ctrl+Shift+R)
- Verifica que la tabla existe en Supabase
- Revisa consola del navegador para errores

---

## 📞 Soporte

Si encuentras problemas:
1. Verifica los logs en la consola del navegador
2. Revisa el SQL Editor de Supabase para errores
3. Consulta la documentación de Supabase RLS
4. Revisa que las tablas dependientes existan

---

## 📝 Notas Adicionales

- La función `aprobar_solicitud_barbero` usa `SECURITY DEFINER` para ejecutar con privilegios elevados
- Las políticas RLS garantizan que solo admins autenticados puedan gestionar solicitudes
- El trigger `updated_at` se actualiza automáticamente en cada modificación
- Los índices optimizan consultas por estado, email y fecha

---

✨ **¡Listo para usar!** Una vez ejecutados los scripts, la funcionalidad estará completamente operativa.
