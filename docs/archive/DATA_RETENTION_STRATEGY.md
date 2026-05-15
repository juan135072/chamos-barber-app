# 📊 Estrategia de Retención de Datos - Citas y Notas

## 🎯 Objetivo

**Conservar el historial completo de citas y notas** en el panel de administración para:
- 📝 Mantener registro de trabajos realizados
- 🔍 Consultar historial de clientes
- 📈 Generar reportes y estadísticas
- 💼 Cumplimiento legal y auditoría

---

## ✅ Estado Actual del Sistema

### 1️⃣ **Límite de Reservas Públicas (Ya Implementado)**

**Sistema Inteligente:**
```typescript
// Solo cuenta citas FUTURAS con estado activo
MAX_ACTIVE_APPOINTMENTS: 5
ACTIVE_STATES: ['pendiente', 'confirmada']
```

**Comportamiento:**
- ✅ Cliente hace 100 citas en 2024 (todas completadas)
- ✅ En 2025 puede seguir reservando sin límite
- ✅ Solo se cuentan las 5 citas futuras pendientes/confirmadas

**Resultado:** Las citas completadas **NO se eliminan** y **NO bloquean** nuevas reservas.

---

### 2️⃣ **Panel de Administración**

**Visualización:**
```typescript
// src/components/admin/tabs/CitasTab.tsx
.from('citas')
.select('*')  // ← Muestra TODAS las citas
.order('fecha', { ascending: false })
```

**Filtros Disponibles:**
- 📅 Por fecha: Todas / Hoy / Futuras / Pasadas
- 🏷️ Por estado: Todas / Pendiente / Confirmada / Completada / Cancelada
- 🔍 Por búsqueda: Nombre cliente, email, barbero

**Resultado:** Historial completo accesible en todo momento.

---

### 3️⃣ **Sistema de Notas**

#### A) Notas en Citas (`citas.notas`)
```typescript
{
  id: "cita-123",
  cliente_nombre: "Juan Pérez",
  notas: "Cliente prefiere corte bajo, usa gel especial",
  // ... otros campos
}
```

#### B) Notas de Clientes (`notas_clientes`)
```typescript
{
  id: "nota-456",
  barbero_id: "barbero-123",
  cliente_email: "juan@email.com",
  cita_id: "cita-123",  // ← Vinculada a cita
  notas: "Cliente alérgico a producto X",
  tags: ["alergia", "vip"]
}
```

**Relación:** `notas_clientes.cita_id` → `citas.id`

---

## ⚠️ Riesgos Actuales

### Problema 1: Eliminación Manual de Citas

**Escenario:**
```
Admin → CitasTab → Eliminar Cita → DELETE FROM citas WHERE id = 'cita-123'
```

**Consecuencias:**
1. ❌ Se elimina la cita permanentemente
2. ❌ Se pierden las notas de la cita (`citas.notas`)
3. ⚠️ ¿Qué pasa con `notas_clientes`? (depende de foreign key)

**Foreign Key Actual:**
```sql
-- Necesitamos verificar:
ALTER TABLE notas_clientes
  ADD CONSTRAINT fk_cita
  FOREIGN KEY (cita_id) 
  REFERENCES citas(id)
  ON DELETE ??? -- CASCADE / SET NULL / RESTRICT
```

---

## 🛡️ Soluciones Recomendadas

### 🥇 **Opción 1: Deshabilitar Eliminación de Citas (Recomendado)**

**Implementación:** Cambiar DELETE por UPDATE (soft delete)

```typescript
// En CitasTab.tsx - Cambiar handleDeleteCita
const handleDeleteCita = async (citaId: string) => {
  if (!confirm('¿Marcar esta cita como cancelada?')) return

  try {
    // En lugar de DELETE, cambiar estado
    const { error } = await supabase
      .from('citas')
      .update({ 
        estado: 'cancelada',
        notas: (notas_actuales || '') + '\n[Admin] Cita cancelada el ' + new Date().toISOString()
      })
      .eq('id', citaId)

    if (error) throw error
    await loadCitas()
    alert('Cita marcada como cancelada')
  } catch (error) {
    console.error('Error updating cita:', error)
  }
}
```

**Ventajas:**
- ✅ Conserva todo el historial
- ✅ Mantiene notas intactas
- ✅ Permite auditoría completa
- ✅ Puede revertirse si fue error

---

### 🥈 **Opción 2: Confirmación Extra para Eliminación Permanente**

**Implementación:** Agregar modal de advertencia

```typescript
const handleDeleteCita = async (citaId: string) => {
  // Primera confirmación
  if (!confirm('⚠️ ADVERTENCIA: Esto eliminará PERMANENTEMENTE la cita y todas sus notas asociadas.')) {
    return
  }

  // Segunda confirmación con más contexto
  const cita = citas.find(c => c.id === citaId)
  const mensaje = `
    ¿Realmente quieres eliminar esta cita?
    
    Cliente: ${cita?.cliente_nombre}
    Fecha: ${cita?.fecha} ${cita?.hora}
    Notas: ${cita?.notas ? 'Sí, tiene notas' : 'No'}
    
    ⚠️ Esta acción NO se puede deshacer
    ⚠️ Se perderá el historial del cliente
    
    Escribe "ELIMINAR" para confirmar:
  `
  
  const confirmacion = prompt(mensaje)
  if (confirmacion !== 'ELIMINAR') {
    alert('Eliminación cancelada')
    return
  }

  // Proceder con delete...
}
```

