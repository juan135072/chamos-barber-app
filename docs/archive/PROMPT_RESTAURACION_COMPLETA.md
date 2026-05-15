# 🔄 PROMPT DE RESTAURACIÓN COMPLETA
## Sistema de Reservas Barbería - Estado Funcional Completo

**Propósito**: Este documento contiene el prompt exacto para restaurar el sistema a su estado funcional actual en caso de problemas futuros.

**Fecha del Estado**: 6 de Noviembre, 2025  
**Versión**: 1.5.0  
**Commit de Referencia**: `feat: sistema completo con reservas, tema oscuro, fotos y configuración de Storage`

---

## 📋 PROMPT PARA IA (COPIAR Y PEGAR)

```
# CONTEXTO DEL PROYECTO

Estoy trabajando en un sistema de reservas para barbería llamado "Chamosbarbershop" desarrollado con:
- **Frontend**: Next.js 14 con TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Coolify
- **Tema**: Oscuro con colores dorado (#D4AF37), negro (#121212, #1A1A1A)
- **Estado Actual**: FUNCIONAL Y EN PRODUCCIÓN

El proyecto está ubicado en `/home/user/webapp` y el branch principal es `master`.

---

## ESTADO FUNCIONAL ACTUAL

### ✅ Funcionalidades Operativas:

1. **Sistema de Autenticación**:
   - Login de clientes, barberos y admin
   - Registro de clientes con validación
   - Registro de barberos con upload de foto de perfil

2. **Sistema de Reservas**:
   - Página pública "Consultar Citas" para ver disponibilidad sin login
   - Sistema completo de reserva con validación en tiempo real
   - Gestión de citas con estados (pendiente, confirmada, cancelada, completada)

3. **Panel de Administración**:
   - Dashboard con métricas
   - CRUD de barberos (con upload de fotos)
   - CRUD de servicios
   - Gestión de citas y usuarios
   - Configuración de horarios

4. **Panel de Barbero**:
   - **2 Tabs activos**: "Mi Perfil" y "Mis Citas" (Portfolio fue ELIMINADO)
   - Upload de foto de perfil con drag & drop
   - Vista de agenda personal con estadísticas
   - Filtros por estado y fecha
   - Cambio de estado de citas

5. **Sistema de Fotos (Supabase Storage)**:
   - Bucket: `barberos-fotos` (público)
   - Upload en 3 ubicaciones: registro, admin panel, barbero panel
   - Validación: JPG, PNG, WEBP, GIF, máx 5MB
   - Preview circular (120px)
   - Eliminación automática de foto anterior

6. **Tema Visual**:
   - Tema oscuro unificado en toda la aplicación
   - Variables CSS en `src/styles/globals.css`
   - Consistencia en login, admin, barbero panel y formularios

---

## ESTRUCTURA CLAVE DEL PROYECTO

### Archivos Críticos:

**1. lib/supabase-helpers.ts**
- Exporta objeto `chamosSupabase` (NO `supabaseHelpers`)
- Funciones principales:
  - `uploadBarberoFoto(file: File, barberoId: string)`: Sube foto a bucket
  - `deleteBarberoFoto(filePath: string)`: Elimina foto del bucket
  - Otras funciones de autenticación y gestión

**IMPORTANTE**: Siempre importar como:
```typescript
import { chamosSupabase } from '../../lib/supabase-helpers'
```

**2. src/pages/barbero-panel.tsx**
- Estados clave:
  - `activeTab: 'perfil' | 'citas'` (solo 2 opciones, sin portfolio)
  - `selectedFile: File | null`
  - `imagePreview: string | null`
  - `uploadingImage: boolean`
- Funciones:
  - `handleFileSelect`: Valida tipo y tamaño, crea preview
  - `handleClearImage`: Limpia selección
  - `handleUpdateProfile`: Actualiza perfil con nueva foto (elimina anterior, sube nueva, actualiza DB)
- UI: Drag & drop area, preview circular, validaciones visuales

**3. src/components/barbero/CitasSection.tsx**
- Stats cards con tema oscuro y overlays de color
- Filtros por estado y fecha
- Lista de citas con cambio de estado inline
- Todos los estilos usan variables CSS: `var(--bg-secondary)`, `var(--accent-color)`, etc.

**4. src/styles/globals.css**
- Variables CSS del tema:
  - `--bg-primary: #121212`
  - `--bg-secondary: #1A1A1A`
  - `--accent-color: #D4AF37`
  - `--border-color: #333`
  - `--text-primary: #E0E0E0`

