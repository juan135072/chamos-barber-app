# ✅ Checklist Rápido: Solucionar Error RLS

**Error:** `new row violates row-level security policy for table "citas"`  
**Tiempo estimado:** 5-10 minutos  
**Dificultad:** Fácil

---

## 🎯 Acción Inmediata (3 pasos)

### **Paso 1: Abrir Coolify** ⏱️ 1 min

1. Ve a tu panel de Coolify
2. Busca el proyecto **"chamos-barber-app"**
3. Click en el proyecto

### **Paso 2: CORREGIR Variable (Ya Existe pero está INCORRECTA)** ⏱️ 2 min

⚠️ **IMPORTANTE:** La variable ya existe en Coolify pero tiene la clave de Supabase Cloud (antigua) en vez de self-hosted (actual).

1. Busca sección **"Environment Variables"**
2. Busca la variable existente: **`SUPABASE_SERVICE_ROLE_KEY`**
3. Click en **"Edit"** o edita el valor
4. **REEMPLAZA** el valor actual con este:

```
Valor CORRECTO (self-hosted):
eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0
```

5. **También actualiza en Preview Deployments:**
   - Busca la misma variable en Preview
   - Reemplaza con el mismo valor
   - Además, cambia `NEXT_PUBLIC_SUPABASE_URL` de `http://` a `https://`

6. Click en **"Save"** o **"Guardar"**

### **Paso 3: Redesplegar** ⏱️ 3-5 min

1. Click en **"Redeploy"** o **"Deploy Again"**
2. Espera que termine el build (verás logs en pantalla)
3. Cuando veas "✓ Compiled successfully" → ¡Listo!

---

## 🧪 Probar la Solución (1 min)

1. Abre tu aplicación en el navegador
2. Ve a la página de **Reservas**
3. Completa el formulario y haz click en **"Reservar"**
4. **Resultado esperado:**
   ```
   ✅ ¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.
   ```

Si ves este mensaje → **Problema resuelto** ✅

---

## ⚠️ Si el Error Persiste

### **Opción A: Limpiar Cache**

1. En Coolify, busca **"Clear Cache"**
2. Click en **"Clear Cache"**
3. Vuelve a hacer click en **"Redeploy"**
4. Espera el nuevo build

### **Opción B: Forzar Rebuild desde Git**

```bash
# En tu terminal local:
cd /home/user/webapp
git commit --allow-empty -m "chore: Force Coolify rebuild"
git push origin master
```

Espera 3-5 minutos a que Coolify detecte el push y redespliegue automáticamente.

### **Opción C: Verificar Otras Variables**

Asegúrate que también existen estas variables en Coolify:

```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.chamosbarber.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA
```

---

## 📋 Checklist de Verificación

Marca cada ítem al completarlo:

### **Configuración**
- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` agregada en Coolify
- [ ] Variable guardada correctamente
- [ ] Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` también existen

### **Despliegue**
- [ ] Click en "Redeploy" o push forzado a git
- [ ] Build iniciado (ver logs en Coolify)
- [ ] Build completado sin errores TypeScript
- [ ] Mensaje "✓ Compiled successfully" visible

### **Verificación**
- [ ] Aplicación carga sin errores
- [ ] Página de reservas accesible
- [ ] Formulario de reserva funciona
- [ ] **Prueba real: Cita creada exitosamente**
- [ ] Mensaje de éxito visible
- [ ] No hay error RLS en consola del navegador

### **Confirmación Final**
- [ ] Verificado en Supabase que la cita fue insertada
- [ ] Estado de la cita es "pendiente"
- [ ] Todos los datos del cliente están correctos

---

## 🔍 Diagnóstico Rápido

Si algo no funciona, verifica:

### **¿Build falla?**
- [ ] Revisa logs de build en Coolify
- [ ] Busca errores de TypeScript
- [ ] Si hay errores TS: Ver documento `EXITO_DEPLOYMENT_COOLIFY.md`

