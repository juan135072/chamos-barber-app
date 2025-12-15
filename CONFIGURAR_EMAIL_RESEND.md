# 📧 Guía Rápida: Configurar Resend para Emails

**Tiempo estimado:** 5 minutos  
**Costo:** GRATIS (10,000 emails/mes)

---

## 🎯 **¿Por Qué Resend?**

- ✅ **10,000 emails gratis al mes** (más que suficiente)
- ✅ Configuración súper simple (solo API key)
- ✅ Alta tasa de entrega (no spam)
- ✅ Ya integrado en tu código
- ✅ Dashboard con estadísticas

---

## 📋 **PASO 1: Crear Cuenta en Resend**

1. Ve a: **`https://resend.com`**
2. Clic en **"Sign Up"** (arriba derecha)
3. Opciones de registro:
   - Email: `contacto@chamosbarber.com` + Contraseña
   - O usa **"Continue with GitHub"**
4. Verifica tu email (revisa tu bandeja de entrada)
5. Completa el perfil básico

---

## 🔑 **PASO 2: Obtener API Key**

1. Después de login, ve al **Dashboard de Resend**
2. En el menú lateral, clic en **"API Keys"**
3. Clic en botón **"Create API Key"**
4. Configuración:
   - **Name:** `Chamos Barber Production`
   - **Permission:** `Full access` (o `Sending access`)
   - **Domain:** (déjalo vacío por ahora)
5. Clic en **"Add"**
6. **⚠️ IMPORTANTE:** Copia la API Key AHORA (empieza con `re_...`)
   - Solo se muestra UNA VEZ
   - Guárdala en un lugar seguro

**Ejemplo de API Key:**
```
re_123abc456def789ghi012jkl345mno678pqr
```

---

## 🌐 **PASO 3 (OPCIONAL): Configurar Dominio Personalizado**

**⚠️ Solo si tienes acceso al DNS de `chamosbarber.com`**

### **Ventajas de configurar dominio:**
- ✅ Emails desde `noreply@chamosbarber.com` (más profesional)
- ✅ Mayor tasa de entrega
- ✅ Mejor reputación

### **Si NO tienes acceso al DNS:**
- Usa el dominio temporal de Resend: `onboarding@resend.dev`
- Funciona perfectamente, pero emails vienen de Resend

### **Si tienes acceso al DNS:**

1. En Resend Dashboard → **"Domains"**
2. Clic en **"Add Domain"**
3. Ingresa: `chamosbarber.com`
4. Resend te mostrará registros DNS para agregar:

```
Tipo: MX
Host: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10

Tipo: TXT
Host: @
Value: v=spf1 include:amazonses.com ~all

Tipo: TXT
Host: _dmarc
Value: v=DMARC1; p=none; ...

Tipo: CNAME
Host: resend._domainkey
Value: resend._domainkey.resend.com
```

5. Agrega estos registros en tu proveedor de DNS (Cloudflare, GoDaddy, etc.)
6. Espera 5-30 minutos para que se verifique
7. Resend mostrará **"Verified ✅"** cuando esté listo

---

## ⚙️ **PASO 4: Configurar Variables de Entorno en Coolify**

1. Ve a: **`https://coolify.app`**
2. Selecciona tu proyecto: **`chamos-barber-app`**
3. En el menú lateral, clic en **"Environment Variables"** (o "Environments")
4. Busca si ya existen estas variables (edítalas o crea nuevas)

### **Si configuraste dominio personalizado:**
```env
RESEND_API_KEY=re_tu_api_key_aqui
EMAIL_FROM=Chamos Barber <noreply@chamosbarber.com>
```

### **Si NO configuraste dominio (usar dominio temporal de Resend):**
```env
RESEND_API_KEY=re_tu_api_key_aqui
EMAIL_FROM=Chamos Barber <onboarding@resend.dev>
```

**⚠️ IMPORTANTE:**
- Reemplaza `re_tu_api_key_aqui` con tu API Key real de Resend
- No uses comillas en los valores
- Asegúrate de que no haya espacios extra

5. Clic en **"Save"** o **"Update"**

---

## 🚀 **PASO 5: Redeploy en Coolify**

1. En Coolify, con el proyecto `chamos-barber-app` seleccionado
2. Clic en el botón **"Redeploy"** (arriba derecha)
3. Espera a que termine el deploy (1-3 minutos)
4. Verifica que el deploy sea exitoso (status: Running ✅)

---

## ✅ **PASO 6: Probar el Envío de Emails**

### **Prueba 1: Crear Barbero con Cuenta desde Admin**

1. Login como admin en: `https://chamosbarber.com/admin`
2. Ve a la pestaña **"Barberos"**
3. Clic en **"Nuevo Barbero"**
4. Completa el formulario:
   - Nombre: `Prueba`
   - Apellido: `Email`
   - Email: **TU EMAIL PERSONAL** (para recibir el correo de prueba)
   - Teléfono: `+56912345678`
   - Especialidades: `Cortes`
5. ✅ **MARCA:** "Crear cuenta de usuario"
6. Clic en **"Guardar"**
7. Deberías ver un modal con las credenciales
8. **Revisa tu email** (puede tardar 1-2 minutos)

