# 🚨 PROMPT DE RESTAURACIÓN RÁPIDA

## Copiar y Pegar en Nueva Sesión

```
CONTEXTO: Soy el desarrollador de Chamos Barber App (Next.js 14 + Supabase). 
Implementamos 3 funcionalidades de comisiones y ganancias el 09/11/2025.
Necesito restaurar el estado exacto del sistema.

ESTADO ESPERADO:
- ✅ Sistema de Configuración de Comisiones (Admin Panel)
- ✅ Sistema de Reporte de Ganancias para Admin (todos los barberos)
- ✅ Sistema de Ganancias Personales para Barberos (solo sus datos)

VERIFICACIÓN RÁPIDA:
```bash
cd /home/user/webapp

# 1. Verificar commits (últimos 7)
git log --oneline | head -7
# Debe mostrar:
# 6762631 docs: add comprehensive barber earnings implementation guide
# 6d0b5e3 feat(barbero): add personal earnings report
# 2eaf857 docs: add comprehensive earnings report guide
# 5236371 feat(admin): add earnings report tab
# 503a437 docs: add comprehensive commission guide
# a59ce1b fix(comisiones): correct Database import path
# 786d19d feat(admin): add commission configuration interface

# 2. Verificar archivos clave
ls -lh src/components/admin/tabs/ComisionesTab.tsx    # Debe existir (~12.6 KB)
ls -lh src/components/admin/tabs/GananciasTab.tsx     # Debe existir (~21.7 KB)
ls -lh src/components/barbero/GananciasSection.tsx    # Debe existir (~21.3 KB)

# 3. Verificar documentación
ls -lh COMISIONES_IMPLEMENTACION.md                   # Debe existir
ls -lh GANANCIAS_IMPLEMENTACION.md                    # Debe existir
ls -lh GANANCIAS_BARBEROS_IMPLEMENTACION.md           # Debe existir
ls -lh SESION_COMPLETA_2025-11-09.md                  # Debe existir

# 4. Verificar build
npm run build  # Debe compilar sin errores
```

ARCHIVOS CRÍTICOS (si faltan, restaurar):

1. **ComisionesTab** (Configuración de comisiones):
```bash
git show 786d19d:src/components/admin/tabs/ComisionesTab.tsx > src/components/admin/tabs/ComisionesTab.tsx
```

2. **GananciasTab** (Reporte admin):
```bash
git show 5236371:src/components/admin/tabs/GananciasTab.tsx > src/components/admin/tabs/GananciasTab.tsx
```

3. **GananciasSection** (Reporte barberos):
```bash
git show 6d0b5e3:src/components/barbero/GananciasSection.tsx > src/components/barbero/GananciasSection.tsx
```

4. **Admin.tsx** (navegación admin):
```bash
git show 6762631:src/pages/admin.tsx > src/pages/admin.tsx
```

5. **Barbero-panel.tsx** (navegación barberos):
```bash
git show 6d0b5e3:src/pages/barbero-panel.tsx > src/pages/barbero-panel.tsx
```

CARACTERÍSTICAS POR FUNCIONALIDAD:

**1. Comisiones (Admin → Tab "Comisiones")**:
- Edición inline de porcentajes (0-100%)
- Guarda en tabla: configuracion_comisiones
- NO aparece en alertas del POS
- Ejemplo visual de cálculo ($10 → barbero/casa)

**2. Ganancias Admin (Admin → Tab "Ganancias")**:
- Muestra TODOS los barberos
- Filtros: Hoy, Ayer, Mes Actual, Día, Rango, Mes
- 3 Cards: Total Ventas, Comisiones Barberos, Ingreso Casa
- Tabla ordenada por ventas (desc)
- Muestra: Barbero, Servicios, Total, %, Ganancia, Casa

**3. Ganancias Barberos (Barbero Panel → Tab "Mis Ganancias")**:
- Muestra SOLO barbero logueado (filtrado por barberoId)
- NO muestra: Ingreso Casa, otros barberos
- 3 Cards: Total Ventas, Mis Ganancias, Promedio/Servicio
- Tabla por día: Fecha, Servicios, Total, %, Ganancia

SEGURIDAD CRÍTICA (GananciasSection.tsx):
```typescript
// Query DEBE tener este filtro:
.eq('barbero_id', barberoId)  // ← CRÍTICO: solo del barbero logueado
```

IMPORTS CORRECTOS:
```typescript
// ✅ CORRECTO:
import { supabase, Database } from '@/lib/supabase'

// ❌ INCORRECTO:
import { Database } from '@/lib/database.types'
```

TABS ESPERADOS:

Admin Panel:
- Dashboard, Citas, Clientes, Barberos
- **Comisiones** ← NUEVO
- **Ganancias** ← NUEVO
- Servicios, Categorías, Solicitudes

Barbero Panel:
- Mi Perfil, Mis Citas
- **Mis Ganancias** ← NUEVO

TESTING RÁPIDO:

1. Admin → Comisiones:
   - Lista de barberos ✓
   - Botón "Editar" funciona ✓
   - Guarda porcentajes ✓

2. Admin → Ganancias:
   - Muestra todos los barberos ✓
   - Filtros funcionan ✓
   - Cards muestran totales ✓

3. Barbero → Mis Ganancias:
   - Solo ve SUS datos ✓
   - NO ve Ingreso Casa ✓
   - NO ve otros barberos ✓

SI BUILD FALLA:
```bash
# Limpiar y reinstalar
rm -rf node_modules .next
npm install
npm run build
```

SI FALTA TODO:
```bash
# Reset completo al commit final
git reset --hard 6762631
npm install
npm run build
```

DOCUMENTACIÓN COMPLETA:
Ver archivo: SESION_COMPLETA_2025-11-09.md

URL SERVIDOR:
https://3000-ipv83x9w638fd3sxre87s-8f57ffe2.sandbox.novita.ai

REPO:
https://github.com/juan135072/chamos-barber-app

TAREAS:
1. Ejecuta verificación rápida (4 comandos)
2. Si todo ✅: Reporta "Sistema restaurado OK"
3. Si falta algo: Usa git show para restaurar
4. Re-ejecuta build después de restaurar
5. Confirma que todo funciona

¿QUÉ NECESITAS?
Dime qué está fallando y restauramos específicamente esa parte.
```

---

## Resumen Ultra-Rápido

**3 Funcionalidades**:
1. Comisiones (admin config)
2. Ganancias Admin (todos)
3. Ganancias Barberos (personal)

**7 Commits**: 786d19d → 6762631

**3 Componentes Nuevos**:
- ComisionesTab.tsx
- GananciasTab.tsx  
- GananciasSection.tsx

**Verificación**: `git log | head -7` + `npm run build`

**Restauración**: `git reset --hard 6762631`
