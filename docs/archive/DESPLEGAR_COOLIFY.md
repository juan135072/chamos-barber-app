# 🚀 GUÍA PARA DESPLEGAR EN COOLIFY

## ⚠️ PROBLEMA ACTUAL

El código **YA ESTÁ CORRECTO** en GitHub (commit `ba5da7f`), pero **NO se ha desplegado** debido a un error en Coolify:

```
#16 exporting layers
Error: Command execution failed (exit code 255)
```

**Tu captura de pantalla muestra la versión VIEJA con decimales porque el deploy falló.**

---

## ✅ CÓDIGO CORRECTO (ya en GitHub)

### Características implementadas:
1. ✅ Comisión calculada sobre "Monto a Cobrar" (editado o no)
2. ✅ Sin decimales (USD 4.800 en lugar de USD 4.800,00)
3. ✅ Recálculo en tiempo real al editar monto
4. ✅ "Monto Recibido" solo para calcular cambio
5. ✅ Porcentaje dinámico del barbero desde BD

### Commit válido:
**`ba5da7f`** - fix(pos): calcular comisión sobre MONTO A COBRAR (editado), no sobre monto recibido

---

## 🔧 SOLUCIONES PARA DESPLEGAR

### Opción 1: Reintentar Deploy en Coolify (Más Simple)

1. Ir a Coolify Dashboard
2. Proyecto: `chamos-barber-app`
3. Hacer clic en **"Force Rebuild & Redeploy"** (no solo "Redeploy")
4. Esperar 5-10 minutos
5. Si falla de nuevo, continuar con Opción 2

---

### Opción 2: Limpiar Docker en el Servidor

**SSH al servidor:**
```bash
ssh usuario@servidor_coolify
```

**Verificar espacio:**
```bash
# Ver espacio en disco
df -h

# Ver memoria RAM
free -h

# Ver espacio usado por Docker
docker system df
```

**Si hay poco espacio (<20%), limpiar:**
```bash
# Limpiar imágenes y contenedores no usados
docker system prune -a --volumes

# CUIDADO: Esto eliminará:
# - Todas las imágenes sin usar
# - Todos los contenedores detenidos
# - Todas las redes no usadas
# - Todos los volúmenes no usados
```

**Reintentar deploy en Coolify:**
- Dashboard → `chamos-barber-app` → "Force Rebuild & Redeploy"

---

### Opción 3: Deploy Manual (Si Coolify sigue fallando)

**1. SSH al servidor:**
```bash
ssh usuario@servidor_coolify
cd /ruta/del/proyecto
```

**2. Pull del código nuevo:**
```bash
git pull origin main
```

**3. Reconstruir e iniciar:**
```bash
# Detener contenedor actual
docker stop chamos-barber-app

# Reconstruir imagen
docker build -t chamos-barber-app .

# Iniciar contenedor
docker run -d --name chamos-barber-app \
  -p 3000:3000 \
  --restart unless-stopped \
  chamos-barber-app
```

**4. Verificar:**
```bash
docker ps | grep chamos-barber
docker logs -f chamos-barber-app
```

---

### Opción 4: Verificar Logs Completos en Coolify

1. Dashboard de Coolify
2. Proyecto `chamos-barber-app`
3. Ver logs completos del último deploy
4. Buscar el error específico que causa el fallo
5. Compartir el log completo si necesitas ayuda

---

## 🧪 VERIFICACIÓN POST-DEPLOY

### 1. Verificar que el código nuevo está desplegado:

**Ir a:** https://chamosbarber.com/pos

**Probar:**
1. Seleccionar cita pendiente
2. Verificar que comisión se muestre **SIN decimales**:
   - ✅ USD 4.800 (correcto)
   - ❌ USD 4.800,00 (versión vieja)

### 2. Probar casos de uso:

**Caso 1: Sin editar monto**
```
Precio original: $5,000
NO editar "Monto a Cobrar"
Monto Recibido: $10,000

✅ Verificar:
- Comisión Barbero: USD 3.000 (60% de $5,000)
- Casa: USD 2.000 (40% de $5,000)
- Cambio: USD 5.000
- Sin decimales (.00)
```

**Caso 2: Con descuento (editando monto)**
```
Precio original: $8,000
EDITAR "Monto a Cobrar" a $6,000
Monto Recibido: $10,000

✅ Verificar:
- Comisión Barbero: USD 3.600 (60% de $6,000)
- Casa: USD 2.400 (40% de $6,000)
- Cambio: USD 4.000
- Recálculo en tiempo real al editar
- Sin decimales
```

**Caso 3: Con propina (editando monto)**
```
Precio original: $5,000
EDITAR "Monto a Cobrar" a $7,000
Monto Recibido: $7,000

✅ Verificar:
- Comisión Barbero: USD 4.200 (60% de $7,000)
- Casa: USD 2.800 (40% de $7,000)
- Cambio: USD 0
- Recálculo en tiempo real al editar
- Sin decimales
```

---

## 📊 VERIFICAR EN SUPABASE

```sql
SELECT 
  numero_factura,
  cliente_nombre,
  total,
  porcentaje_comision,
  comision_barbero,
  ingreso_casa,
  created_at
FROM facturas
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado (para caso con $8,000 y 60%):**
```
total: 8000
porcentaje_comision: 60
comision_barbero: 4800  ← SIN decimales
ingreso_casa: 3200      ← SIN decimales
```

---

## 🆘 SI TODO FALLA

### Plan B: Verificar Variables de Entorno

```bash
# SSH al servidor
cd /ruta/del/proyecto

# Verificar .env
cat .env

# Deben existir:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Plan C: Reiniciar Servicios

```bash
# Reiniciar Docker
sudo systemctl restart docker

# Reiniciar Coolify
sudo systemctl restart coolify

# Esperar 2-3 minutos
# Reintentar deploy
```

---

## 🎯 RESUMEN

| Estado | Item |
|--------|------|
| ✅ | Código correcto en GitHub (`ba5da7f`) |
| ✅ | Lógica de comisión correcta |
| ✅ | Sin decimales implementado |
| ✅ | Recálculo en tiempo real |
| ❌ | **Deploy pendiente (Coolify falló)** |

**Próximo paso:** Reintentar deploy con "Force Rebuild & Redeploy" en Coolify.

---

## 📞 CONTACTO

Si después de intentar estas opciones el deploy sigue fallando:

1. Compartir logs completos de Coolify
2. Verificar espacio en disco del servidor
3. Verificar memoria RAM del servidor
4. Considerar hacer deploy manual (Opción 3)

**El código está 100% correcto y funcionando en local. Solo falta desplegarlo.** 🚀
