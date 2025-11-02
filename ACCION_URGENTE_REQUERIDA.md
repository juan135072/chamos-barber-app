# 🚨 ACCIÓN URGENTE REQUERIDA

## ⚠️ PROBLEMA DETECTADO

Las **reservas NO funcionan** en la página web `/reservar`.

**Error**: `"Error al reservar la cita. Por favor, inténtalo de nuevo."`  
**Causa**: Falta política de seguridad (RLS) en Supabase

---

## ✅ SOLUCIÓN (5 minutos)

### 🎯 LO QUE DEBES HACER AHORA:

1. **Ir a Supabase Studio**:  
   👉 https://supabase.chamosbarber.com/

2. **Abrir SQL Editor**:  
   - Click en "SQL Editor" (menú lateral izquierdo)
   - Click en "New query"

3. **Ejecutar Script**:  
   - Abrir el archivo: `scripts/SQL/URGENT-fix-anon-insert-rls.sql`
   - Copiar **TODO** el contenido
   - Pegar en el editor SQL de Supabase
   - Click en "RUN" (botón verde)

4. **Verificar**:  
   - Deberías ver: "✅ POLÍTICAS CREADAS"
   - Probar reserva en `/reservar`
   - ✅ Debería funcionar

---

## 📁 Archivos Creados

### 1. Script SQL (EJECUTAR YA)
```
scripts/SQL/URGENT-fix-anon-insert-rls.sql
```

### 2. Documentación Completa
```
docs/fixes/URGENT_ERROR_RESERVAS_42501.md
```

### 3. Código con Debug (ya actualizado)
```
lib/supabase-helpers.ts
src/pages/reservar.tsx
```

---

## 🔍 ¿Qué Hace el Script?

Habilita la política de seguridad que permite a **usuarios sin login** crear citas desde la web.

**Técnicamente**: Crea política RLS `anon_insert_citas` para la tabla `citas`.

---

## ❓ ¿Preguntas?

Lee la guía completa: `docs/fixes/URGENT_ERROR_RESERVAS_42501.md`

---

## ✅ Después de Ejecutar

- [ ] Script ejecutado sin errores
- [ ] Aparecen 6 políticas creadas
- [ ] Prueba de reserva exitosa
- [ ] Eliminar este archivo: `ACCION_URGENTE_REQUERIDA.md`

---

**Fecha**: 2025-11-02  
**Prioridad**: 🔴 CRÍTICA  
**Tiempo**: ~5 minutos  
**Estado**: ⚠️ PENDIENTE
