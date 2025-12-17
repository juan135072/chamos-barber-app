# 🚀 INSTRUCCIONES: Ejecutar Migración Walk-In Clients

## ❌ Error Actual

```
message: "relation \"public.walk_in_clients\" does not exist"
code: "42P01"
```

**Causa**: La tabla `walk_in_clients` no existe en Supabase aún.

---

## ✅ Solución: Ejecutar Migración SQL (5 minutos)

### **Paso 1: Acceder a Supabase**

1. Ir a: **https://app.supabase.com**
2. Login con tu cuenta
3. Seleccionar proyecto: **Chamos Barber**

---

### **Paso 2: Abrir SQL Editor**

1. En el menú lateral izquierdo, click en **"SQL Editor"**
2. Click en **"New query"** (botón verde superior derecho)

---

### **Paso 3: Copiar el Script SQL**

**Opción A: Desde el archivo**
```bash
# Archivo: database/migrations/create_walk_in_clients.sql
# Copiar todo el contenido del archivo
```

**Opción B: Script completo aquí abajo** 👇

```sql
/**
 * 🚶 TABLA WALK-IN CLIENTS
 * Tabla para almacenar clientes que llegan sin reserva
 */

-- Crear tabla walk_in_clients
CREATE TABLE IF NOT EXISTS public.walk_in_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL UNIQUE,
  email TEXT,
  notas TEXT,
  origen TEXT DEFAULT 'sin_reserva' CHECK (origen IN ('sin_reserva', 'referido', 'otro')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentarios de documentación
COMMENT ON TABLE public.walk_in_clients IS 'Clientes que llegan sin reserva (walk-in)';
COMMENT ON COLUMN public.walk_in_clients.id IS 'ID único del cliente walk-in';
COMMENT ON COLUMN public.walk_in_clients.nombre IS 'Nombre completo del cliente';
COMMENT ON COLUMN public.walk_in_clients.telefono IS 'Teléfono del cliente (único)';
COMMENT ON COLUMN public.walk_in_clients.email IS 'Email del cliente (opcional)';
COMMENT ON COLUMN public.walk_in_clients.notas IS 'Notas adicionales sobre el cliente';
COMMENT ON COLUMN public.walk_in_clients.origen IS 'Origen del cliente (sin_reserva, referido, otro)';
COMMENT ON COLUMN public.walk_in_clients.created_at IS 'Fecha de registro';
COMMENT ON COLUMN public.walk_in_clients.updated_at IS 'Fecha de última actualización';

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_walk_in_clients_telefono ON public.walk_in_clients(telefono);
CREATE INDEX IF NOT EXISTS idx_walk_in_clients_created_at ON public.walk_in_clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_walk_in_clients_origen ON public.walk_in_clients(origen);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_walk_in_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_walk_in_clients_updated_at
  BEFORE UPDATE ON public.walk_in_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_walk_in_clients_updated_at();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.walk_in_clients ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver walk-in clients
CREATE POLICY "Admins pueden ver walk-in clients"
  ON public.walk_in_clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'admin'
      AND activo = true
    )
  );

-- Política: Solo admins pueden insertar walk-in clients
CREATE POLICY "Admins pueden crear walk-in clients"
  ON public.walk_in_clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'admin'
      AND activo = true
    )
  );

-- Política: Solo admins pueden actualizar walk-in clients
CREATE POLICY "Admins pueden actualizar walk-in clients"
  ON public.walk_in_clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'admin'
      AND activo = true
    )
  );

-- Política: Solo admins pueden eliminar walk-in clients
CREATE POLICY "Admins pueden eliminar walk-in clients"
  ON public.walk_in_clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE email = auth.jwt() ->> 'email'
      AND rol = 'admin'
      AND activo = true
    )
  );
```

---

### **Paso 4: Pegar y Ejecutar**

1. **Pegar** el script SQL completo en el editor
2. Click en **"RUN"** (botón verde inferior derecho)
3. Esperar a que aparezca: **"Success. No rows returned"**

---

### **Paso 5: Verificar Creación**