**Email esperado:**
```
De: Chamos Barber <noreply@chamosbarber.com>
Asunto: Bienvenido a Chamos Barber - Tus Credenciales

Hola Prueba Email,

Tu cuenta de barbero ha sido creada exitosamente...
Email: tu_email@example.com
Contraseña: [contraseña generada]
```

### **Prueba 2: Reset Password de Barbero**

1. En Admin Panel → **"Barberos"**
2. Busca a Carlos Pérez
3. Clic en el botón **🔑** (Reset Password)
4. Copia la nueva contraseña generada
5. El sistema intentará enviar un email a `carlos@chamosbarber.com`
6. Verifica en Resend Dashboard si el email se envió

---

## 📊 **VERIFICAR EMAILS EN RESEND DASHBOARD**

1. Ve a Resend Dashboard: `https://resend.com/overview`
2. En el menú lateral, clic en **"Emails"**
3. Verás una lista de todos los emails enviados:
   - ✅ **Delivered:** Email enviado exitosamente
   - ⏳ **Pending:** En proceso de envío
   - ❌ **Failed:** Error en el envío (revisa el motivo)

---

## 🐛 **TROUBLESHOOTING**

### **Problema 1: No Aparece el Botón "Create API Key"**
- Asegúrate de haber verificado tu email
- Refresca la página
- Cierra sesión y vuelve a entrar

### **Problema 2: Los Emails No Se Envían**
**Verifica en Resend Dashboard → Emails:**
- Si aparece **"Failed"**: Revisa el error
- Si NO aparece ningún email: El código no está llamando a Resend

**Solución:**
1. Verifica las variables de entorno en Coolify
2. Asegúrate de haber hecho redeploy después de agregar las variables
3. Revisa los logs del servidor en Coolify:
   - Busca mensajes como: `[Email Service] Sending email...`
   - Busca errores: `Error sending email:`

### **Problema 3: Emails Caen en Spam**
- Si usas `onboarding@resend.dev`: Es normal, algunos proveedores lo marcan como spam
- **Solución:** Configura dominio personalizado (`chamosbarber.com`)
- Pide a los usuarios que marquen emails como "No es spam"

### **Problema 4: API Key Inválida**
**Error:** `Error sending email: API key is invalid`

**Solución:**
1. Verifica que la API Key en Coolify sea correcta
2. Asegúrate de copiar TODO el string (empieza con `re_`)
3. No uses comillas ni espacios extra
4. Si la perdiste, genera una nueva API Key en Resend

### **Problema 5: Límite de Emails Alcanzado**
- Plan gratuito: 10,000 emails/mes
- Solución: Upgrade a plan de pago o espera al siguiente mes

---

## 📈 **LÍMITES Y COSTOS**

| Plan | Emails/Mes | Costo |
|------|------------|-------|
| **Free** | 10,000 | $0 |
| **Pro** | 50,000 | $20/mes |
| **Business** | 100,000 | $80/mes |

**Para Chamos Barber:**
- Con 3 barberos y ~50 clientes/día
- Emails estimados: ~500-1,000/mes
- **Plan Free es más que suficiente** ✅

---

## 🎯 **FUNCIONALIDADES QUE USAN EMAIL**

Una vez configurado Resend, estas funciones enviarán emails automáticamente:

1. ✅ **Crear Barbero con Cuenta** (Admin Panel)
   - Email con credenciales de acceso
   - Destinatario: Email del nuevo barbero

2. ✅ **Aprobar Solicitud de Barbero**
   - Email con credenciales de acceso
   - Destinatario: Email del barbero aprobado

3. ⏳ **Reset Password** (Admin Panel)
   - Actualmente solo muestra contraseña en pantalla
   - Con Resend: Puede enviar email con nueva contraseña

4. ⏳ **Recuperación de Contraseña** (Página Login)
   - Funcionalidad futura
   - Email con link de recuperación

---

## 🔐 **SEGURIDAD**

### **Protege tu API Key:**
- ✅ Nunca la compartas públicamente
- ✅ No la subas a GitHub
- ✅ Solo úsala en variables de entorno de Coolify
- ✅ Si se compromete, genera una nueva inmediatamente

### **Regenerar API Key:**
1. Resend Dashboard → **"API Keys"**
2. Encuentra tu API Key
3. Clic en **"..."** → **"Revoke"**
4. Crea una nueva API Key
5. Actualiza la variable en Coolify
6. Redeploy

---

## 📞 **SOPORTE**

**Resend:**
- Docs: `https://resend.com/docs`
- Email: `support@resend.com`
- Discord: `https://resend.com/discord`

**Chamos Barber:**
- Revisa logs en Coolify
- Verifica `lib/email-service.ts`
- Ejecuta pruebas en local

---

## ✅ **CHECKLIST DE CONFIGURACIÓN**

- [ ] Crear cuenta en Resend
- [ ] Verificar email de Resend
- [ ] Generar API Key
- [ ] (Opcional) Configurar dominio personalizado
- [ ] Agregar variables en Coolify:
  - [ ] `RESEND_API_KEY`
  - [ ] `EMAIL_FROM`
- [ ] Redeploy en Coolify
- [ ] Probar creación de barbero con email
- [ ] Verificar email recibido
- [ ] Revisar Dashboard de Resend

---

**¡Listo!** 🎉 Ahora tu sistema puede enviar emails automáticamente.

**Última Actualización:** 2025-12-15  
**Versión:** 1.0
