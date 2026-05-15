# 📋 Guía de Configuración de Límites de Reservas

## 🎯 Problema Original

El sistema anterior tenía un límite fijo de **10 citas** que bloqueaba a clientes legítimos después de hacer 10 reservas en total, sin importar si esas citas ya habían sido completadas.

**Ejemplo del problema:**
```
Cliente frecuente:
- Hizo 10 citas en 3 meses (todas completadas exitosamente)
- Intenta hacer la cita #11
- ❌ BLOQUEADO: "Has alcanzado el límite máximo de 10 citas"
- Cliente frustrado no puede seguir usando el servicio
```

---

## ✅ Nueva Solución: Sistema Inteligente

El nuevo sistema solo cuenta **citas FUTURAS activas**, permitiendo reservas ilimitadas a lo largo del tiempo.

### 🔑 Concepto Clave: "Citas Activas"

**Citas que SÍ cuentan para el límite:**
- ✅ Estado `pendiente` + Fecha/Hora futura
- ✅ Estado `confirmada` + Fecha/Hora futura

**Citas que NO cuentan para el límite:**
- ❌ Estado `completada` (ya pasó)
- ❌ Estado `cancelada` (fue cancelada)
- ❌ Estado `no_asistio` (cliente no asistió)
- ❌ Cualquier cita con fecha/hora pasada

---

## ⚙️ Configuración Actual

**Archivo:** `/lib/reservations-config.ts`

```typescript
export const RESERVATION_LIMITS = {
  // Máximo de citas futuras con estado pendiente/confirmada
  MAX_ACTIVE_APPOINTMENTS: 5,  // ← CONFIGURABLE
  
  // Estados que cuentan como "activos"
  ACTIVE_STATES: ['pendiente', 'confirmada'],
  
  // Límite opcional por período de tiempo (días)
  TIME_PERIOD_DAYS: null,  // null = desactivado
  
  // Máximo en el período (si TIME_PERIOD_DAYS está configurado)
  MAX_APPOINTMENTS_IN_PERIOD: 15,
}
```

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Cliente Nuevo
```
Citas del usuario:
- 0 citas previas

Resultado:
✅ Puede hacer 5 reservas futuras
Límite actual: 0/5
```

### Ejemplo 2: Cliente Frecuente
```
Citas del usuario:
- 15 citas completadas (hace 1-6 meses)
- 2 citas futuras pendientes (próxima semana)

Resultado:
✅ Puede hacer 3 reservas más
Límite actual: 2/5
Explicación: Solo cuentan las 2 futuras
```

### Ejemplo 3: Usuario Abusivo (Bloqueado)
```
Citas del usuario:
- 5 citas futuras pendientes (mismo día, diferentes horarios)

Resultado:
❌ BLOQUEADO: No puede hacer más reservas
Límite actual: 5/5
Mensaje: "Tienes 5 citas pendientes. El límite es de 5 citas futuras simultáneas."
```

### Ejemplo 4: Cliente Después de Citas Completadas
```
Citas del usuario:
- 100 citas completadas (cliente super frecuente)
- 1 cita futura confirmada

Resultado:
✅ Puede hacer 4 reservas más
Límite actual: 1/5
Explicación: Las 100 completadas NO cuentan
```

---

## 🔧 Cómo Ajustar los Límites

### Cambio 1: Aumentar/Reducir Límite de Citas Activas

**Actual:** 5 citas futuras máximo

**Opciones:**

```typescript
// Más restrictivo (prevenir más spam)
MAX_ACTIVE_APPOINTMENTS: 3,  // Solo 3 citas futuras

// Más flexible (clientes que planean con anticipación)
MAX_ACTIVE_APPOINTMENTS: 7,  // Hasta 7 citas futuras
```

**Recomendaciones:**
- **3 citas:** Barbería con alta demanda, prevenir acaparamiento
- **5 citas:** Balance ideal (recomendado) ✅
- **7-10 citas:** Cliente puede planificar 2-3 meses adelante

---

### Cambio 2: Activar Límite por Período de Tiempo

**Actual:** Desactivado (`TIME_PERIOD_DAYS: null`)

**Para activar:**

```typescript
// Máximo 15 citas en los últimos 30 días
TIME_PERIOD_DAYS: 30,
MAX_APPOINTMENTS_IN_PERIOD: 15,
```

