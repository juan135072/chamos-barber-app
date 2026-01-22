# 🔧 Troubleshooting: Emails No Se Envían

## 🔴 PROBLEMA IDENTIFICADO:

```env
EMAIL_FROM=<noreply@chamosbarber.com>   ❌ FORMATO INCORRECTO
```

---

## ✅ SOLUCIÓN RÁPIDA:

### **Cambiar en Coolify:**

**DE:**
```env
EMAIL_FROM=<noreply@chamosbarber.com>
```

**A:**
```env
EMAIL_FROM=Chamos Barber <noreply@chamosbarber.com>
```

**Pasos:**
1. Coolify → `chamos-barber-app`
2. Environment Variables → Buscar `EMAIL_FROM`
3. Clic en "Update"
4. Cambiar valor a: `Chamos Barber <noreply@chamosbarber.com>`
5. Guardar
6. **REDEPLOY** (importante)

---

## 🔍 VERIFICAR DESPUÉS DEL REDEPLOY:

### **1. Verificar que las Variables se Cargaron:**

En los logs de Coolify, al iniciar la app deberías ver (si agregamos logging):
```
✅ RESEND_API_KEY: configured
✅ EMAIL_FROM: Chamos Barber <noreply@chamosbarber.com>
```

### **2. Probar Envío de Email:**

Admin → Barberos → Nuevo Barbero → [Tu email] → ✅ Crear cuenta

### **3. Verificar en Resend Dashboard:**

Ve a: https://resend.com/emails

**Si aparece el email:**
- ✅ **Delivered:** Todo OK
- ❌ **Failed:** Revisa el error específico
- ⏳ **Pending:** Espera 1-2 minutos

**Si NO aparece ningún email:**
- Las variables no se cargaron → Verifica Coolify
- Hay un error en el código → Revisa logs

---

## 🐛 PROBLEMAS COMUNES:

### **Problema 1: Email con formato incorrecto**
```env
❌ EMAIL_FROM=<noreply@chamosbarber.com>
```
**Error en Resend:** `Invalid sender address format`

**Solución:**
```env
✅ EMAIL_FROM=Chamos Barber <noreply@chamosbarber.com>
✅ EMAIL_FROM=noreply@chamosbarber.com
```

---

### **Problema 2: Dominio no verificado**
**Error en Resend:** `Domain not verified`

**Verificar:**
1. Ve a https://resend.com/domains
2. Busca `chamosbarber.com`
3. Status debe ser: **Verified ✅**

**Si no está verificado:**
1. Resend Dashboard → Domains → chamosbarber.com
2. Verifica los registros DNS (SPF, DKIM, DMARC)
3. Espera 5-30 minutos para propagación
4. Refresca la página de Resend

---

### **Problema 3: API Key inválida**
**Error en logs:** `401 Unauthorized` o `Invalid API key`

**Verificar:**
1. Ve a https://resend.com/api-keys
2. Verifica que la API Key existe y está activa
3. Si fue revocada, genera una nueva
4. Actualiza en Coolify → Environment Variables
5. Redeploy

---

### **Problema 4: Variable no se carga**
**Síntoma:** Logs muestran "RESEND_API_KEY no configurada"

**Solución:**
1. Coolify → Environment Variables
2. Verificar que `RESEND_API_KEY` tiene:
   - ☑️ **Available at Runtime** (IMPORTANTE)
   - ☐ Available at Buildtime (opcional)
3. Si no tiene "Runtime", editar y marcar
4. Guardar y **Redeploy**

---

### **Problema 5: Emails caen en spam**
**Síntoma:** Email se envía pero llega a spam

**Soluciones:**
1. **Verificar dominio en Resend** (mejora deliverability)
2. **Configurar SPF, DKIM, DMARC** correctamente
3. **Pedir al usuario** que marque como "No es spam"
4. **Usar dominio verificado** en lugar de `onboarding@resend.dev`

---

## 📊 CHECKLIST DE VERIFICACIÓN:

```
[ ] EMAIL_FROM tiene formato correcto (con nombre)
[ ] RESEND_API_KEY está configurada
[ ] RESEND_API_KEY tiene "Available at Runtime" ✓
[ ] Dominio verificado en Resend (chamosbarber.com)
[ ] Registros DNS (SPF, DKIM) configurados
[ ] Redeploy realizado después de cambios
[ ] Logs no muestran errores
[ ] Email aparece en Resend Dashboard
[ ] Email llega a la bandeja de entrada
```

---

## 🔬 DEBUGGING AVANZADO:

### **Ver Logs en Tiempo Real:**

1. Coolify → `chamos-barber-app` → Logs
2. Filtrar por: `Email` o `Resend`
3. Buscar mensajes:
   ```
   ✅ [Email] Email sent successfully: re_xxx
   ❌ [Email] Error sending email: ...
   ⚠️ [Email] RESEND_API_KEY no configurada
   ```

### **Agregar Más Logging (Opcional):**

Si necesitas más información, podemos agregar logs adicionales al código:

```typescript
// En lib/email-service.ts, línea 16-18
constructor() {
  this.apiKey = process.env.RESEND_API_KEY
  this.fromEmail = process.env.EMAIL_FROM || 'Chamos Barber <noreply@chamosbarber.com>'
  
  // Agregar esto:
  console.log('📧 [Email Service] Initialized')
  console.log('   - API Key:', this.apiKey ? '✅ Configured' : '❌ NOT configured')
  console.log('   - From Email:', this.fromEmail)
}
```

---

## 🎯 COMANDOS ÚTILES:

### **Verificar Variables en el Servidor:**

Si tienes acceso SSH al servidor Coolify:
```bash
# Ver variables de entorno
env | grep RESEND
env | grep EMAIL_FROM

# Debería mostrar:
# RESEND_API_KEY=re_3rMzAfWi_GvDYMhny79T6Q5EJ9TkkacVh
# EMAIL_FROM=Chamos Barber <noreply@chamosbarber.com>
```

---

## 📞 CONTACTO RESEND:

Si después de todos estos pasos aún no funciona:

1. **Resend Support:**
   - Email: support@resend.com
   - Discord: https://resend.com/discord
   - Docs: https://resend.com/docs

2. **Proporciona:**
   - Email ID (si aparece en Dashboard)
   - Error específico (de logs o Dashboard)
   - Configuración de dominio (screenshots)

---

## ✅ SOLUCIÓN TEMPORAL:

Si necesitas que funcione YA mientras investigas:

```env
# Usar dominio temporal de Resend
EMAIL_FROM=Chamos Barber <onboarding@resend.dev>
```

**Ventajas:**
- ✅ Funciona inmediatamente
- ✅ No requiere verificación de dominio
- ✅ Perfecto para pruebas

**Desventajas:**
- ⚠️ Menos profesional
- ⚠️ Puede caer en spam

---

**Última actualización:** 2025-12-15
