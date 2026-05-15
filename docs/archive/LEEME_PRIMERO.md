# 🚀 GUÍA RÁPIDA - Sistema POS

## ⚡ Ejecutar Migraciones en 3 Pasos

### 1️⃣ Acceder a Supabase

Abre tu navegador:
```
https://supabase.chamosbarber.com/
```

**Credenciales:**
- Usuario: (tu usuario admin)
- Password: `IGnWZHipT8IeSI7j`

---

### 2️⃣ Ir al SQL Editor

1. En el menú lateral izquierdo → **"SQL Editor"**
2. Click en **"New query"**

---

### 3️⃣ Copiar, Pegar y Ejecutar

**Opción A: UN SOLO ARCHIVO (Recomendado)**

1. Abre el archivo: **`EJECUTAR_ESTO_EN_SUPABASE.sql`**
2. Selecciona TODO (Ctrl+A)
3. Copia (Ctrl+C)
4. Pega en Supabase SQL Editor (Ctrl+V)
5. Click en **"RUN"** ▶️

**Opción B: Archivos Separados**

Si la Opción A da error, ejecuta los archivos en orden:

1. Primero: `supabase/migrations/add_pos_system.sql`
2. Segundo: `supabase/migrations/add_cajero_role.sql`

---

## ✅ Verificar que Funcionó

Al final de la ejecución deberías ver una tabla similar a:

```
🎉 ¡TODAS LAS MIGRACIONES COMPLETADAS!

tipo                    | cantidad
------------------------+----------
Tablas creadas          | 3
Vistas creadas          | 3
Funciones creadas       | 3
Roles configurados      | 3
Barberos con comisión   | X (tus barberos activos)
```

Si ves esa tabla, **¡TODO ESTÁ LISTO!** ✅

---

## 🆘 ¿Tienes Problemas?

Lee la documentación completa:
- **`docs/MANUAL_MIGRATION_GUIDE.md`** → Guía detallada paso a paso
- **`docs/POS_SYSTEM_COMPLETE_GUIDE.md`** → Documentación completa del sistema

---

## 📞 Una vez completado, avísame y continuaré con:

### Opción A: Crear Interfaz POS 💻
- Página `/pos` funcional
- Cobrar ventas
- Buscar citas
- Resumen del día
- ⏱️ **3-4 horas**

### Opción B: Gestión de Usuarios 👥
- Tab "Usuarios" en admin
- Crear cajeros
- Asignar roles
- Activar/desactivar
- ⏱️ **2 horas**

### Opción C: Helpers TypeScript 📦
- Actualizar tipos
- Helpers de permisos
- Middleware de autenticación
- ⏱️ **30 minutos**

---

**¿Qué prefieres hacer después?** 🚀