**Ejemplo con límite por período:**
```
Usuario intenta reservar:
- Tiene 2 citas futuras (OK, 2/5)
- Tiene 14 citas en los últimos 30 días (OK, 14/15)
- Puede hacer 1 reserva más hasta cumplir 15/15

Después de 30 días:
- Las citas antiguas no cuentan
- El contador se "resetea" naturalmente
```

**Cuándo usar límite por período:**
- Protección adicional contra bots
- Limitar abuso de cuentas compartidas
- Control de clientes corporativos

---

### Cambio 3: Personalizar Mensajes de Error

**Actual:**

```typescript
ERROR_MESSAGES: {
  ACTIVE_LIMIT_REACHED: (currentCount, maxLimit) => 
    `⚠️ Tienes ${currentCount} citas pendientes...`,
}
```

**Personalizado:**

```typescript
ERROR_MESSAGES: {
  ACTIVE_LIMIT_REACHED: (currentCount, maxLimit) => 
    `⚠️ Actualmente tienes ${currentCount} citas programadas. 
    Por políticas de la barbería, el máximo es ${maxLimit} citas futuras. 
    📅 Una vez completes tus citas actuales, podrás reservar nuevamente.
    📞 Para casos especiales, llámanos al (XXX) XXX-XXXX`,
}
```

---

## 🚀 Implementar Cambios

### Paso 1: Editar Configuración
```bash
# Abrir archivo
nano lib/reservations-config.ts

# O con tu editor preferido
code lib/reservations-config.ts
```

### Paso 2: Modificar Valores
```typescript
export const RESERVATION_LIMITS = {
  MAX_ACTIVE_APPOINTMENTS: 7,  // ← Cambiar aquí
  // ... resto de configuración
}
```

### Paso 3: Verificar Build
```bash
npm run build
```

### Paso 4: Commit y Deploy
```bash
git add lib/reservations-config.ts
git commit -m "chore: Adjust reservation limits to 7 active appointments"
git push origin master
```

---

## 📈 Monitoreo y Ajustes

### Revisar Logs en Producción

Los logs de la API muestran:
```
✅ [crear-cita] Active future appointments: 3
📊 [crear-cita] Appointments details: [...]
```

### Señales para Ajustar Límite

**Aumentar límite si:**
- ✅ Muchos clientes legítimos bloqueados
- ✅ Clientes se quejan de no poder reservar con anticipación
- ✅ Baja incidencia de spam/abuso

**Reducir límite si:**
- ❌ Ataques frecuentes de bots
- ❌ Usuarios acaparando múltiples horarios
- ❌ Alta demanda y poca disponibilidad

---

## 🔒 Seguridad

### Protecciones Implementadas

1. **Validación en servidor** (no en cliente)
   - Bypass RLS con SERVICE_ROLE_KEY
   - No puede ser manipulado por el usuario

2. **Filtro por fecha/hora actual**
   - Usa fecha/hora del servidor
   - Previene manipulación de fechas

3. **Query optimizado**
   - Solo cuenta citas relevantes
   - Índices en `cliente_telefono`, `fecha`, `estado`

### Consideraciones Adicionales

- **Rate limiting:** Considerar límite de requests por IP
- **CAPTCHA:** Agregar en formulario de reservas
- **Verificación telefónica:** SMS de confirmación

---

## 🆘 Troubleshooting

### Problema: Cliente legítimo bloqueado

**Solución temporal:** Admin puede cancelar citas antiguas
```sql
-- En Supabase SQL Editor
UPDATE citas 
SET estado = 'cancelada'
WHERE cliente_telefono = '+58XXXXXXXXX'
  AND estado IN ('pendiente', 'confirmada')
  AND fecha < CURRENT_DATE;
```

### Problema: Límite muy restrictivo

**Solución:** Aumentar `MAX_ACTIVE_APPOINTMENTS` a 7-10

### Problema: Spam continuo

**Solución:** Activar `TIME_PERIOD_DAYS` con límite bajo
```typescript
TIME_PERIOD_DAYS: 7,  // Últimos 7 días
MAX_APPOINTMENTS_IN_PERIOD: 5,  // Máximo 5 citas por semana
```

---

## 📞 Soporte

Si necesitas ajustar la configuración o tienes dudas:
1. Revisa los logs en producción
2. Analiza patrones de uso
3. Ajusta valores en `lib/reservations-config.ts`
4. Haz testing en ambiente de desarrollo
5. Deploy gradual monitoreando métricas

---

**Última actualización:** 2025-11-08  
**Versión:** 1.0  
**Commit:** `81fba8f`
