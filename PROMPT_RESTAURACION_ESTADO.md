# 🔄 PROMPT DE RESTAURACIÓN - Chamos Barber

**Versión:** 1.0.0  
**Fecha:** 2025-11-06  
**Commit Estable:** `9ecf4a0`  
**Branch:** `master`

---

## 📋 USO DE ESTE PROMPT

Este documento contiene un prompt completo que puedes copiar y pegar en una nueva conversación con Claude/IA para restaurar el sistema al estado funcional actual.

### Cuándo Usar Este Prompt:

- ✅ Cuando algo se rompa en el futuro
- ✅ Cuando necesites restaurar funcionalidad perdida
- ✅ Cuando quieras replicar este estado en otro proyecto
- ✅ Cuando necesites recordar cómo está configurado el sistema
- ✅ Como backup de conocimiento del estado actual

---

## 🎯 PROMPT DE RESTAURACIÓN COMPLETO

**COPIA TODO LO QUE ESTÁ ENTRE LAS LÍNEAS DE "===START===" Y "===END==="**

```
===START PROMPT DE RESTAURACIÓN===

# CONTEXTO: Restauración del Sistema Chamos Barber

Necesito que me ayudes a restaurar o verificar el estado funcional del sistema de reservas de barbería "Chamos Barber" que está desplegado en Coolify.

## 📊 ESTADO OBJETIVO (FUNCIONAL)

**Commit de Referencia:** `9ecf4a0`  
**Branch:** `master`  
**Fecha del Estado:** 2025-11-06  
**Repositorio:** `/home/user/webapp`

## 🎯 FUNCIONALIDADES QUE DEBEN ESTAR OPERATIVAS

### 1. Sistema de Reservas (Público)
- Creación de citas funcionando
- Validación de 10 citas pendientes máximo por teléfono
- Verificación de disponibilidad de horarios
- Selección de barbero y servicio
- Formulario de datos del cliente

### 2. Sistema de Consulta (Público)
- Consulta por número telefónico funcionando
- Dashboard con estadísticas (Total, Pendientes, Disponibles)
- Fotos de barberos en tarjetas de citas (100x100px circulares)
- Especialidades de barberos mostradas
- Mensaje de agradecimiento: "¡Gracias por confiar en Chamos Barber!"
- Advertencia cuando se acerca al límite de 10 citas
- Separación entre citas próximas e historial

### 3. Panel de Administración
- Login funcional para admin@chamosbarber.com
- Gestión de citas, barberos, servicios, horarios
- Dashboard con métricas

### 4. Panel de Barbero
- Login funcional para barberos
- Vista de citas propias (filtradas por barbero_id)
- Actualización de estado de citas

## 🔧 ARQUITECTURA TÉCNICA CLAVE

### Backend - APIs que Deben Usar SERVICE_ROLE_KEY

**Archivo:** `src/pages/api/crear-cita.ts`
```typescript
// Debe usar SERVICE_ROLE_KEY para bypass de RLS
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Validación de límite de 10 citas
const { data: citasPendientesTelefono } = await supabase
  .from('citas')
  .select('id')
  .eq('cliente_telefono', citaData.cliente_telefono)
  .in('estado', ['pendiente', 'confirmada'])

if (citasPendientesTelefono && citasPendientesTelefono.length >= 10) {
  return res.status(400).json({ 
    error: '⚠️ Has alcanzado el límite máximo de 10 citas pendientes...',
    code: 'LIMITE_CITAS_ALCANZADO'
  })
}

// Logging comprehensivo
console.log('🔵 [crear-cita] Request received')
console.log('✅ [crear-cita] Supabase client created')
console.log('💾 [crear-cita] Inserting appointment...')
```

**Archivo:** `src/pages/api/consultar-citas.ts`
```typescript
// CRÍTICO: Debe usar SERVICE_ROLE_KEY (NO ANON_KEY)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Query con JOIN para fotos y especialidades
const { data: citas } = await supabase
  .from('citas')
  .select(`
    id, fecha, hora, estado, notas,
    servicios (nombre, precio),
    barberos (
      nombre,
      apellido,
      imagen_url,      // REQUERIDO para fotos
      especialidad     // REQUERIDO para especialidades
    )
  `)
  .eq('cliente_telefono', telefono)

// Contador de citas pendientes
const citasPendientes = citas.filter(
  (cita: any) => cita.estado === 'pendiente' || cita.estado === 'confirmada'
).length

// Respuesta con estadísticas
return res.status(200).json({ 
  citas: mappedCitas,
  total_citas: citas.length,
  citas_pendientes: citasPendientes
})

