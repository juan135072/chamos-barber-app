# 🎯 LÓGICA FINAL CORRECTA: Cálculo de Comisión en POS

## ✅ LÓGICA IMPLEMENTADA (CORRECTA)

La comisión **SIEMPRE** se calcula sobre el **"Monto a Cobrar"** (`montoTotal`), que puede ser:
1. El precio original del servicio (sin editar)
2. El precio editado con descuento
3. El precio editado con incremento/propina

El **"Monto Recibido"** es **SOLO** para calcular el **cambio** cuando el pago es en efectivo.

---

## 📊 CASOS DE USO

### Caso 1: SIN EDITAR el monto (flujo normal)
```
Servicio: Corte de cabello
Precio Original: $5,000

Usuario NO edita el "Monto a Cobrar"
Monto a Cobrar: $5,000 (sin cambios)
Método de Pago: Efectivo
Monto Recibido: $7,000 (cliente da billete de $7,000)

✅ Comisión (60%):
   • Barbero: USD 3.000 (60% de $5,000) ← Basado en "Monto a Cobrar"
   • Casa: USD 2.000 (40% de $5,000)
✅ Cambio: USD 2.000 ($7,000 - $5,000)

Resultado: Cliente paga $5,000, recibe $2,000 de cambio
```

### Caso 2: CON DESCUENTO (usuario edita el monto)
```
Servicio: Corte premium
Precio Original: $10,000

Usuario EDITA el "Monto a Cobrar" para dar descuento
Monto a Cobrar: $8,000 (descuento de $2,000)
Método de Pago: Efectivo
Monto Recibido: $10,000

✅ Comisión (60%):
   • Barbero: USD 4.800 (60% de $8,000) ← Basado en monto editado
   • Casa: USD 3.200 (40% de $8,000)
✅ Cambio: USD 2.000 ($10,000 - $8,000)

Resultado: Se cobra $8,000 (descuento aplicado), cliente recibe $2,000 de cambio
```

### Caso 3: CON PROPINA (usuario edita el monto aumentándolo)
```
Servicio: Corte y barba
Precio Original: $8,000

Usuario EDITA el "Monto a Cobrar" para incluir propina
Monto a Cobrar: $10,000 (propina de $2,000)
Método de Pago: Efectivo
Monto Recibido: $10,000

✅ Comisión (60%):
   • Barbero: USD 6.000 (60% de $10,000) ← Basado en monto con propina
   • Casa: USD 4.000 (40% de $10,000)
✅ Cambio: USD 0 (pago exacto)

Resultado: Se cobra $10,000 (incluye propina), sin cambio
```

### Caso 4: PAGO CON TARJETA (sin "Monto Recibido")
```
Servicio: Corte premium
Precio Original: $12,000

Usuario puede editar o no
Monto a Cobrar: $12,000
Método de Pago: Tarjeta

✅ Comisión (70%):
   • Barbero: USD 8.400 (70% de $12,000)
   • Casa: USD 3.600 (30% de $12,000)
✅ No hay campo "Monto Recibido" ni "Cambio" (pago electrónico)

Resultado: Se cobra $12,000 vía tarjeta
```

---

## 🔄 FLUJO EN LA UI

```
1. Modal se abre
   Precio Original: $5,000
   Monto a Cobrar: $5,000 (editable)
                    ↓
2. Usuario puede:
   a) NO EDITAR → Queda en $5,000
   b) EDITAR con descuento → $4,000
   c) EDITAR con propina → $7,000
                    ↓
3. Sistema calcula comisión EN TIEMPO REAL:
   ✅ Comisión (60%):
   • Barbero: (monto editado o no) × 60%
   • Casa: (monto editado o no) × 40%
                    ↓
4. Si método es "Efectivo":
   Aparece campo "Monto Recibido"
   Usuario ingresa cuánto dinero dio el cliente
                    ↓
5. Sistema calcula CAMBIO:
   Cambio = Monto Recibido - Monto a Cobrar
                    ↓
6. Usuario hace clic en "Cobrar e Imprimir"
   Se guarda en BD con:
   - total: Monto a Cobrar (base para comisión)
   - monto_recibido: Monto Recibido (para registro)
   - cambio: Diferencia
   - comision_barbero: % de Monto a Cobrar
   - ingreso_casa: % de Monto a Cobrar
```

---

## 💡 DIFERENCIA CLAVE

### ❌ LÓGICA INCORRECTA (commit anterior `f56cb35`):
```typescript
// Calculaba sobre "Monto Recibido"
const montoParaComision = (metodoPago === 'efectivo' && montoRecibido) 
  ? parseInt(montoRecibido)  // ❌ Incorrecto
  : montoTotal
```

**Problema:** Si el cliente pagaba con $7,000 para un servicio de $5,000, la comisión se calculaba sobre $7,000, lo cual NO tenía sentido porque esos $2,000 extra eran para cambio, no propina.

### ✅ LÓGICA CORRECTA (commit actual `ba5da7f`):
```typescript
// Calcula sobre "Monto a Cobrar" (editado o no)
const comisionBarberoRealTime = Math.floor(montoTotal * (porcentajeComision / 100))
```

**Solución:** La comisión se calcula sobre el "Monto a Cobrar", que:
- Puede ser el precio original ($5,000)
- O puede ser editado por el usuario ($4,000 descuento, $7,000 con propina)
- El "Monto Recibido" solo sirve para calcular el cambio

---

## 🧪 VERIFICACIÓN