**5. supabase/setup-storage-barberos-fotos.sql**
- Script SQL para crear bucket y políticas RLS
- Debe ejecutarse en Supabase SQL Editor

---

## BASE DE DATOS (SUPABASE)

### Tablas Principales:
- `usuarios` (id, email, nombre, apellido, telefono, role, activo)
- `barberos` (id, user_id, nombre, apellido, telefono, instagram, descripcion, imagen_url, activo)
- `servicios` (id, nombre, descripcion, duracion_minutos, precio, categoria, activo)
- `reservas` (id, cliente_id, barbero_id, servicio_id, fecha_hora, estado, notas)
- `horarios_atencion` (id, barbero_id, dia_semana, hora_inicio, hora_fin, activo)
- `horarios_bloqueados` (id, barbero_id, fecha_hora_inicio, fecha_hora_fin, motivo, activo)

### Supabase Storage:
- **Bucket**: `barberos-fotos`
- **Configuración**: Público, 5MB límite, tipos: JPG, PNG, WEBP, GIF
- **RLS Policies**: 
  - SELECT: público
  - INSERT, UPDATE, DELETE: autenticado

---

## PROBLEMAS CONOCIDOS Y SOLUCIONES

### 1. Error: "Module has no exported member 'supabaseHelpers'"
**Causa**: Import incorrecto  
**Solución**: Usar `import { chamosSupabase }` no `import { supabaseHelpers }`

### 2. Error: "Bucket barberos-fotos does not exist"
**Causa**: Bucket no creado en Supabase  
**Solución**: Ejecutar `supabase/setup-storage-barberos-fotos.sql` en Supabase Dashboard → SQL Editor

### 3. No se ven las fotos
**Causa**: Bucket no es público o faltan políticas  
**Solución**:
```sql
UPDATE storage.buckets SET public = true WHERE id = 'barberos-fotos';
SELECT * FROM storage.policies WHERE bucket_id = 'barberos-fotos';
```

### 4. Citas no cargan en panel barbero
**Causa**: RLS policies o barbero_id null  
**Solución**: Verificar que el usuario tiene role='barbero' y existe registro en tabla barberos con user_id correcto

---

## CONFIGURACIÓN DE ENTORNO

### Variables (.env.local):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=https://chamosbarbershop.cl
```

---

## DEPLOYMENT (COOLIFY)

- **Branch**: `master` (auto-deploy activado)
- **Build**: `npm run build`
- **Start**: `npm start`
- **Port**: 3000
- **Variables de entorno**: Configuradas en panel de Coolify

---

## ÚLTIMO CAMBIO CRÍTICO

**Fecha**: 6 de Noviembre, 2025  
**Problema**: TypeScript build error: `Module '"../../lib/supabase-helpers"' has no exported member 'supabaseHelpers'`  
**Solución Aplicada**:
- Archivo: `src/pages/barbero-panel.tsx`, línea 7
- Cambio: `import { supabaseHelpers }` → `import { chamosSupabase }`
- Actualizadas 2 llamadas a funciones: `supabaseHelpers.uploadBarberoFoto` → `chamosSupabase.uploadBarberoFoto`
- Estado: ✅ Corregido y pusheado a master

---

## TAREAS A REALIZAR

Por favor, ayúdame con lo siguiente:

[AQUÍ ESPECIFICA TU PROBLEMA O TAREA]

Ejemplo:
- "El sistema no está cargando las citas en el panel barbero"
- "Necesito agregar una nueva funcionalidad X"
- "Hay un error en el build de producción"
- "Quiero modificar el tema de colores"

---

## DOCUMENTACIÓN DISPONIBLE

En el directorio raíz (`/home/user/webapp`) encontrarás:
- `DOCUMENTACION_ESTADO_ACTUAL_COMPLETO.md` - Estado completo del sistema
- `GUIA_CONFIGURACION_SUPABASE_STORAGE.md` - Configuración de Storage
- `CONFIGURACION_SUPABASE.md` - Configuración general de Supabase
- `HISTORIAL_PROBLEMAS_RESUELTOS.md` - Problemas y soluciones anteriores
- `CREDENCIALES-ADMIN.md` - Credenciales de administrador
- Otros 40+ archivos de documentación específica

---

## VERIFICACIONES INICIALES REQUERIDAS

Antes de empezar, por favor ejecuta:

1. **Verificar directorio de trabajo**:
```bash
cd /home/user/webapp && pwd
```

2. **Verificar estado de git**:
```bash
cd /home/user/webapp && git status
cd /home/user/webapp && git log -1 --oneline
```

3. **Verificar archivos clave existen**:
```bash
cd /home/user/webapp && ls -la src/pages/barbero-panel.tsx
cd /home/user/webapp && ls -la lib/supabase-helpers.ts
cd /home/user/webapp && ls -la src/components/barbero/CitasSection.tsx
```

4. **Verificar que el proyecto compila**:
```bash
cd /home/user/webapp && npm run build
```

---

## WORKFLOW DE GIT

**IMPORTANTE**: Seguir estrictamente estas reglas:
1. Después de CUALQUIER cambio en código: hacer commit inmediato
2. Antes de crear/actualizar PR: fetch y merge cambios remotos
3. Resolver conflictos priorizando código remoto (a menos que cambios locales sean críticos)
4. Squash todos los commits locales en uno solo antes de PR
5. Siempre proporcionar el link del PR al usuario

---

## EXPECTATIVA DE RESPUESTA

Espero que:
1. Leas y comprendas el estado actual del sistema
2. Verifiques la estructura del proyecto
3. Ejecutes las verificaciones iniciales
4. Me informes de cualquier inconsistencia encontrada
5. Procedas con la tarea solicitada manteniendo la integridad del sistema
6. Documentes cualquier cambio realizado
7. Sigas el workflow de git rigurosamente

---

## INFORMACIÓN ADICIONAL

- **Última sesión de trabajo**: 6 de Noviembre, 2025
- **Última funcionalidad agregada**: Upload de foto en perfil barbero + eliminación de tab Portfolio
- **Último fix**: Corrección de import `chamosSupabase`
- **Estado del deploy**: ✅ Build exitoso esperado
- **Supabase Storage**: ⚠️ Usuario debe ejecutar SQL script si no está configurado

```