// Logging comprehensivo
console.log('🔵 [consultar-citas] Request received')
console.log('✅ [consultar-citas] Query successful, results:', count)
```

### Frontend - Página de Consulta

**Archivo:** `src/pages/consultar.tsx` (510 líneas)

**Interfaces Requeridas:**
```typescript
interface Cita {
  id: string
  servicio_nombre: string
  barbero_nombre: string
  barbero_imagen?: string | null       // Para fotos
  barbero_especialidad?: string | null // Para especialidades
  fecha: string
  hora: string
  estado: string
  notas?: string
  precio?: number
}

interface ConsultarResponse {
  citas: Cita[]
  total_citas: number        // Para estadísticas
  citas_pendientes: number   // Para estadísticas
}
```

**Estado Requerido:**
```typescript
const [citas, setCitas] = useState<Cita[]>([])
const [totalCitas, setTotalCitas] = useState(0)
const [citasPendientes, setCitasPendientes] = useState(0)
const [loading, setLoading] = useState(false)
const [searched, setSearched] = useState(false)
```

**Componentes UI Clave:**

1. Banner de Bienvenida con Estadísticas:
```tsx
<div style={{ 
  background: 'linear-gradient(135deg, var(--accent-color) 0%, #c89d3c 100%)',
  borderRadius: 'var(--border-radius)',
  padding: '2rem',
  textAlign: 'center'
}}>
  <h2>¡Gracias por confiar en Chamos Barber!</h2>
  
  {/* Tres tarjetas de estadísticas */}
  <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
    <div>{totalCitas} Total de Citas</div>
    <div>{citasPendientes} Citas Pendientes</div>
    <div>{10 - citasPendientes} Cupos Disponibles</div>
  </div>
  
  {/* Advertencia cuando ≥8 citas */}
  {citasPendientes >= 8 && (
    <div style={{ background: 'rgba(255, 0, 0, 0.2)' }}>
      ⚠️ Estás cerca del límite de {citasPendientes}/10 citas
    </div>
  )}
</div>
```

2. Tarjeta de Perfil del Barbero:
```tsx
{cita.barbero_imagen && (
  <div style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem' }}>
    {/* Foto circular 100x100 */}
    <img 
      src={cita.barbero_imagen}
      alt={cita.barbero_nombre}
      style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        border: '3px solid var(--accent-color)',
        objectFit: 'cover'
      }}
    />
    
    <div>
      <h4>Tu barbero: {cita.barbero_nombre}</h4>
      {cita.barbero_especialidad && (
        <p>⭐ {cita.barbero_especialidad}</p>
      )}
      <p>¡Estamos emocionados de atenderte!</p>
    </div>
  </div>
)}
```

**Logging en Frontend:**
```typescript
console.log('📤 [consultar] Enviando solicitud para teléfono:', telefono)
console.log('📥 [consultar] Respuesta recibida:', response.status)
console.log('📋 [consultar] Datos recibidos:', data)
console.log('📊 [consultar] Total citas:', data.total_citas)
```

## ⚙️ CONFIGURACIÓN REQUERIDA

### Variables de Entorno (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGci...
SUPABASE_JWT_SECRET=2O3K1P4dP4SxFjWBXye61DojrD3JVKo3
NODE_ENV=production
PORT=3000
```

### Supabase - Tabla `barberos`
```sql
-- Campos requeridos
ALTER TABLE barberos ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE barberos ADD COLUMN IF NOT EXISTS especialidad TEXT NOT NULL 
  DEFAULT 'Barbero profesional';

-- Verificar que barberos tengan fotos
SELECT id, nombre, apellido, especialidad, imagen_url, activo
FROM barberos WHERE activo = true;

-- Debe haber 4 barberos con fotos y especialidades
```

## 🔍 VERIFICACIÓN DEL ESTADO

### Checklist de Verificación:

```
[ ] Crear cita funciona sin errores
[ ] Consulta muestra dashboard con 3 tarjetas de estadísticas
[ ] Fotos de barberos aparecen (100x100px circulares)
[ ] Especialidades de barberos visibles
[ ] Mensaje "¡Gracias por confiar en Chamos Barber!" presente
[ ] Advertencia de límite aparece cuando ≥8 citas
[ ] Al intentar crear cita #11 con mismo teléfono, muestra error de límite
[ ] Logs en consola muestran emojis: 🔵 📤 📥 ✅ etc.
[ ] Panel /admin accesible
[ ] Panel /barbero-panel accesible
```

### Comandos de Verificación:

```bash
# Verificar commit actual
cd /home/user/webapp && git log --oneline -5

# Debe mostrar:
# 9ecf4a0 docs: Add comprehensive guide for empty consultation results fix
# bc47765 fix: Use SERVICE_ROLE_KEY in consultar-citas API to bypass RLS
# ...

# Ver archivos modificados
git show 9ecf4a0 --name-only

# Debe incluir:
# src/pages/api/consultar-citas.ts
# src/pages/consultar.tsx
```

### SQL de Verificación en Supabase:

```sql
-- Verificar barberos con fotos
SELECT COUNT(*) as barberos_con_foto
FROM barberos 
WHERE activo = true AND imagen_url IS NOT NULL;
-- Debe retornar: 4

-- Verificar estructura de citas
SELECT COUNT(*) as total_citas,
       COUNT(*) FILTER (WHERE estado IN ('pendiente', 'confirmada')) as pendientes
FROM citas 
WHERE cliente_telefono = '+56984568747';
-- Debe retornar: total_citas: 20, pendientes: 11
```

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Problema: Consulta devuelve array vacío

**Causa:** API usando ANON_KEY en vez de SERVICE_ROLE_KEY

**Solución:**
```typescript
// En src/pages/api/consultar-citas.ts
// INCORRECTO:
import { supabase } from '../../../lib/initSupabase'

// CORRECTO:
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Problema: Bad Gateway al crear citas

**Solución:** Verificar variables de entorno en Coolify y agregar logging

### Problema: Fotos de barberos no aparecen

**Solución:** 
1. Verificar campo `imagen_url` en tabla barberos
2. Verificar que API hace JOIN correcto
3. Verificar que frontend recibe `barbero_imagen`

## 📞 CREDENCIALES DE ACCESO

### Admin:
```
Email: admin@chamosbarber.com
Password: ChamosAdmin2024!
URL: https://chamosbarber.com/admin
```

### Barberos (todos usan misma contraseña):
```
Password: Temporal123!
Emails: 
  - carlos@chamosbarber.com
  - miguel@chamosbarber.com
  - andres@chamosbarber.com
  - diego@chamosbarber.com
URL: https://chamosbarber.com/barbero-panel
```

### Teléfono de Prueba:
```
+56984568747 (tiene 20 citas, 11 pendientes)
```

## 📁 ARCHIVOS CRÍTICOS

```
src/pages/api/crear-cita.ts          - Creación con validación de límite
src/pages/api/consultar-citas.ts     - Consulta con SERVICE_ROLE_KEY
src/pages/consultar.tsx              - 510 líneas con UX mejorada
src/pages/reservar.tsx               - Con logging mejorado
lib/database.types.ts                - Tipos de Supabase
.env.local                           - Variables de entorno
```

## 📚 DOCUMENTACIÓN DE REFERENCIA

Archivos de documentación que explican el estado actual:

```
HISTORIAL_PROBLEMAS_RESUELTOS.md    - Este resumen completo
MEJORAS_UX_CONSULTAR_CITAS.md       - Documentación técnica de UX
SOLUCION_CONSULTAR_VACIO.md         - Fix de consulta vacía
TROUBLESHOOTING_BAD_GATEWAY.md      - Troubleshooting de errors
CONFIGURACION_SUPABASE.md            - Configuración de BD
CREDENCIALES-ADMIN.md                - Credenciales completas
docs/testing/CREDENCIALES_PRUEBA.md  - Credenciales de barberos
```

## 🎯 TAREA PRINCIPAL

Por favor:

1. **Verificar el estado actual del sistema**
   - Revisar los archivos clave mencionados
   - Verificar que usan SERVICE_ROLE_KEY
   - Verificar que tienen logging comprehensivo

2. **Si algo no funciona, restaurar a este estado**
   - Checkout al commit 9ecf4a0 si es necesario
   - Verificar variables de entorno en Coolify
   - Verificar datos en Supabase

3. **Ejecutar las pruebas de verificación**
   - Crear cita
   - Consultar citas
   - Verificar dashboard de estadísticas
   - Verificar fotos de barberos

4. **Reportar el estado actual**
   - ¿Todo funciona como se describe?
   - ¿Qué está roto?
   - ¿Qué necesita ser restaurado?

5. **Si necesitas restaurar archivos específicos:**
   - Puedo proveerte el contenido exacto de cualquier archivo
   - Usa el commit 9ecf4a0 como referencia
   - Consulta HISTORIAL_PROBLEMAS_RESUELTOS.md para detalles

## 📊 RESULTADO ESPERADO

Después de restaurar, el sistema debe:

✅ Crear citas sin errores  
✅ Consultar citas mostrando dashboard completo  
✅ Mostrar fotos de barberos (100x100px circulares)  
✅ Mostrar especialidades  
✅ Mostrar mensaje de agradecimiento  
✅ Validar límite de 10 citas  
✅ Mostrar advertencia cuando ≥8 citas  
✅ Tener logging comprehensivo en APIs  
✅ Panel admin y barbero accesibles

## 🔧 COMANDOS ÚTILES

```bash
# Ver estado actual
cd /home/user/webapp
git status
git log --oneline -10

