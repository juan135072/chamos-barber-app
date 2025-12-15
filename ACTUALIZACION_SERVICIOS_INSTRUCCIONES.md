# 📋 ACTUALIZACIÓN DE SERVICIOS - CHAMOS BARBER

## 🎯 Resumen de Cambios

Se han actualizado **todos los servicios y precios** según el menú oficial proporcionado.

---

## 📊 LISTADO COMPLETO DE SERVICIOS ACTUALIZADOS

### 💈 CORTE DE CABELLO

| Servicio | Descripción | Precio | Duración |
|----------|-------------|--------|----------|
| **ADULTO MAYOR** | Incluye asesoría para un estilo retro, lavado de cabello, peinado y aplicación de producto de alta calidad. | **$8,000 CLP** | 30 min |
| **DEGRADADO** | Incluye asesoría, lavado de cabello, peinado y aplicación de producto de alta calidad. | **$10,000 CLP** | 30 min |
| **CORTE DE NIÑO MENOR DE 10 AÑOS** | Incluye asesoría profesional, secado y peinado con productos de alta calidad. | **$8,000 CLP** | 30 min |

---

### 🧔 BARBA

| Servicio | Descripción | Precio | Duración |
|----------|-------------|--------|----------|
| **PERFILADO DE BARBA** | Perfilado, rebaje, degradados y más. Este servicio contempla hacer un rediseño completo o parcial de tu look con barba. Puedes complementar este servicio con un corte de pelo. El servicio contempla un tratamiento de apertura de poros con toalla caliente. | **$5,000 CLP** | 15 min |

---

### ✂️ CORTE + BARBA

| Servicio | Descripción | Precio | Duración |
|----------|-------------|--------|----------|
| **DEGRADADO + BARBA** | Incluye asesoría para corte de cabello estilo moderno en tendencia con servicio estilizado de barba + servicio de toalla caliente y lavado de cabello peinado y aplicación de producto. | **$14,000 CLP** | 1 hr |

---

### 🎨 COLOR

| Servicio | Descripción | Precio | Duración |
|----------|-------------|--------|----------|
| **PLATINADO** | Incluye asesoría, tratamiento de decoloración, tintura del cabello para lograr llegar al color deseado con productos de alta calidad. | **$50,000 CLP** | 4 hr |
| **VISOS** | Realización de destellos de color en el cabello para llevar un look moderno. | **$30,000 CLP** | 3 hr |

---

## 🔧 INSTRUCCIONES PARA APLICAR LOS CAMBIOS

### Opción 1: Ejecutar SQL en Supabase (RECOMENDADO)

1. **Ir a Supabase Dashboard:**
   - URL: https://supabase.com/dashboard
   - Proyecto: Chamos Barber

2. **Abrir SQL Editor:**
   - Click en "SQL Editor" en el menú lateral
   - Click en "New query"

3. **Copiar y Ejecutar el Script:**
   - Abrir el archivo: `UPDATE_SERVICIOS.sql`
   - Copiar TODO el contenido
   - Pegar en el SQL Editor de Supabase
   - Click en **"Run"** o presionar `Ctrl+Enter`

4. **Verificar Resultados:**
   - Al final del script se ejecutará una consulta SELECT
   - Deberías ver **7 servicios activos**
   - Todos los servicios antiguos estarán desactivados (activo = false)

---

### Opción 2: Actualizar desde el Panel Admin (Manual)

1. **Acceder al Panel Admin:**
   - URL: https://chamosbarber.com/admin
   - Login con credenciales de administrador

2. **Ir a la pestaña "Servicios"**

3. **Desactivar servicios antiguos:**
   - Para cada servicio que no esté en la lista nueva
   - Click en "Editar"
   - Desmarcar "Activo"
   - Guardar

4. **Crear/Actualizar cada servicio:**
   - Click en "Crear Servicio" para nuevos
   - O "Editar" para actualizar existentes
   - Ingresar datos según la tabla de arriba