---

### 🥉 **Opción 3: Archivar en Lugar de Eliminar**

**Implementación:** Agregar campo `archivada` a la tabla `citas`

```sql
-- Migración SQL
ALTER TABLE citas ADD COLUMN archivada BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_citas_archivada ON citas(archivada);
```

```typescript
// En CitasTab.tsx
const handleArchivarCita = async (citaId: string) => {
  const { error } = await supabase
    .from('citas')
    .update({ archivada: true })
    .eq('id', citaId)
  
  // Filtrar en el query
  const { data } = await supabase
    .from('citas')
    .select('*')
    .eq('archivada', false)  // Solo mostrar no archivadas
}

// Agregar vista para "Citas Archivadas"
const handleVerArchivadas = () => {
  // Query con archivada = true
}
```

---

## 🚀 Plan de Implementación Recomendado

### Fase 1: Proteger Datos (Inmediato)

1. **Verificar Foreign Keys**
```sql
-- En Supabase SQL Editor
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'notas_clientes'
  AND kcu.column_name = 'cita_id';
```

2. **Ajustar Foreign Key si es CASCADE**
```sql
-- Si DELETE CASCADE, cambiar a SET NULL
ALTER TABLE notas_clientes
  DROP CONSTRAINT IF EXISTS notas_clientes_cita_id_fkey;

ALTER TABLE notas_clientes
  ADD CONSTRAINT notas_clientes_cita_id_fkey
  FOREIGN KEY (cita_id)
  REFERENCES citas(id)
  ON DELETE SET NULL;  -- ← No elimina notas, solo desvincula
```

### Fase 2: Cambiar a Soft Delete (Recomendado)

1. Reemplazar función `handleDeleteCita` con `handleCancelarCita`
2. Cambiar botón de "Eliminar" a "Cancelar"
3. Agregar filtro para ocultar canceladas por defecto
4. Agregar vista "Todas las Citas (incluye canceladas)"

### Fase 3: Agregar Funcionalidad de Archivo (Opcional)

1. Migración SQL para agregar campo `archivada`
2. Nuevo botón "Archivar" para citas antiguas
3. Vista separada para citas archivadas
4. Export a CSV/PDF antes de archivar

---

## 📋 Checklist de Mejores Prácticas

### Para Citas
- [ ] ✅ Nunca eliminar citas automáticamente
- [ ] ✅ Usar estados en lugar de DELETE
- [ ] ✅ Mantener historial completo accesible
- [ ] ✅ Agregar timestamp en cambios de estado
- [ ] ✅ Backup regular de base de datos

### Para Notas
- [ ] ✅ Foreign key con ON DELETE SET NULL (no CASCADE)
- [ ] ✅ Exportar notas antes de cualquier eliminación
- [ ] ✅ Copiar notas importantes a `notas_clientes`
- [ ] ✅ Tags para facilitar búsqueda
- [ ] ✅ Historial de cambios en notas

### Para Clientes
- [ ] ✅ Perfil unificado por email/teléfono
- [ ] ✅ Consolidar citas de mismo cliente
- [ ] ✅ Vista de "Historial del Cliente"
- [ ] ✅ Notas visibles en todas las citas futuras
- [ ] ✅ Export de historial completo

---

## 🔍 Consultas Útiles

### Ver Citas con Notas
```sql
SELECT 
  c.id,
  c.cliente_nombre,
  c.fecha,
  c.estado,
  c.notas as notas_cita,
  COUNT(nc.id) as cantidad_notas_clientes
FROM citas c
LEFT JOIN notas_clientes nc ON nc.cita_id = c.id
WHERE c.cliente_telefono = '+58XXXXXXXXX'
GROUP BY c.id
ORDER BY c.fecha DESC;
```

### Verificar Integridad de Datos
```sql
-- Notas huérfanas (sin cita)
SELECT * FROM notas_clientes WHERE cita_id IS NULL;

-- Citas sin barbero o servicio
SELECT * FROM citas WHERE barbero_id IS NULL OR servicio_id IS NULL;
```

### Estadísticas de Retención
```sql
SELECT 
  DATE_TRUNC('month', fecha) as mes,
  estado,
  COUNT(*) as cantidad,
  COUNT(CASE WHEN notas IS NOT NULL THEN 1 END) as con_notas
FROM citas
GROUP BY mes, estado
ORDER BY mes DESC;
```

---

## 📞 Resumen Ejecutivo

### ¿Qué está funcionando bien?
✅ **Sistema de límites de reservas** - Solo cuenta citas futuras  
✅ **Panel admin** - Muestra todo el historial  
✅ **Notas preservadas** - Mientras no se eliminen citas manualmente

### ¿Qué necesita atención?
⚠️ **Botón "Eliminar"** en CitasTab - Debería ser "Cancelar"  
⚠️ **Foreign keys** - Verificar que no sean CASCADE  
⚠️ **Sin archivado** - Citas muy antiguas siempre visibles

### Recomendación Inmediata
🎯 **Implementar Opción 1 (Soft Delete)** - 30 minutos de desarrollo  
- Cambiar DELETE por UPDATE estado='cancelada'
- Preserva 100% de los datos
- Sin riesgo de pérdida de información

---

**Última actualización:** 2025-11-08  
**Versión:** 1.0