# Volver al commit estable
git checkout 9ecf4a0

# Ver contenido de archivo específico en commit estable
git show 9ecf4a0:src/pages/api/consultar-citas.ts

# Ver logs de Coolify
docker logs -f <container-name> | grep "\[crear-cita\]"
docker logs -f <container-name> | grep "\[consultar-citas\]"

# Verificar en Supabase
SELECT * FROM barberos WHERE activo = true;
SELECT COUNT(*) FROM citas WHERE cliente_telefono = '+56984568747';
```

## 💡 NOTAS ADICIONALES

- **Stack:** Next.js 14.0.4, TypeScript, Supabase self-hosted, Coolify
- **Deploy:** Producción en https://chamosbarber.com
- **Repo:** https://github.com/juan135072/chamos-barber-app
- **Working Dir:** /home/user/webapp

**IMPORTANTE:** Este sistema está 100% funcional en el commit 9ecf4a0. Si algo no funciona después de restaurar, revisar:
1. Variables de entorno en Coolify
2. Datos en Supabase (barberos con fotos)
3. Cache del navegador (hard refresh con Ctrl+Shift+R)
4. Logs de Coolify para errores

===END PROMPT DE RESTAURACIÓN===
```

---

## 📝 INSTRUCCIONES DE USO

### Paso 1: Copiar el Prompt

Copia TODO el texto entre `===START PROMPT===` y `===END PROMPT===`

### Paso 2: Iniciar Nueva Conversación

Abre una nueva conversación con Claude o tu IA preferida.

### Paso 3: Pegar el Prompt

Pega el prompt completo en la conversación.

### Paso 4: Esperar Análisis

La IA analizará el estado actual del sistema y te dirá:
- ✅ Qué está funcionando
- ❌ Qué está roto
- 🔧 Qué necesita ser restaurado
- 📋 Pasos específicos para restaurar

### Paso 5: Seguir Instrucciones

Sigue las instrucciones específicas que la IA te proporcione para restaurar el estado funcional.

---

## 🎯 CASOS DE USO

### Caso 1: Sistema Completamente Roto

```
1. Copiar prompt completo
2. Pegar en nueva conversación
3. IA detectará qué falta
4. IA restaurará archivos necesarios
5. Verificar con checklist
```

### Caso 2: Feature Específica Rota (ej: Consulta no funciona)

```
1. Copiar prompt completo
2. Agregar al inicio: "La consulta de citas no funciona, devuelve array vacío"
3. IA identificará el problema (probablemente ANON_KEY vs SERVICE_ROLE_KEY)
4. IA proveerá fix específico
5. Aplicar y verificar
```

### Caso 3: Nuevo Desarrollador

```
1. Copiar prompt completo
2. Agregar al inicio: "Soy nuevo en este proyecto, ayúdame a entender el estado actual"
3. IA explicará arquitectura y estado actual
4. Proveerá tour del código
5. Explicará cómo hacer cambios seguros
```

### Caso 4: Replicar en Otro Proyecto

```
1. Copiar prompt completo
2. Agregar: "Quiero replicar este sistema en un nuevo proyecto"
3. IA proveerá:
   - Lista de archivos a crear
   - Configuración necesaria
   - Pasos de setup
   - Verificación
```

---

## 🔍 VERIFICACIÓN DEL PROMPT

Para verificar que el prompt funciona correctamente:

### Test 1: Restauración Completa

1. Haz un backup del proyecto actual
2. Rompe algo intencionalmente (ej: cambiar SERVICE_ROLE_KEY por ANON_KEY en consultar-citas.ts)
3. Usa el prompt para restaurar
4. Verifica que funciona nuevamente

### Test 2: Nueva Sesión

1. Abre una nueva sesión de IA
2. Pega el prompt
3. Verifica que la IA:
   - Entiende el estado objetivo
   - Puede verificar archivos
   - Puede identificar diferencias
   - Puede proveer soluciones

### Test 3: Consulta Específica

