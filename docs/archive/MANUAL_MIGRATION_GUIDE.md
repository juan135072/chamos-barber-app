# 📋 Guía de Migración Manual - Sistema POS

## ⚠️ Estado Actual

Tu instancia de Supabase es **self-hosted** y no tiene la función RPC `exec_sql` habilitada.
Por lo tanto, las migraciones deben ejecutarse **manualmente** desde el SQL Editor.

---

## 🎯 Paso a Paso

### **1️⃣ Acceder a Supabase Studio**

1. Abre tu navegador y ve a:
   ```
   https://supabase.chamosbarber.com/
   ```

2. Inicia sesión con:
   - **Usuario:** (tu usuario admin)
   - **Contraseña:** `IGnWZHipT8IeSI7j`

---

### **2️⃣ Ir al SQL Editor**

1. En el menú lateral izquierdo, busca y haz click en **"SQL Editor"**
2. Click en el botón **"New query"** (Nueva consulta)

---

### **3️⃣ Ejecutar Primera Migración: Sistema POS**

1. **Copiar el archivo:**
   - Abre: `supabase/migrations/add_pos_system.sql`
   - Selecciona TODO el contenido (Ctrl+A)
   - Cópialo (Ctrl+C)

2. **Pegar y ejecutar:**
   - Pega el contenido en el SQL Editor (Ctrl+V)
   - Click en el botón **"RUN"** (▶️ Ejecutar) o presiona Ctrl+Enter
   
3. **Verificar resultado:**
   Deberías ver un mensaje similar a:
   ```
   ✅ Migración completada exitosamente
   Barberos con comisión: X
   ```

---

### **4️⃣ Ejecutar Segunda Migración: Roles y Permisos**

1. **Limpiar el editor:**
   - Click en **"New query"** nuevamente para un editor limpio

2. **Copiar el archivo:**
   - Abre: `supabase/migrations/add_cajero_role.sql`
   - Selecciona TODO el contenido (Ctrl+A)
   - Cópialo (Ctrl+C)

3. **Pegar y ejecutar:**
   - Pega el contenido en el SQL Editor (Ctrl+V)
   - Click en **"RUN"** (▶️) o presiona Ctrl+Enter

4. **Verificar resultado:**
   Deberías ver:
   ```
   ✅ Migración de roles completada exitosamente
   Roles configurados: 3
   ```

---

### **5️⃣ Verificar que Todo se Creó Correctamente**

#### **Verificar Tablas:**

Ejecuta esta query en el SQL Editor:

```sql
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'facturas', 
    'configuracion_comisiones', 
    'roles_permisos'
  )
ORDER BY table_name;
```

**Resultado esperado:**
```
facturas                | BASE TABLE
configuracion_comisiones| BASE TABLE
roles_permisos          | BASE TABLE
```

#### **Verificar Vistas:**

```sql
SELECT 
  table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN (
    'ventas_diarias_por_barbero',
    'cierre_caja_diario',
    'usuarios_con_permisos'
  )
ORDER BY table_name;
```

**Resultado esperado:**
```
cierre_caja_diario
usuarios_con_permisos
ventas_diarias_por_barbero
```

#### **Verificar Funciones:**

```sql
SELECT 
  routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'generar_numero_factura',
    'calcular_comisiones_factura',
    'verificar_permiso'
  )
ORDER BY routine_name;
```

**Resultado esperado:**
```
calcular_comisiones_factura
generar_numero_factura
verificar_permiso
```

#### **Verificar Roles Configurados:**

```sql
SELECT 
  rol, 
  nombre_display, 
  descripcion 
FROM public.roles_permisos 
ORDER BY rol;
```

**Resultado esperado:**
```
admin   | Administrador          | Acceso completo...
barbero | Barbero                | Panel de barbero...
cajero  | Cajero/Punto de Venta  | Solo acceso al punto...
```

#### **Verificar Comisiones Inicializadas:**

```sql
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  c.porcentaje as comision_porcentaje,
  c.notas
FROM public.configuracion_comisiones c
JOIN public.barberos b ON b.id = c.barbero_id
ORDER BY b.nombre;
```

**Resultado esperado:**
Debería mostrar todos tus barberos activos con comisión de 50% por defecto.

---

## ✅ Checklist de Verificación

Marca cada item cuando lo hayas verificado:

- [ ] ✅ Migración 1 ejecutada sin errores
- [ ] ✅ Migración 2 ejecutada sin errores
- [ ] ✅ Tabla `facturas` existe
- [ ] ✅ Tabla `configuracion_comisiones` existe
- [ ] ✅ Tabla `roles_permisos` existe
- [ ] ✅ Vista `ventas_diarias_por_barbero` existe
- [ ] ✅ Vista `cierre_caja_diario` existe
- [ ] ✅ Vista `usuarios_con_permisos` existe
- [ ] ✅ Función `generar_numero_factura()` existe
- [ ] ✅ Función `calcular_comisiones_factura()` existe
- [ ] ✅ Función `verificar_permiso()` existe
- [ ] ✅ 3 roles configurados (admin, cajero, barbero)
- [ ] ✅ Comisiones por defecto creadas para barberos activos

---

## 🚨 Solución de Problemas

### **Error: "relation already exists"**
- **Causa:** La tabla ya fue creada anteriormente
- **Solución:** Es normal, la migración usa `IF NOT EXISTS`, continúa

### **Error: "column does not exist"**
- **Causa:** Puede que la tabla `admin_users` no tenga la columna `rol`
- **Solución:** Verifica la estructura de `admin_users`:
  ```sql
  \d public.admin_users
  ```

### **Error: "permission denied"**
- **Causa:** No tienes permisos suficientes
- **Solución:** Asegúrate de estar usando el usuario admin de Supabase

### **Error en la función `verificar_permiso`**
- **Causa:** Sintaxis de JSONB
- **Solución:** Ejecuta solo esa función por separado

---

## 📁 Archivos de Migración

Los archivos SQL están en:
```
supabase/
└── migrations/
    ├── add_pos_system.sql          ← Migración 1
    └── add_cajero_role.sql         ← Migración 2
```

---

## 🎉 ¿Todo Listo?

Una vez que hayas completado el checklist, estarás listo para:

1. ✅ Actualizar tipos TypeScript (si es necesario)
2. ✅ Empezar el desarrollo del frontend `/pos`
3. ✅ Crear la interfaz de gestión de usuarios
4. ✅ Implementar el sistema de impresión térmica

---

## 💡 Próximo Paso

Después de ejecutar las migraciones exitosamente, avísame y continuaré con:

**Opción A:** Crear la página `/pos` (Punto de Venta)  
**Opción B:** Crear la gestión de usuarios cajero en admin  
**Opción C:** Actualizar tipos TypeScript y crear helpers  

---

**Fecha de creación:** 2025-11-08  
**Última actualización:** 2025-11-08
