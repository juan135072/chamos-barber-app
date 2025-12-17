# 🚀 Scripts de Preparación para Producción

**Proyecto:** Chamos Barber App  
**Versión:** 1.0  
**Fecha:** 2025-12-17

---

## 📁 ARCHIVOS EN ESTE DIRECTORIO

| Archivo | Descripción | Cuándo Usarlo |
|---------|-------------|---------------|
| `README.md` | Este archivo (guía rápida) | Para entender el proceso |
| `INSTRUCCIONES_LIMPIEZA_PRODUCCION.md` | Guía completa detallada | Leer ANTES de ejecutar |
| `backup_rapido.sql` | Script de backup | ⚠️ EJECUTAR PRIMERO |
| `cleanup_production_data.sql` | Script de limpieza | Ejecutar SEGUNDO |
| `verificacion_post_limpieza.sql` | Script de verificación | Ejecutar TERCERO |
| `rollback_limpieza.sql` | Script de rollback | Solo si algo sale mal |

---

## ⚡ GUÍA RÁPIDA (5 PASOS)

### 🎯 Objetivo
Eliminar todos los datos de prueba (citas, clientes, ventas, liquidaciones) manteniendo intactos los datos de configuración (barberos, servicios, categorías).

### ⏱️ Tiempo Total: ~10 minutos

---

### **PASO 1: LEER DOCUMENTACIÓN** (2 min)

```bash
# Lee este archivo primero
database/production/INSTRUCCIONES_LIMPIEZA_PRODUCCION.md
```

**📋 Checklist antes de continuar:**
- [ ] He leído las instrucciones completas
- [ ] Entiendo que los datos se eliminarán permanentemente
- [ ] Tengo acceso a Supabase SQL Editor
- [ ] Tengo 10 minutos disponibles

---

### **PASO 2: CREAR BACKUP** (2 min) ⚠️ OBLIGATORIO

**Ir a:** https://app.supabase.com → Chamos Barber → SQL Editor

**Ejecutar:**
```sql
-- Copiar y pegar TODO el contenido de:
database/production/backup_rapido.sql
```

**Resultado esperado:**
```
✅ Todos los backups creados exitosamente
📊 Tablas de backup: 7 creadas
```

**⚠️ NO CONTINÚES sin ver este mensaje de éxito**

---

### **PASO 3: LIMPIAR DATOS** (2 min)

**En el mismo SQL Editor:**

**Ejecutar:**
```sql
-- Copiar y pegar TODO el contenido de:
database/production/cleanup_production_data.sql
```

**Resultado esperado:**
```
✅ Liquidaciones eliminadas
✅ Facturas/Cobros eliminados
✅ Citas eliminadas
✅ Walk-In Clients eliminados
...
🎉 LIMPIEZA COMPLETADA EXITOSAMENTE
```

---

### **PASO 4: VERIFICAR LIMPIEZA** (2 min)

**Ejecutar:**
```sql
-- Copiar y pegar TODO el contenido de:
database/production/verificacion_post_limpieza.sql
```

**Resultado esperado:**
```
✅ citas: LIMPIADAS (0 registros)
✅ facturas: LIMPIADAS (0 registros)
✅ liquidaciones: LIMPIADAS (0 registros)
✅ walk_in_clients: LIMPIADAS (0 registros)

✅ barberos: CONSERVADOS (3-5 registros)
✅ servicios: CONSERVADOS (10-15 registros)
✅ categorias: CONSERVADOS (3-5 registros)

🎉 VERIFICACIÓN EXITOSA
✅ Base de datos lista para PRODUCCIÓN
```

---

### **PASO 5: VERIFICAR APLICACIÓN** (2 min)

**1. Recargar aplicación:**
```
https://chamosbarber.com/admin
(Ctrl + Shift + R para hard refresh)
```