---

## 🎯 CASOS DE USO DEL PROMPT

### Caso 1: Sistema Roto / Error Crítico
```
[Pegar el PROMPT completo arriba]

TAREAS A REALIZAR:
El sistema está mostrando error 500 en producción. Necesito:
1. Identificar la causa del error
2. Revisar logs de Coolify/Supabase
3. Aplicar fix urgente
4. Verificar que todo vuelva a funcionar
```

### Caso 2: Pérdida de Contexto
```
[Pegar el PROMPT completo arriba]

TAREAS A REALIZAR:
Estoy retomando el proyecto después de varios días. Necesito:
1. Verificar que todo sigue funcionando
2. Revisar el último estado del código
3. Confirmar que el deployment está activo
4. Preparar para continuar con nuevas funcionalidades
```

### Caso 3: Nueva IA / Nuevo Desarrollador
```
[Pegar el PROMPT completo arriba]

TAREAS A REALIZAR:
Soy un nuevo desarrollador/IA trabajando en este proyecto. Necesito:
1. Entender la arquitectura completa
2. Verificar acceso a todas las herramientas
3. Confirmar que puedo hacer builds locales
4. Familiarizarme con el flujo de trabajo
```

### Caso 4: Despliegue Fallido
```
[Pegar el PROMPT completo arriba]

TAREAS A REALIZAR:
El último deploy en Coolify falló. Necesito:
1. Revisar los logs de error
2. Identificar si es problema de build, runtime o configuración
3. Aplicar fix correspondiente
4. Hacer redeploy y verificar éxito
```

### Caso 5: Problema de Storage
```
[Pegar el PROMPT completo arriba]

TAREAS A REALIZAR:
Las fotos de los barberos no se están guardando/mostrando. Necesito:
1. Verificar que el bucket 'barberos-fotos' existe
2. Revisar políticas RLS de storage
3. Verificar que el bucket es público
4. Testear el upload end-to-end
```

### Caso 6: Agregar Nueva Funcionalidad
```
[Pegar el PROMPT completo arriba]

TAREAS A REALIZAR:
Necesito agregar [NUEVA FUNCIONALIDAD]. Por favor:
1. Analiza cómo encaja en la arquitectura actual
2. Identifica qué archivos necesitan modificarse
3. Propón un plan de implementación
4. Implementa manteniendo consistencia con el código existente
5. Documenta los cambios realizados
```

---

## 📝 CHECKLIST DE RESTAURACIÓN

Cuando uses este prompt, la IA debe verificar:

### Paso 1: Verificación de Entorno
- [ ] Directorio de trabajo es `/home/user/webapp`
- [ ] Git está en branch `master` (o branch correcto)
- [ ] Último commit coincide con el esperado
- [ ] No hay cambios sin commitear (a menos que sea intencional)

### Paso 2: Verificación de Código
- [ ] Archivo `lib/supabase-helpers.ts` exporta `chamosSupabase`
- [ ] Archivo `src/pages/barbero-panel.tsx` importa correctamente `chamosSupabase`
- [ ] Archivo `src/components/barbero/CitasSection.tsx` usa tema oscuro
- [ ] Archivo `src/styles/globals.css` tiene variables de tema definidas

### Paso 3: Verificación de Funcionalidad
- [ ] `npm install` ejecuta sin errores
- [ ] `npm run build` compila exitosamente
- [ ] No hay errores de TypeScript
- [ ] Archivos SQL en `supabase/` están presentes

### Paso 4: Verificación de Supabase
- [ ] Variables de entorno configuradas
- [ ] Bucket `barberos-fotos` existe (o se proporciona script SQL)
- [ ] Políticas RLS existen (o se proporciona script SQL)
- [ ] Tablas principales existen

### Paso 5: Verificación de Deployment
- [ ] Coolify está configurado correctamente
- [ ] Variables de entorno en Coolify están actualizadas
- [ ] Último build fue exitoso
- [ ] URL de producción es accesible

---

## 🆘 INSTRUCCIONES DE EMERGENCIA

Si TODO está roto y nada funciona:

### Opción A: Revertir a Último Commit Estable
```bash
cd /home/user/webapp
git log --oneline -10  # Ver últimos 10 commits
git reset --hard [COMMIT_HASH_ESTABLE]  # Revertir a commit estable
git push -f origin master  # Force push (CUIDADO)
```

### Opción B: Restaurar desde Backup
```bash
cd /home/user/webapp
git stash  # Guardar cambios actuales
git checkout master
git pull origin master  # Traer última versión estable
```

### Opción C: Clonar Repositorio Fresco
```bash
cd /home/user
mv webapp webapp_backup_$(date +%Y%m%d_%H%M%S)
git clone [URL_REPOSITORIO] webapp
cd webapp
npm install
# Copiar .env.local desde backup si es necesario
```

---

## 📞 CONTACTOS Y RECURSOS

### Documentación del Proyecto
- README principal: `/home/user/webapp/README.md`
- Documentación completa: `/home/user/webapp/DOCUMENTACION_ESTADO_ACTUAL_COMPLETO.md`
- Índice de documentación: `/home/user/webapp/INDICE_DOCUMENTACION.md`

### Servicios Externos
- **Supabase Dashboard**: https://app.supabase.com
- **Documentación Supabase**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **React Docs**: https://react.dev

### Scripts Útiles
```bash
# Ver todas las variables de entorno
cd /home/user/webapp && cat .env.local

# Ver estructura del proyecto
cd /home/user/webapp && tree -L 2 -I 'node_modules|.next'

# Ver imports de un archivo
cd /home/user/webapp && grep -n "^import" src/pages/barbero-panel.tsx

# Buscar referencias a un término
cd /home/user/webapp && grep -r "chamosSupabase" src/
```

---

## ✅ VALIDACIÓN FINAL

Después de usar este prompt y resolver el problema, la IA debe:

1. **Confirmar Estado Funcional**:
   - Build exitoso
   - Tests manuales pasados (si aplica)
   - Deploy exitoso (si aplica)

2. **Actualizar Documentación**:
   - Documentar cambios en archivo relevante
   - Actualizar este prompt si es necesario
   - Agregar nueva solución a `HISTORIAL_PROBLEMAS_RESUELTOS.md`

3. **Commit y Push**:
   - Hacer commit con mensaje descriptivo
   - Squash commits si son múltiples
   - Push a branch correcto
   - Crear/actualizar PR si es necesario
   - Proporcionar link del PR al usuario

4. **Informar al Usuario**:
   - Resumen claro de lo realizado
   - Cambios específicos en archivos
   - Instrucciones de verificación
   - Próximos pasos recomendados

---

**Versión del Prompt**: 1.0  
**Fecha de Creación**: 6 de Noviembre, 2025  
**Última Actualización**: 6 de Noviembre, 2025  
**Próxima Revisión**: Después de cambios mayores en funcionalidad o arquitectura
