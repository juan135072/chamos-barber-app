# 🔧 Instrucciones de Migración y Datos de Prueba

## 📋 Resumen del Problema

**PROBLEMA ENCONTRADO:**
- ❌ La tabla `citas` en la BD usa `fecha_hora` (TIMESTAMP)
- ❌ El código de la app usa `fecha` (DATE) y `hora` (TIME) separadas
- ❌ Esto causaba el error: `ERROR: 42703: column "fecha" does not exist`

**SOLUCIÓN:**
- ✅ Migrar la estructura de la tabla `citas`
- ✅ Cambiar `fecha_hora` → `fecha` + `hora`
- ✅ Actualizar constraints y hacer `cliente_email` opcional

---

## 🚀 Pasos para Ejecutar (EN ORDEN)

### **PASO 1: Ejecutar la Migración** 🔧

1. Abre **Supabase Studio**: `https://supabase.chamosbarber.com`
2. Ve a **SQL Editor** → **New Query**
3. Copia y pega **TODO** el contenido de: `MIGRACION_CITAS_FECHA_HORA.sql`
4. Haz clic en **RUN** (⌘ Enter)
5. Espera 5-10 segundos

**Resultado esperado:**
```
✅ Migración completada
✅ Columnas fecha y hora creadas
✅ Constraint único actualizado
✅ Columna fecha_hora eliminada
```

---

### **PASO 2: Insertar Datos de Prueba** 🧪

1. En el mismo **SQL Editor**, crea **New Query**
2. Copia y pega **TODO** el contenido de: `DATOS_PRUEBA_FINAL.sql`
3. Haz clic en **RUN**
4. Espera 5-10 segundos

**Resultado esperado:**
```
tabla          | total
---------------|------
Barberos       | 2
Categorías     | 3
Citas          | 2
Horarios       | 12
Servicios      | 6
```

---

## 📊 Datos Insertados

### **👤 Usuario Admin** (ya existe)
- **Email**: `contacto@chamosbarber.com`
- **Password**: `Admin123456!`
- **Rol**: Admin

### **💈 Barberos**

#### **Carlos Pérez**
- Email: `carlos@chamosbarber.com`
- Teléfono: `+56912345678`
- Especialidades: Cortes clásicos, Fade, Diseños
- Instagram: `@carlos_barber_chile`

#### **Miguel Rodríguez**
- Email: `miguel@chamosbarber.com`
- Teléfono: `+56987654321`
- Especialidades: Barba, Tratamientos faciales, Afeitado clásico
- Instagram: `@miguel_barbershop`

### **✂️ Servicios**

#### **Categoría: Cortes**
1. **Corte Clásico** - $8.000 CLP - 30 min
2. **Fade Moderno** - $12.000 CLP - 45 min

#### **Categoría: Barba**
3. **Arreglo de Barba** - $6.000 CLP - 20 min
4. **Barba Premium** - $10.000 CLP - 35 min

#### **Categoría: Tratamientos**
5. **Tratamiento Capilar** - $15.000 CLP - 40 min
6. **Limpieza Facial** - $18.000 CLP - 50 min

### **📅 Horarios de Atención**
- **Lunes a Sábado**: 9:00 AM - 7:00 PM
- **Domingo**: Cerrado
- Aplica para ambos barberos

### **🗓️ Citas de Ejemplo**
1. **Mañana 10:00 AM** - Carlos Pérez - Fade Moderno
   - Cliente: Juan Pérez
   - Estado: Confirmada
   
2. **Pasado Mañana 3:00 PM** - Miguel Rodríguez - Barba Premium
   - Cliente: Pedro González
   - Estado: Pendiente

---

## 🧪 Cómo Probar la Aplicación

### **1. Como Administrador**
```
URL: https://chamosbarber.com/login
Email: contacto@chamosbarber.com
Password: Admin123456!
```

**Funcionalidades a probar:**
- ✅ Ver panel de administración
- ✅ Gestionar servicios
- ✅ Ver todas las citas
- ✅ Gestionar barberos

---

### **2. Como Cliente**
```
URL: https://chamosbarber.com/reservar
```

**Funcionalidades a probar:**
- ✅ Ver servicios disponibles
- ✅ Seleccionar barbero
- ✅ Agendar nueva cita
- ✅ Consultar citas existentes

**Para consultar citas:**
```
URL: https://chamosbarber.com/consultar
Teléfono: +56911111111 (Juan Pérez)
O
Teléfono: +56922222222 (Pedro González)
```

---

### **3. Ver Equipo de Barberos**
```
URL: https://chamosbarber.com/equipo
```

**Deberías ver:**
- ✅ Carlos Pérez con su foto y especialidades
- ✅ Miguel Rodríguez con su foto y especialidades
- ✅ Botón "Reservar" para cada barbero

---

## 🔍 Verificación de la Migración

### **Verificar estructura de tabla citas:**

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'citas'
ORDER BY ordinal_position;
```

**Resultado esperado:**
```
column_name      | data_type              | is_nullable
-----------------|------------------------|------------
id               | uuid                   | NO
barbero_id       | uuid                   | NO
servicio_id      | uuid                   | NO
cliente_nombre   | character varying      | NO
cliente_email    | character varying      | YES  ← AHORA OPCIONAL
cliente_telefono | character varying      | NO
fecha            | date                   | NO   ← NUEVO
hora             | time without time zone | NO   ← NUEVO
estado           | character varying      | NO
notas            | text                   | YES
created_at       | timestamp with tz      | NO
updated_at       | timestamp with tz      | NO
```

---

## ⚠️ Notas Importantes

### **Sobre la Migración:**
- ✅ Es **segura** para ejecutar en producción
- ✅ Usa transacciones (BEGIN/COMMIT)
- ✅ Preserva datos existentes si los hay
- ✅ Si falla, hace ROLLBACK automático

### **Sobre los Datos de Prueba:**
- ✅ Seguro ejecutar **múltiples veces**
- ✅ Usa `WHERE NOT EXISTS` para evitar duplicados
- ✅ Las fechas de citas son **dinámicas** (mañana y pasado mañana)

### **Si algo falla:**
1. Revisa los logs de error en Supabase
2. Copia el mensaje de error completo
3. Verifica que ejecutaste PASO 1 antes del PASO 2

---

## 📝 Archivos Incluidos

| Archivo | Descripción |
|---------|-------------|
| `MIGRACION_CITAS_FECHA_HORA.sql` | Script de migración de estructura |
| `DATOS_PRUEBA_FINAL.sql` | Datos de prueba completos |
| `INSTRUCCIONES_MIGRACION.md` | Este archivo (guía) |

---

## ✅ Checklist de Verificación

Después de ejecutar ambos scripts:

- [ ] La tabla `citas` tiene columnas `fecha` y `hora`
- [ ] La tabla `citas` NO tiene columna `fecha_hora`
- [ ] Hay 3 categorías de servicios
- [ ] Hay 6 servicios
- [ ] Hay 2 barberos
- [ ] Hay 12 horarios de atención
- [ ] Hay 2 citas de ejemplo
- [ ] Puedes hacer login como admin
- [ ] Puedes ver los barberos en /equipo
- [ ] Puedes agendar una nueva cita
- [ ] Puedes consultar citas por teléfono

---

## 🆘 Soporte

Si encuentras algún error:
1. Copia el mensaje de error completo
2. Toma screenshot si es posible
3. Indica en qué paso fallaste
4. Comparte los logs de la consola del navegador (F12)

---

**¡Listo para probar! 🚀**