1. Pregunta sobre una feature específica:
   ```
   <prompt completo>
   
   Pregunta adicional: ¿Cómo funciona exactamente el límite de 10 citas?
   ```
2. Verifica que la IA explica correctamente basándose en el prompt

---

## 📋 CHECKLIST DE MANTENIMIENTO DEL PROMPT

Este prompt debe actualizarse cuando:

- [ ] Se agrega una nueva funcionalidad importante
- [ ] Se modifica la arquitectura (ej: cambio de base de datos)
- [ ] Se cambia la configuración de despliegue
- [ ] Se identifican nuevos problemas comunes
- [ ] Se actualizan credenciales o URLs
- [ ] Se crean nuevos archivos críticos
- [ ] Se modifican interfaces TypeScript importantes

### Cómo Actualizar:

1. Abrir este archivo: `PROMPT_RESTAURACION_ESTADO.md`
2. Actualizar la sección correspondiente dentro del prompt
3. Actualizar el número de versión en la parte superior
4. Actualizar la fecha de última modificación
5. Hacer commit con mensaje descriptivo
6. Probar el prompt actualizado

---

## 🚀 MEJORAS FUTURAS DEL PROMPT

### Versión 1.1 (Planeada)
- [ ] Agregar sección de "Errores Comunes y Sus Fixes"
- [ ] Incluir código SQL para popular datos de prueba
- [ ] Agregar diagrama de arquitectura en ASCII
- [ ] Incluir ejemplos de respuestas esperadas de API

### Versión 1.2 (Planeada)
- [ ] Agregar tests automatizados que se pueden ejecutar
- [ ] Incluir scripts de verificación
- [ ] Agregar troubleshooting paso a paso
- [ ] Incluir comparación visual (antes/después)

---

## 💾 BACKUP DEL ESTADO ACTUAL

### Información de Commit

```bash
# Commit de estado estable
Commit: 9ecf4a0
Branch: master
Date: 2025-11-06
Message: "docs: Add comprehensive guide for empty consultation results fix"

# Para crear un tag de este estado:
git tag -a v1.0.0-stable-ux 9ecf4a0 -m "Estado estable con todas las UX mejoras funcionando"
git push origin v1.0.0-stable-ux
```

### Archivos Clave para Backup

Si quieres hacer un backup manual adicional:

```bash
# Crear directorio de backup
mkdir -p /home/user/webapp-backup-2025-11-06

# Copiar archivos críticos
cp -r /home/user/webapp/src/pages/api/ /home/user/webapp-backup-2025-11-06/
cp /home/user/webapp/src/pages/consultar.tsx /home/user/webapp-backup-2025-11-06/
cp /home/user/webapp/src/pages/reservar.tsx /home/user/webapp-backup-2025-11-06/
cp /home/user/webapp/.env.local /home/user/webapp-backup-2025-11-06/
cp -r /home/user/webapp/*.md /home/user/webapp-backup-2025-11-06/

# Crear tar.gz
cd /home/user
tar -czf webapp-backup-2025-11-06.tar.gz webapp-backup-2025-11-06/
```

---

## 📞 CONTACTO Y SOPORTE

### Para Usar Este Prompt:

- **IA Recomendada:** Claude 3.5 Sonnet, GPT-4, o superior
- **Contexto Necesario:** Full context window (100K+ tokens recomendado)
- **Archivos Adjuntos:** Adjunta `HISTORIAL_PROBLEMAS_RESUELTOS.md` si está disponible

### Si el Prompt No Funciona:

1. Verifica que copiaste TODO el texto entre ===START=== y ===END===
2. Asegúrate de usar una IA con suficiente contexto
3. Intenta dividir en pasos más pequeños si es muy largo
4. Consulta `HISTORIAL_PROBLEMAS_RESUELTOS.md` directamente

---

## 🎉 ÉXITO ESPERADO

Después de usar este prompt, deberías poder:

✅ Restaurar el sistema completo desde cero  
✅ Identificar qué está roto específicamente  
✅ Obtener código exacto para restaurar  
✅ Entender cómo funciona cada parte  
✅ Verificar que todo funciona correctamente  
✅ Hacer debugging con logging comprehensivo  
✅ Replicar el sistema en otro ambiente

---

**NOTA FINAL:** Este prompt representa miles de líneas de código y docenas de horas de trabajo. Guárdalo en un lugar seguro y actualízalo cuando hagas cambios importantes al sistema.

---

**Versión:** 1.0.0  
**Última Actualización:** 2025-11-06  
**Autor:** GenSpark AI Developer  
**Commit de Referencia:** 9ecf4a0