### Prueba 1: Sin editar monto
```
1. Seleccionar cita de $5,000
2. NO editar "Monto a Cobrar"
3. Método: Efectivo
4. Monto Recibido: $7,000
5. ✅ Verificar:
   - Comisión Barbero: $3,000 (60% de $5,000) ✓
   - Casa: $2,000 (40% de $5,000) ✓
   - Cambio: $2,000 ✓
```

### Prueba 2: Con descuento
```
1. Seleccionar cita de $10,000
2. EDITAR "Monto a Cobrar" a $8,000
3. Método: Efectivo
4. Monto Recibido: $10,000
5. ✅ Verificar:
   - Comisión Barbero: $4,800 (60% de $8,000) ✓
   - Casa: $3,200 (40% de $8,000) ✓
   - Cambio: $2,000 ✓
```

### Prueba 3: Con propina (editando monto)
```
1. Seleccionar cita de $5,000
2. EDITAR "Monto a Cobrar" a $7,000 (incluye propina)
3. Método: Efectivo
4. Monto Recibido: $7,000
5. ✅ Verificar:
   - Comisión Barbero: $4,200 (60% de $7,000) ✓
   - Casa: $2,800 (40% de $7,000) ✓
   - Cambio: $0 ✓
```

---

## 🗃️ VERIFICACIÓN EN BASE DE DATOS

```sql
SELECT 
  numero_factura,
  cliente_nombre,
  subtotal,           -- Monto a Cobrar (editado o no)
  total,              -- Igual a subtotal (base para comisión)
  monto_recibido,     -- Efectivo recibido
  cambio,             -- Diferencia
  porcentaje_comision,
  comision_barbero,   -- % de subtotal/total
  ingreso_casa,       -- % de subtotal/total
  metodo_pago,
  created_at
FROM facturas
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 1;
```

**Para caso 1 (sin editar):**
```
subtotal: 5000
total: 5000
monto_recibido: 7000
cambio: 2000
porcentaje_comision: 60
comision_barbero: 3000  ← 60% de 5000 ✓
ingreso_casa: 2000      ← 40% de 5000 ✓
```

**Para caso 2 (con descuento):**
```
subtotal: 8000
total: 8000
monto_recibido: 10000
cambio: 2000
porcentaje_comision: 60
comision_barbero: 4800  ← 60% de 8000 ✓
ingreso_casa: 3200      ← 40% de 8000 ✓
```

**Para caso 3 (con propina):**
```
subtotal: 7000
total: 7000
monto_recibido: 7000
cambio: 0
porcentaje_comision: 60
comision_barbero: 4200  ← 60% de 7000 ✓
ingreso_casa: 2800      ← 40% de 7000 ✓
```

---

## 📦 COMMITS

| Commit | Descripción | Estado |
|--------|-------------|--------|
| **`ba5da7f`** | **fix(pos): calcular comisión sobre MONTO A COBRAR** | ✅ **CORRECTO** |
| `560b4f7` | docs: documentación de recálculo en tiempo real | 📝 Desactualizada |
| `f56cb35` | fix(pos): calcular comisión sobre MONTO RECIBIDO | ❌ **INCORRECTO** |
| `5c56d39` | docs: documentación completa de comisión barbero | 📝 Parcialmente válida |
| `7b6b815` | fix(pos): agregar porcentaje_comision al query | ✅ Válido |

**Commit válido:** https://github.com/juan135072/chamos-barber-app/commit/ba5da7f

---

## 🎉 RESUMEN FINAL

### ✅ LÓGICA CORRECTA:
1. **Comisión** = % de **"Monto a Cobrar"** (editado o no)
2. **Cambio** = **"Monto Recibido"** - **"Monto a Cobrar"**
3. El **"Monto Recibido"** NO afecta la comisión, solo el cambio

### 🔄 FLUJO:
```
Precio Original → Usuario puede editar → Monto a Cobrar (base comisión)
                                              ↓
                                    Comisión = % de Monto a Cobrar
                                              ↓
                  Si Efectivo → Monto Recibido → Cambio = Diferencia
```

### 📋 CASOS DE USO REALES:

**Barbería Chamos Barber:**

1. **Cliente sin editar:** Corte $5,000 → Paga con $10,000 → Comisión sobre $5,000, cambio $5,000
2. **Cliente con descuento:** Corte $10,000 → Descuento a $8,000 → Comisión sobre $8,000
3. **Cliente con propina:** Corte $5,000 → Edita a $7,000 → Comisión sobre $7,000

**ESTADO: LÓGICA CORRECTA IMPLEMENTADA** ✅

---

## 🚀 DESPLIEGUE

El código está listo. Solo falta resolver el error de Coolify.

**Error en Coolify:**
```
#16 exporting layers
Error: Command execution failed (exit code 255)
```

**Posibles soluciones:**
1. Reintentar el deploy (puede ser problema temporal de recursos)
2. Verificar logs completos en Coolify
3. Verificar espacio en disco en el servidor
4. Verificar memoria disponible en el servidor

**Build local exitoso:** ✅ (5.3s)

---

## 📞 SOPORTE

Si la comisión no se calcula correctamente:

1. **Verificar que se está editando "Monto a Cobrar"** (no solo "Monto Recibido")
2. Limpiar cache del navegador
3. Verificar que el barbero tenga `porcentaje_comision` en BD
4. Verificar logs de consola (F12)

**Commit principal:** https://github.com/juan135072/chamos-barber-app/commit/ba5da7f
