# 👥 Guía de Gestión de Clientes e Inactividad

## 🎯 Problema Resuelto

**Situación Original:**
- Clientes que dejan de visitar la barbería permanecen en el sistema indefinidamente
- Acumulación de datos innecesarios sin forma de identificarlos
- No había forma de distinguir clientes activos vs abandonados

**Solución Implementada:**
- Sistema automático de categorización por actividad
- Panel visual para identificar clientes inactivos
- Control total del administrador para decidir qué hacer
- Exportación de datos antes de eliminar

---

## 📊 Sistema de Categorías

### Categorías Automáticas

El sistema categoriza automáticamente a cada cliente basándose en su **última cita**:

| Categoría | Icono | Color | Rango | Descripción | Acciones Sugeridas |
|-----------|-------|-------|-------|-------------|-------------------|
| **Activo** | 🟢 | Verde | 0-3 meses | Cliente frecuente y reciente | Ninguna |
| **Regular** | 🟡 | Amarillo | 3-6 meses | Cliente que visita regularmente | Enviar recordatorio, ofrecer promoción |
| **Inactivo** | 🟠 | Naranja | 6-12 meses | No ha visitado en varios meses | Campaña de reactivación, llamada |
| **Dormido** | 🔴 | Rojo | 12-24 meses | Inactivo por más de 1 año | Archivar, último intento de contacto |
| **Abandonado** | ⚫ | Gris | >24 meses | No ha vuelto en más de 2 años | Considerar eliminar, exportar historial |

---

## 🖥️ Uso del Panel de Clientes

### Acceso

```
Panel Admin → Tab "Clientes" (icono 👥)
```

### Vista Principal

```
┌─────────────────────────────────────────────────────────┐
│  GESTIÓN DE CLIENTES                                    │
│  156 clientes registrados                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filtros:                                               │
│  [Todos (156)] [🟢 Activo (85)] [🟡 Regular (32)]      │
│  [🟠 Inactivo (21)] [🔴 Dormido (10)] [⚫ Abandonado (8)]│
│                                                         │
│  🔍 [Buscar por nombre, teléfono o email...]            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Cliente           │ Categoría  │ Última   │ Total │    │
│                    │            │ Cita     │ Citas │    │
├─────────────────────────────────────────────────────────┤
│  Juan Pérez        │ 🟢 Activo  │ 05 Nov   │  15   │ 📥 │
│  +58424xxxxxxx     │ 1 meses    │  2025    │       │    │
├─────────────────────────────────────────────────────────┤
│  María García      │ ⚫ Abandonado│ 15 Mar   │   3   │ 📥 │
│  +58412xxxxxxx     │ 32 meses   │  2022    │       │    │
└─────────────────────────────────────────────────────────┘
```

### Funcionalidades

#### 1. **Filtrar por Categoría**
- Click en cualquier badge de categoría
- Muestra solo clientes de esa categoría
- Contador actualizado en tiempo real

#### 2. **Buscar Cliente**
- Por nombre completo o parcial
- Por número de teléfono
- Por dirección de email

#### 3. **Exportar Historial**
- Botón 📥 "Exportar" en cada cliente
- Descarga archivo JSON con:
  - Datos del cliente
  - Todas sus citas históricas
  - Detalles de barberos y servicios
  - Fecha de exportación
- **Recomendado antes de eliminar**

---

## 🔧 Configuración del Sistema

### Archivo de Configuración

**Ubicación:** `/lib/data-retention-policy.ts`

### Opciones Principales

#### 1. **Auto-Archivo** (Activado por defecto)

```typescript
AUTO_ARCHIVE: {
  enabled: true,              // ✅ Activado
  after_months: 12,           // Después de 12 meses
  notify_before: true,        // Notificar admin antes
  notify_days: 7,            // 7 días antes
  keep_accessible: true       // Visible en "Archivados"
}
```

**¿Qué hace?**
- Clientes sin actividad por 12+ meses → Estado "Archivado"
- Ocultos de vistas normales (pero NO eliminados)
- Accesibles en sección "Archivados"
- Reversible en cualquier momento

#### 2. **Auto-Eliminación** (Desactivado por defecto)

```typescript
AUTO_DELETE: {
  enabled: false,             // ❌ DESACTIVADO (seguridad)
  after_months: 36,           // 3 años total sin actividad
  grace_period_days: 30,      // 30 días para revertir
  notify_before: true,        // Notificar antes de eliminar
  keep_anonymous_stats: true  // Preservar estadísticas
}
```

**¿Qué hace?**
- Solo elimina clientes **archivados** hace 24+ meses adicionales
- Total: 36 meses sin actividad (3 años)
- Admin recibe notificación 30 días antes
- Período de gracia para revertir
- **Requiere activación manual por seguridad**

---

## 📋 Flujos de Trabajo Recomendados

### Flujo 1: Revisión Mensual

```
1. Panel Admin → Clientes
2. Click en "⚫ Abandonado"
3. Revisar lista de clientes +24 meses inactivos
4. Para cada cliente:
   a. ¿Reconoces al cliente?
      - SÍ → ¿Vale la pena conservar datos?
        - SÍ → Dejar como está
        - NO → Exportar + Eliminar manualmente
      - NO → Exportar + Considerar eliminar
```