En el mismo SQL Editor, ejecuta esta query de verificación:

```sql
-- Verificar que la tabla existe
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'walk_in_clients'
ORDER BY ordinal_position;
```

**Resultado esperado**: Deberías ver 8 filas (columnas: id, nombre, telefono, email, notas, origen, created_at, updated_at)

---

### **Paso 6: Verificar en la Aplicación**

1. Ir a: **https://chamosbarber.com/admin**
2. Login como admin
3. Click en menú **"Walk-In"** 🚶
4. El error **"Error al cargar datos"** debería desaparecer
5. Deberías ver: **"No hay clientes walk-in registrados"**
6. Click en **"Registrar Cliente"** para probar

---

## 🧪 Probar Funcionalidad

### **Test 1: Registrar Cliente**
```
1. Click en "Registrar Cliente" (botón oro)
2. Llenar formulario:
   - Nombre: "Juan Pérez Test"
   - Teléfono: "+56912345678"
   - Email: "test@ejemplo.com"
   - Notas: "Cliente de prueba"
3. Click en "Registrar Cliente"
4. Verificar que aparece en la lista
5. Verificar que estadísticas se actualizan:
   - Total: 1
   - Hoy: 1
```

### **Test 2: Buscar Cliente**
```
1. Escribir "Juan" en buscador
2. Verificar que filtra correctamente
3. Limpiar búsqueda y ver todos
```

### **Test 3: Eliminar Cliente**
```
1. Click en botón rojo "Eliminar" (🗑️)
2. Confirmar eliminación
3. Verificar que desaparece de la lista
4. Estadísticas deberían volver a 0
```

---

## ✅ Checklist de Verificación

- [ ] Script SQL ejecutado sin errores
- [ ] Tabla `walk_in_clients` creada (8 columnas)
- [ ] Índices creados (3 índices)
- [ ] Trigger `updated_at` funcionando
- [ ] RLS habilitado (4 políticas)
- [ ] Error "relation does not exist" desapareció
- [ ] Panel Walk-In muestra "0" en estadísticas
- [ ] Botón "Registrar Cliente" funciona
- [ ] Modal se abre correctamente
- [ ] Registro de cliente funciona
- [ ] Estadísticas se actualizan
- [ ] Búsqueda funciona
- [ ] Eliminación funciona

---

## 🐛 Troubleshooting

### Error: "permission denied for table walk_in_clients"
**Solución**: Las políticas RLS están activas. Asegúrate de estar logueado como admin.

### Error: "duplicate key value violates unique constraint"
**Causa**: Intentas registrar un teléfono que ya existe.
**Solución**: Usa un teléfono diferente.

### Error: "violates check constraint"
**Causa**: El campo `origen` tiene un valor no permitido.
**Solución**: Solo usa: 'sin_reserva', 'referido', 'otro'

### La tabla aparece vacía después de registrar
**Causa**: Posible problema de RLS.
**Verificación**:
```sql
-- Ver si hay datos (sin RLS)
SELECT * FROM public.walk_in_clients;

-- Ver políticas activas
SELECT * FROM pg_policies WHERE tablename = 'walk_in_clients';
```

---

## 📞 Soporte

Si encuentras algún problema:

1. **Revisar logs de Supabase**:
   - Ir a: Logs → Postgres Logs
   - Buscar errores recientes

2. **Verificar usuario admin**:
   ```sql
   SELECT * FROM public.admin_users 
   WHERE email = 'contacto@chamosbarber.com';
   ```

3. **Revisar consola del navegador**:
   - F12 → Console
   - Buscar errores de Supabase

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, el sistema de Walk-In Clients estará **100% funcional**.

**Características disponibles:**
- ✅ Registro de clientes sin reserva
- ✅ Estadísticas en tiempo real
- ✅ Búsqueda instantánea
- ✅ Gestión completa (crear/eliminar)
- ✅ Vista responsive (desktop + móvil)
- ✅ Seguridad con RLS (solo admins)

---

**Fecha**: 17 de diciembre de 2024  
**Versión**: 1.0.0  
**Estado**: Listo para deployment tras ejecutar migración