---

## ⚠️ NOTAS IMPORTANTES

### Categorías Correctas

Asegúrate de usar estas categorías EXACTAS:
- `Corte de Cabello`
- `Barba`
- `Corte + Barba`
- `Color`

### Conversión de Duración

- **15 min** = 15 minutos
- **30 min** = 30 minutos
- **1 hr** = 60 minutos
- **3 hr** = 180 minutos
- **4 hr** = 240 minutos

### Formato de Precios

- Todos los precios están en **CLP (Pesos Chilenos)**
- En la base de datos se guardan como números enteros: `8000`, `10000`, etc.
- NO incluir puntos ni símbolos: ❌ `$8.000` ✅ `8000`

---

## 📧 INFORMACIÓN DE CONTACTO ACTUALIZADA

**Email:** contacto@chamosbarber.com

Este email ya está actualizado en:
- ✅ Footer del sitio web
- ✅ Políticas de Privacidad
- ✅ Términos y Condiciones

**Redes Sociales:**
- 📘 Facebook: https://web.facebook.com/people/Chamos-Barberia/61553216854694/
- 📸 Instagram: https://www.instagram.com/chamosbarber_shop/?hl=es-la
- ✅ Información de contacto

---

## ✅ VERIFICACIÓN POST-ACTUALIZACIÓN

Después de ejecutar el script SQL, verifica:

1. **Panel Admin → Pestaña Servicios:**
   - Debe mostrar **7 servicios activos**
   - Nombres, precios y duraciones correctos

2. **Página de Reservas (Cliente):**
   - Los clientes deben ver solo los 7 servicios nuevos
   - Precios actualizados correctamente
   - Duraciones correctas

3. **Sistema POS:**
   - Al crear una nueva venta
   - Debe mostrar solo los servicios activos
   - Precios actualizados

---

## 🚀 SIGUIENTE PASO: DEPLOY

Una vez ejecutado el script SQL en Supabase:

1. **NO es necesario redesplegar la aplicación**
2. Los cambios en la base de datos se reflejan **inmediatamente**
3. Refrescar la página del Admin Panel para ver los cambios
4. Refrescar la página de Reservas para que los clientes vean los nuevos servicios

---

## 🔍 SCRIPT SQL INCLUIDO

El archivo `UPDATE_SERVICIOS.sql` incluye:

✅ Desactivación de servicios antiguos  
✅ Inserción/actualización de 7 servicios nuevos  
✅ Manejo de conflictos (ON CONFLICT DO UPDATE)  
✅ Consulta de verificación al final  
✅ Formato correcto para categorías y precios  

---

## 📊 COMPARACIÓN ANTES/DESPUÉS

### ❌ SERVICIOS ANTIGUOS (Ejemplos)
- Cortes Clásicos
- Afeitado Premium
- Estilo Moderno
- Tratamientos
- (Precios y descripciones desactualizados)

### ✅ SERVICIOS NUEVOS (Actualizados)
- **7 servicios** con precios oficiales
- Descripciones detalladas y profesionales
- Duraciones específicas
- Categorías bien organizadas

---

## 💡 RECOMENDACIONES

1. **Backup antes de ejecutar:**
   ```sql
   -- Hacer backup de servicios actuales
   SELECT * FROM public.servicios;
   ```

2. **Ejecutar en horario de bajo tráfico:**
   - Preferiblemente en horario no comercial
   - O informar al equipo

3. **Probar después de actualizar:**
   - Crear una cita de prueba
   - Verificar que los precios se calculen correctamente
   - Probar el sistema POS

---

## 🆘 SOPORTE

Si tienes problemas al ejecutar el script:

1. Verifica que tengas permisos de escritura en la tabla `servicios`
2. Revisa los logs de error en Supabase
3. Contacta al equipo de desarrollo

---

**Fecha de Actualización:** 2025-12-15  
**Versión:** 1.0  
**Ejecutado por:** Sistema de Actualización Automatizado