### Flujo 2: Campaña de Reactivación

```
1. Panel Admin → Clientes
2. Click en "🔴 Dormido" (12-24 meses)
3. Exportar lista completa
4. Importar en sistema de marketing
5. Enviar campaña: "Te extrañamos, 20% descuento"
6. Monitorear resultados
```

### Flujo 3: Limpieza de Datos (Trimestral)

```
1. Panel Admin → Clientes → "⚫ Abandonado"
2. Para cada cliente >30 meses:
   a. Click "📥 Exportar Historial"
   b. Guardar JSON en carpeta backup
3. Eliminar manualmente desde Supabase:
   - Opción 1: SQL Editor
   - Opción 2: Tab Citas → Buscar → Eliminar
4. Verificar espacio liberado
```

---

## 🗑️ Cómo Eliminar Clientes

### Opción 1: Eliminar Citas (Recomendado)

**Desde Panel Admin → Citas:**

```sql
-- En Supabase SQL Editor
DELETE FROM citas 
WHERE cliente_telefono = '+58XXXXXXXXX'
  AND fecha < '2023-01-01';  -- Solo citas antiguas
```

**Ventajas:**
- ✅ Elimina solo citas específicas
- ✅ Puede conservar citas recientes
- ✅ Notas en `notas_clientes` se preservan (FK: SET NULL)

### Opción 2: Actualizar a Cancelada (Soft Delete)

```sql
-- Marcar como canceladas en lugar de eliminar
UPDATE citas 
SET estado = 'cancelada'
WHERE cliente_telefono = '+58XXXXXXXXX'
  AND estado IN ('completada', 'no_asistio')
  AND fecha < '2023-01-01';
```

**Ventajas:**
- ✅ No elimina datos
- ✅ Puede revertirse
- ✅ Auditoría completa

### Opción 3: Eliminación Masiva

```sql
-- CUIDADO: Esto elimina TODAS las citas del cliente
WITH clientes_abandonados AS (
  SELECT DISTINCT cliente_telefono
  FROM citas
  GROUP BY cliente_telefono
  HAVING MAX(fecha) < NOW() - INTERVAL '36 months'
)
DELETE FROM citas
WHERE cliente_telefono IN (SELECT cliente_telefono FROM clientes_abandonados);
```

**Advertencias:**
- ⚠️ Acción irreversible
- ⚠️ Exportar ANTES
- ⚠️ Verificar lista primero

---

## 📊 Consultas Útiles

### Ver Clientes por Categoría

```sql
WITH ultima_cita_por_cliente AS (
  SELECT 
    cliente_telefono,
    cliente_nombre,
    cliente_email,
    MAX(fecha) as ultima_cita,
    COUNT(*) as total_citas,
    EXTRACT(EPOCH FROM (NOW() - MAX(fecha))) / (60 * 60 * 24 * 30) as meses_inactivo
  FROM citas
  GROUP BY cliente_telefono, cliente_nombre, cliente_email
)
SELECT 
  *,
  CASE 
    WHEN meses_inactivo < 3 THEN '🟢 ACTIVO'
    WHEN meses_inactivo < 6 THEN '🟡 REGULAR'
    WHEN meses_inactivo < 12 THEN '🟠 INACTIVO'
    WHEN meses_inactivo < 24 THEN '🔴 DORMIDO'
    ELSE '⚫ ABANDONADO'
  END as categoria
FROM ultima_cita_por_cliente
ORDER BY meses_inactivo DESC;
```

### Contar Clientes Abandonados

```sql
SELECT COUNT(DISTINCT cliente_telefono) as abandonados
FROM citas
GROUP BY cliente_telefono
HAVING MAX(fecha) < NOW() - INTERVAL '24 months';
```

### Calcular Espacio Usado

```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('citas')) as tamano_tabla_citas,
  COUNT(*) as total_citas,
  COUNT(CASE WHEN fecha < NOW() - INTERVAL '24 months' THEN 1 END) as citas_abandonados
FROM citas;
```

---

## ⚙️ Habilitar Eliminación Automática

**⚠️ ADVERTENCIA:** Solo habilitar después de entender completamente el flujo.

### Paso 1: Modificar Configuración

```typescript
// lib/data-retention-policy.ts
AUTO_DELETE: {
  enabled: true,  // ← Cambiar a true
  after_months: 36,
  // ... resto de configuración
}
```

### Paso 2: Crear Cron Job (Opcional)

```typescript
// pages/api/cron/cleanup-clients.ts
export default async function handler(req, res) {
  // Verificar cron secret
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Obtener clientes abandonados >36 meses
  const { data: clientes } = await supabase
    .from('citas')
    .select('cliente_telefono, MAX(fecha)')
    .group('cliente_telefono')
    .having('MAX(fecha) < NOW() - INTERVAL \'36 months\'')

  // Exportar historiales
  for (const cliente of clientes) {
    await exportarHistorial(cliente.cliente_telefono)
  }

  // Esperar período de gracia (30 días)
  // Enviar notificación a admin
  // Si no hay respuesta, eliminar

  res.json({ procesados: clientes.length })
}
```