### **¿Build exitoso pero error RLS persiste?**
- [ ] Verifica que la variable `SUPABASE_SERVICE_ROLE_KEY` exista
- [ ] Revisa que el nombre sea exacto (sin espacios)
- [ ] Revisa que el valor sea el JWT completo (empieza con `eyJ0...`)
- [ ] Limpia cache y redespliega

### **¿Variables agregadas pero no se aplican?**
- [ ] Haz rebuild completo (Clear Cache + Redeploy)
- [ ] O haz push vacío para forzar nuevo despliegue
- [ ] Espera 5 minutos después del despliegue

---

## 💡 Explicación Rápida

**¿Por qué ocurre el error?**
- Coolify tiene configurada la clave de **Supabase Cloud (antigua)** 
- Tu aplicación usa **Supabase Self-Hosted (VPS actual)**
- Las claves no coinciden → Error de autenticación → Fallback a ANON_KEY → Error RLS

**¿Cómo identificar el problema?**
- **Clave incorrecta:** Tiene `"ref": "kdpahtfticmgkmzbyiqs"` en el JWT
- **Clave correcta:** No tiene campo `"ref"` (es genérica para self-hosted)

**¿Cómo lo soluciona?**
- Reemplazar la clave de Supabase Cloud por la de self-hosted
- Ahora el API route puede autenticarse correctamente con tu VPS
- Con SERVICE_ROLE_KEY válida, puede INSERT sin restricciones RLS
- Esto permite que clientes anónimos reserven citas

**¿Es seguro?**
- ✅ Sí, porque SERVICE_ROLE_KEY solo se usa en el backend
- ✅ El API route tiene 5 validaciones de seguridad
- ✅ La clave nunca se expone al cliente

**Documentación detallada:** Ver `FIX_RLS_CLAVES_INCORRECTAS.md`

---

## 📞 Ayuda Adicional

### **Documentos Relacionados**

1. **`SOLUCION_ERROR_RLS.md`**
   - Explicación detallada del problema
   - Soluciones alternativas
   - Troubleshooting avanzado

2. **`COOLIFY_CONFIGURACION.md`**
   - Guía completa de configuración de Coolify
   - Métodos alternativos de configuración
   - Solución de problemas específicos de Coolify

3. **`EXITO_DEPLOYMENT_COOLIFY.md`**
   - Historia completa del deployment exitoso
   - Errores de TypeScript y sus soluciones
   - Commits relacionados

---

## 🚀 Próximos Pasos (Después de Resolver)

Cuando todo funcione:

1. **Probar todas las funcionalidades:**
   - [ ] Crear cita
   - [ ] Ver citas en admin panel
   - [ ] Editar citas
   - [ ] Cancelar citas

2. **Monitoreo:**
   - [ ] Configurar alertas en Coolify
   - [ ] Revisar logs periódicamente
   - [ ] Verificar métricas de uso

3. **Optimización (opcional):**
   - [ ] Agregar rate limiting al API route
   - [ ] Implementar notificaciones por email/SMS
   - [ ] Mejorar UI/UX del formulario de reservas

---

## ✅ Confirmación de Éxito

**Has resuelto el problema cuando:**

1. ✅ No hay error RLS al crear citas
2. ✅ Mensaje de éxito aparece en pantalla
3. ✅ Cita aparece en Supabase
4. ✅ Admin puede ver la cita en panel de administración

**Tiempo total esperado: 5-10 minutos**

---

## 📝 Notas Importantes

- **No modifiques el código:** El código ya está correcto
- **Solo necesitas configurar la variable en Coolify**
- **Si tienes problemas:** Lee `SOLUCION_ERROR_RLS.md`
- **Para soporte detallado:** Lee `COOLIFY_CONFIGURACION.md`

---

## 🎉 ¡Listo!

Una vez completado este checklist:
- ✅ Error RLS resuelto
- ✅ Sistema de reservas funcionando
- ✅ Aplicación lista para producción

**Commit actual:** 29b389f  
**Branch:** master  
**Estado del código:** ✅ CORRECTO

**¡El problema es solo de configuración, no de código!**

---

**Última actualización:** 2025-11-06  
**Tiempo estimado total:** 5-10 minutos  
**Dificultad:** ⭐ Fácil (solo configuración)