**2. Verificar paneles:**
- ✅ Dashboard: Estadísticas en 0
- ✅ Citas: Tabla vacía
- ✅ Clientes: Sin clientes
- ✅ Walk-In: Estadísticas en 0
- ✅ Liquidaciones: Sin liquidaciones
- ✅ **Barberos: CON DATOS** ← Importante
- ✅ **Servicios: CON DATOS** ← Importante
- ✅ **Categorías: CON DATOS** ← Importante

**3. Crear cita de prueba:**
- Click "Nueva Cita"
- Llenar formulario
- Guardar
- ✅ Debe aparecer en la lista

**4. Registrar cliente Walk-In:**
- Ir a menú "Walk-In"
- Click "Registrar Cliente"
- Llenar datos
- ✅ Debe aparecer en la lista

---

## 🚨 EN CASO DE ERROR

### Si algo salió mal durante la limpieza:

**Opción 1: Rollback desde backups temporales**
```sql
-- Ejecutar:
database/production/rollback_limpieza.sql
```

**Opción 2: Restaurar desde Supabase Dashboard**
1. Ir a: https://app.supabase.com
2. Database → Backups
3. Seleccionar último backup
4. Click "Restore"
5. Esperar 5-10 minutos

---

## 📊 QUÉ SE ELIMINA vs QUÉ SE CONSERVA

### 🗑️ SE ELIMINAN (Datos de Prueba)
```
✅ citas                          (Reservas)
✅ notas_clientes                 (Notas)
✅ walk_in_clients                (Clientes sin reserva)
✅ facturas                        (Cobros)
✅ ventas_diarias_por_barbero      (Ventas)
✅ liquidaciones                   (Comisiones)
✅ comisiones_pendientes           (Pendientes)
✅ cierre_caja_diario              (Cierres)
✅ horarios_bloqueados             (Bloqueos temporales)
✅ solicitudes_barberos            (Solicitudes empleo)
```

### 🔒 SE CONSERVAN (Configuración)
```
🔒 barberos                        (Tu equipo)
🔒 servicios                       (Catálogo)
🔒 categorias_servicios            (Categorías)
🔒 horarios_trabajo                (Horarios base)
🔒 horarios_atencion               (Horarios generales)
🔒 configuracion_comisiones        (% comisiones)
🔒 admin_users                     (Usuarios admin)
🔒 roles_permisos                  (Permisos)
🔒 sitio_configuracion             (Config sitio)
🔒 barbero_portfolio               (Portfolios)
🔒 portfolio_galerias              (Galerías)
```

---

## 🔍 VERIFICACIÓN RÁPIDA (1 Comando)

**Ejecuta esto en Supabase SQL Editor para ver todo de un vistazo:**

```sql
SELECT 
    '🗑️ ELIMINADAS' as tipo,
    'citas' as tabla,
    COUNT(*)::TEXT || CASE WHEN COUNT(*) = 0 THEN ' ✅' ELSE ' ⚠️' END as estado
FROM citas
UNION ALL
SELECT '🗑️ ELIMINADAS', 'facturas', COUNT(*)::TEXT || CASE WHEN COUNT(*) = 0 THEN ' ✅' ELSE ' ⚠️' END FROM facturas
UNION ALL
SELECT '🗑️ ELIMINADAS', 'liquidaciones', COUNT(*)::TEXT || CASE WHEN COUNT(*) = 0 THEN ' ✅' ELSE ' ⚠️' END FROM liquidaciones
UNION ALL
SELECT '🗑️ ELIMINADAS', 'walk_in_clients', COUNT(*)::TEXT || CASE WHEN COUNT(*) = 0 THEN ' ✅' ELSE ' ⚠️' END FROM walk_in_clients
UNION ALL
SELECT '━━━━━━━━━━', '━━━━━━━━━━', '━━━━━━━━━━'
UNION ALL
SELECT '🔒 CONSERVADAS', 'barberos', COUNT(*)::TEXT || CASE WHEN COUNT(*) > 0 THEN ' ✅' ELSE ' ❌' END FROM barberos
UNION ALL
SELECT '🔒 CONSERVADAS', 'servicios', COUNT(*)::TEXT || CASE WHEN COUNT(*) > 0 THEN ' ✅' ELSE ' ❌' END FROM servicios
UNION ALL
SELECT '🔒 CONSERVADAS', 'categorias', COUNT(*)::TEXT || CASE WHEN COUNT(*) > 0 THEN ' ✅' ELSE ' ❌' END FROM categorias_servicios
ORDER BY tipo DESC, tabla;
```

