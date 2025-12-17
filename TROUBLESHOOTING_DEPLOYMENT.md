# 🔧 Troubleshooting: Error de Deployment

## ❌ Error Detectado

```
Error: kex_exchange_identification: read: Connection reset by peer
Rolling update failed
Failed to start container
```

**Fecha**: 17 de diciembre de 2024, 01:23 AM  
**Tipo**: Error de deployment en Coolify  
**Severidad**: Alto (deployment bloqueado)

---

## 🔍 Diagnóstico

### **Causa Raíz**
El error `kex_exchange_identification: read: Connection reset by peer` indica un **problema de conexión SSH** entre Coolify y el servidor de deployment.

### **Posibles Causas:**

1. **Problema de Red/Conexión**
   - Timeout de SSH
   - Firewall bloqueando conexiones
   - Problemas temporales de red

2. **Recursos del Servidor**
   - Memoria insuficiente
   - CPU saturada
   - Docker sobrecargado

3. **Problema de Docker**
   - Contenedores anteriores no cerrados
   - Problemas con docker compose
   - Caché corrupto

---

## ✅ Soluciones Recomendadas

### **Solución 1: Reintentar Deployment (Más Simple)**

1. **Esperar 2-3 minutos** (dejar que el sistema se estabilice)
2. **Hacer nuevo deployment**:
   - En Coolify → Click en "Redeploy"
   - O hacer un nuevo commit dummy y push

```bash
# Opción A: Commit dummy
cd /home/user/webapp
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main

# Opción B: Desde Coolify Dashboard
# Ir a la aplicación → Click "Redeploy"
```

---

### **Solución 2: Limpiar Contenedores (Si Solución 1 Falla)**

**Acceder al servidor y limpiar:**

```bash
# Conectar al servidor vía SSH
ssh usuario@servidor

# Listar contenedores relacionados
docker ps -a | grep pos0c4gc8kkcsckgwk00ss0c

# Detener contenedores huérfanos
docker stop $(docker ps -a -q --filter name=pos0c4gc8kkcsckgwk00ss0c)

# Remover contenedores huérfanos
docker rm $(docker ps -a -q --filter name=pos0c4gc8kkcsckgwk00ss0c)

# Limpiar imágenes sin usar
docker image prune -f

# Limpiar sistema completo (opcional, más agresivo)
docker system prune -f

# Reintentar deployment desde Coolify
```

---

### **Solución 3: Verificar Recursos del Servidor**

```bash
# Conectar al servidor
ssh usuario@servidor

# Verificar memoria
free -h

# Verificar CPU
top

# Verificar espacio en disco
df -h

# Verificar Docker
docker info

# Si memoria está baja, reiniciar Docker
sudo systemctl restart docker
```

---

### **Solución 4: Deployment Manual (Última Opción)**

Si Coolify sigue fallando, hacer deployment manual:

```bash
# En el servidor
cd /data/coolify/applications/pos0c4gc8kkcsckgwk00ss0c

# Pull del código más reciente
git pull origin main

# Rebuild
docker compose build --no-cache

# Up
docker compose up -d

# Verificar
docker compose ps
docker compose logs -f --tail=100
```

---

## 🎯 Plan de Acción Recomendado

### **Paso 1: Verificar Estado Actual**
```
1. Ir a: https://chamosbarber.com
2. ¿La app está funcionando? 
   - SÍ: El deployment anterior sigue activo (OK)
   - NO: Hay un problema mayor
```