### Paso 3: Configurar Vercel Cron

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/cleanup-clients",
    "schedule": "0 0 1 * *"  // Primer día de cada mes
  }]
}
```

---

## 🛡️ Mejores Prácticas

### Antes de Eliminar

- [ ] ✅ Exportar historial completo (JSON)
- [ ] ✅ Verificar que el cliente realmente abandonó
- [ ] ✅ Revisar si tiene notas importantes
- [ ] ✅ Considerar campañas de reactivación primero
- [ ] ✅ Backup de base de datos

### Retención Recomendada

| Tipo de Cliente | Retención Mínima | Razón |
|-----------------|------------------|-------|
| Activo | Indefinido | Datos actuales y valiosos |
| Regular | 2 años | Puede volver pronto |
| Inactivo | 2 años | Intentar reactivar |
| Dormido | 3 años | Última oportunidad |
| Abandonado | 3-5 años | Cumplimiento legal |

### Cumplimiento Legal

**Importante:** Consulta las leyes locales sobre retención de datos personales:

- 🇻🇪 **Venezuela:** No hay ley específica de protección de datos aún
- 🇪🇺 **GDPR (Europa):** Derecho al olvido, máximo 5-7 años
- 🇺🇸 **CCPA (California):** Derecho a solicitar eliminación
- 🇦🇷 **Argentina:** Ley 25.326 - Protección de Datos Personales

**Recomendación:** Retener mínimo 3 años, máximo 7 años.

---

## 📈 Estadísticas y Reportes

### Reporte Mensual Sugerido

```
REPORTE DE CLIENTES - Noviembre 2025
═══════════════════════════════════════

Total Clientes: 156
├─ 🟢 Activos (0-3m):      85 (54%)
├─ 🟡 Regulares (3-6m):    32 (21%)
├─ 🟠 Inactivos (6-12m):   21 (13%)
├─ 🔴 Dormidos (12-24m):   10 (6%)
└─ ⚫ Abandonados (>24m):    8 (5%)

Acciones Sugeridas:
• 32 clientes regulares → Enviar recordatorio
• 21 clientes inactivos → Campaña reactivación
• 10 clientes dormidos → Último intento contacto
• 8 clientes abandonados → Revisar para eliminar

Espacio Estimado a Liberar: ~2.5 MB
```

---

## 🆘 Troubleshooting

### Problema: Cliente activo marcado como abandonado

**Causa:** Citas no registradas en el sistema

**Solución:**
```sql
-- Verificar última cita
SELECT MAX(fecha) FROM citas WHERE cliente_telefono = '+58XXXXXXXXX';

-- Si es reciente pero no aparece, verificar estado
SELECT * FROM citas 
WHERE cliente_telefono = '+58XXXXXXXXX'
ORDER BY fecha DESC LIMIT 5;
```

### Problema: No puedo exportar historial

**Causa:** Permisos RLS o cliente sin citas

**Solución:**
```sql
-- Verificar si el cliente tiene citas
SELECT COUNT(*) FROM citas WHERE cliente_telefono = '+58XXXXXXXXX';

-- Si tiene citas pero no exporta, verificar desde Supabase SQL Editor
SELECT * FROM citas 
WHERE cliente_telefono = '+58XXXXXXXXX';
```

### Problema: Eliminé cliente por error

**Causa:** No hay backup o soft delete

**Solución:**
- ❌ Si usaste DELETE: No recuperable sin backup
- ✅ Si usaste soft delete (estado='cancelada'): Reversible
```sql
-- Restaurar cliente si usaste soft delete
UPDATE citas 
SET estado = 'completada'
WHERE cliente_telefono = '+58XXXXXXXXX'
  AND estado = 'cancelada';
```

---

## 📞 Resumen Ejecutivo

### ¿Qué Hace el Sistema?

✅ **Categoriza** clientes automáticamente por última actividad  
✅ **Visualiza** clientes inactivos con colores y filtros  
✅ **Exporta** historiales antes de eliminar  
✅ **Preserva** datos de clientes frecuentes indefinidamente  
✅ **Protege** contra eliminación accidental (auto-delete OFF)

### ¿Qué NO Hace?

❌ **NO elimina** datos automáticamente (a menos que lo actives)  
❌ **NO oculta** clientes del panel (todos visibles)  
❌ **NO pierde** notas al eliminar citas (FK: SET NULL)  
❌ **NO bloquea** reservas de clientes inactivos

### Uso Diario

1. **Revisar tab "Clientes"** mensualmente
2. **Filtrar "⚫ Abandonados"** para identificar candidatos
3. **Exportar historial** de clientes a eliminar
4. **Eliminar manualmente** (SQL o panel admin)
5. **Verificar** espacio liberado

---

**Última actualización:** 2025-11-08  
**Versión:** 1.0  
**Commit:** `9d31029`