**Resultado esperado:**
```
🗑️ ELIMINADAS    | citas           | 0 ✅
🗑️ ELIMINADAS    | facturas        | 0 ✅
🗑️ ELIMINADAS    | liquidaciones   | 0 ✅
🗑️ ELIMINADAS    | walk_in_clients | 0 ✅
━━━━━━━━━━        | ━━━━━━━━━━      | ━━━━━━━━━━
🔒 CONSERVADAS   | barberos        | 4 ✅
🔒 CONSERVADAS   | categorias      | 3 ✅
🔒 CONSERVADAS   | servicios       | 12 ✅
```

---

## ❓ PREGUNTAS FRECUENTES

### ¿Puedo deshacer la limpieza?
**SÍ**, si ejecutaste `backup_rapido.sql` primero. Usa `rollback_limpieza.sql`.

### ¿Perderé mis barberos?
**NO.** Los barberos se conservan 100%.

### ¿Perderé mis servicios y precios?
**NO.** Servicios y categorías se conservan 100%.

### ¿Cuánto tiempo toma?
**~10 minutos** (backup + limpieza + verificación).

### ¿Es reversible?
**SÍ**, SOLO si hiciste backup antes.

### ¿Debo notificar al equipo?
**SÍ**, avisa que la aplicación tendrá datos en 0 temporalmente.

---

## 📞 SOPORTE

Si tienes problemas:

1. **Revisar documentación:** `INSTRUCCIONES_LIMPIEZA_PRODUCCION.md`
2. **Verificar errores:** Leer mensajes del SQL Editor
3. **Ejecutar rollback:** Si es necesario usar `rollback_limpieza.sql`
4. **Contactar soporte:** Con screenshots de errores

---

## 🎯 CHECKLIST FINAL

Antes de dar por terminado:

- [ ] ✅ Backup ejecutado exitosamente
- [ ] ✅ Limpieza ejecutada sin errores
- [ ] ✅ Verificación post-limpieza OK
- [ ] ✅ Aplicación web verificada
- [ ] ✅ Barberos presentes en panel admin
- [ ] ✅ Servicios presentes en panel admin
- [ ] ✅ Cita de prueba creada exitosamente
- [ ] ✅ Cliente Walk-In registrado exitosamente
- [ ] ✅ Equipo notificado del cambio
- [ ] ✅ Base de datos lista para producción 🎉

---

## 🔗 ENLACES ÚTILES

- **Supabase:** https://app.supabase.com
- **Admin Panel:** https://chamosbarber.com/admin
- **Repositorio:** https://github.com/juan135072/chamos-barber-app

---

## 📈 PRÓXIMOS PASOS

Después de la limpieza:

1. ✅ Anunciar lanzamiento a producción
2. ✅ Monitorear primeras reservas reales
3. ✅ Verificar notificaciones funcionan
4. ✅ Validar flujo de facturación
5. ✅ Probar generación de liquidaciones
6. ✅ Celebrar el lanzamiento 🎉

---

**¿Listo para comenzar?**  
👉 Lee primero: `INSTRUCCIONES_LIMPIEZA_PRODUCCION.md`  
👉 Luego ejecuta: **PASO 1: Backup** → **PASO 2: Limpieza** → **PASO 3: Verificación**

---

**Última Actualización:** 2025-12-17  
**Estado:** ✅ Listo para usar  
**Autor:** Chamos Barber Dev Team