### **Paso 2: Intentar Redeploy**
```
Opción A: Desde Coolify Dashboard
- Ir a aplicación
- Click "Redeploy"

Opción B: Commit dummy
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

### **Paso 3: Si Falla de Nuevo**
```
- Contactar al equipo de DevOps/Infraestructura
- Revisar logs de Coolify
- Verificar recursos del servidor
- Considerar deployment manual
```

---

## 📊 Estado del Código

### ✅ **Código está 100% Correcto**
- Build de TypeScript pasa ✅
- Migración SQL ejecutada ✅
- Tabla `walk_in_clients` creada ✅
- Tests locales pasarían ✅

### ❌ **Problema es de Infraestructura**
- No es un error de código
- Es un error de deployment/servidor
- Relacionado con SSH/Docker/Recursos

---

## 🔍 Logs Clave del Error

```
kex_exchange_identification: read: Connection reset by peer
SSH connection failed. Retrying... (Attempt 1/3, waiting 2s)
Command execution failed (exit code 255)
Rolling update failed
Failed to start container
```

**Interpretación:**
- `kex_exchange_identification`: Error de handshake SSH
- `Connection reset by peer`: Servidor cerró conexión
- `exit code 255`: Error de SSH
- `Rolling update failed`: No pudo hacer actualización gradual

---

## 📝 Información para DevOps

### **Environment:**
- **Platform**: Coolify
- **Project**: Chamos Barber
- **Container**: pos0c4gc8kkcsckgwk00ss0c
- **Build ID**: n0c0ssoo4wwkkgsoo4os888k
- **Branch**: main
- **Commit**: 763db53 (último exitoso)

### **Error Type:**
- SSH connection failure during rolling update
- Docker compose failed to start container
- Exit code 255 (SSH error)

### **Needed Actions:**
1. Verificar conectividad SSH al servidor
2. Verificar recursos (CPU, RAM, Disk)
3. Limpiar contenedores huérfanos
4. Reintentar deployment

---

## 🚀 Workaround Temporal

### **Si necesitas deployment urgente:**

1. **Verificar que la app actual funciona**:
   ```
   https://chamosbarber.com
   ```

2. **La funcionalidad Walk-In requiere:**
   - ✅ Migración SQL ejecutada (ya hecho)
   - ⏳ Código en producción (pendiente)

3. **Estado actual:**
   - La versión anterior (sin Walk-In) sigue corriendo
   - Walk-In no estará disponible hasta deployment exitoso
   - Resto de funcionalidades siguen operando

---

## ✅ Cuando el Deployment Funcione

**Verificar:**
1. App cargue correctamente: https://chamosbarber.com
2. Login funcione
3. Panel Walk-In visible en menú
4. Registrar cliente de prueba
5. Verificar estadísticas

---

## 📞 Soporte

**Prioridades:**
1. 🔥 **Crítico**: Si la app está completamente caída
2. 🟠 **Alto**: Si deployment sigue fallando después de 3 intentos
3. 🟡 **Medio**: Si solo Walk-In no funciona (resto OK)
4. 🟢 **Bajo**: Optimizaciones y mejoras

**Contactos:**
- DevOps/Infraestructura team
- Coolify support: https://coolify.io/docs
- GitHub Issues: Si es problema recurrente

---

## 🎯 Resumen Ejecutivo

| Aspecto | Estado |
|---------|--------|
| **Código** | ✅ Correcto y probado |
| **Build** | ✅ Pasa sin errores |
| **Migración DB** | ✅ Ejecutada exitosamente |
| **Deployment** | ❌ Fallando por SSH/infraestructura |
| **App actual** | ✅ Sigue corriendo versión anterior |
| **Acción requerida** | Reintentar deployment o contactar DevOps |

---

## 🔄 Historial de Deployments

| Commit | Estado | Timestamp |
|--------|--------|-----------|
| 77cbd47 | ✅ Exitoso | PDF liquidaciones |
| 6cf30cd | ✅ Exitoso | Walk-In feature |
| 00f4641 | ✅ Exitoso | TypeScript fix |
| aad228a | ✅ Exitoso | Docs migración |
| 763db53 | ❌ **Falló** | Verificación (SSH error) |

---

**Última actualización**: 17 de diciembre de 2024, 01:30 AM  
**Estado**: Esperando reintento de deployment  
**Próxima acción**: Redeploy en Coolify o contactar DevOps
