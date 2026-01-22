# 🚀 Guía de Migración: Chamos Barber App a Nuevo VPS

Esta guía detalla paso a paso cómo migrar tu aplicación y base de datos Supabase desde tu VPS actual a un nuevo servidor con Coolify.

---

## 📋 Prerrequisitos

1.  **Acceso al VPS Actual**: Para realizar backups.
2.  **Nuevo VPS**: Con Coolify ya instalado y funcionando.
3.  **Acceso al Repositorio**: Para desplegar la app en el nuevo servidor.

---

## 1️⃣ Backup del Servidor Actual

Antes de tocar nada, asegurémonos de tener una copia de seguridad de los datos.

### 1.1. Backup de Datos
Ejecuta el script de backup en tu entorno local (conectado al servidor actual):

```bash
# Asegúrate de que .env.local apunta al servidor ACTUAL
node scripts/backup-database.js
```

Esto creará un archivo JSON en la carpeta `backups/` (ej: `backup-2025-11-30-1200.json`).

### 1.2. Backup del Schema (Estructura)
El script anterior solo guarda *datos*. Necesitamos la estructura de las tablas.

1.  Ve al **Dashboard de Supabase** (o tu instancia actual).
2.  Ve a **SQL Editor**.
3.  Ejecuta este comando para ver si puedes extraer el DDL (o usa `pg_dump` si tienes acceso por terminal):
    *Nota: Si usas Coolify/Supabase self-hosted, lo ideal es usar `pg_dump` desde la terminal del servidor.*

    ```bash
    # Desde la terminal del VPS actual (SSH)
    docker exec -it <supabase-db-container-id> pg_dump -U postgres -s postgres > schema_dump.sql
    ```
    
    *Si no tienes acceso a terminal, tendrás que recrear las tablas usando los scripts en la carpeta `sql/` y `supabase/migrations/` de este repositorio.*

---

## 2️⃣ Configuración del Nuevo Servidor (Coolify)

### 2.1. Crear Proyecto en Coolify
1.  Entra a tu nuevo Coolify.
2.  Crea un nuevo **Project** -> **Environment** (ej: Production).
3.  Agrega un nuevo recurso: **Supabase** (Database).
    *   Coolify desplegará una instancia completa de Supabase (Studio, API, DB, etc.).
    *   Anota las credenciales que te da: `SERVICE_ROLE_KEY`, `ANON_KEY`, `DB_PASSWORD`, etc.

### 2.2. Configurar la App (Next.js)
1.  En el mismo proyecto, agrega un recurso: **Application** -> **Public Repository**.
2.  Usa la URL de tu repo GitHub.
3.  En **Environment Variables**, configura las nuevas credenciales de tu NUEVO Supabase:
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=https://<tu-nueva-url-supabase>
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-nueva-anon-key>
    SUPABASE_SERVICE_ROLE_KEY=<tu-nueva-service-key>
    ```

---

## 3️⃣ Restauración en el Nuevo Servidor

Ahora vamos a poner los datos en el nuevo servidor.

### 3.1. Preparar Entorno Local
Edita tu archivo `.env.local` en tu computadora para apuntar al **NUEVO** servidor:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<tu-nueva-url-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-nueva-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-nueva-service-key>
```

### 3.2. Restaurar Schema (Estructura)
Si tienes el `schema_dump.sql`, ejecútalo en el nuevo Supabase (vía SQL Editor en el nuevo Studio).

Si no, ejecuta las migraciones del repositorio:
```bash
node scripts/execute-migrations.js
```
*Esto creará las tablas base.*

### 3.3. Restaurar Datos
Usa el script de restauración que hemos creado, pasando la ruta del backup que hiciste en el paso 1.1:

```bash
node scripts/restore-database.js backups/backup-2025-xx-xx.json
```

---

## 4️⃣ Verificación Final

1.  **Verificar Datos**: Entra al Supabase Studio del nuevo servidor y revisa que las tablas `barberos`, `citas`, etc., tengan datos.
2.  **Desplegar App**: En Coolify, dale "Deploy" a tu aplicación Next.js.
3.  **Probar**: Entra a la URL de tu nueva app y prueba iniciar sesión o crear una cita.

---

## 🆘 Solución de Problemas常见

-   **Error de conexión**: Verifica que `NEXT_PUBLIC_SUPABASE_URL` no tenga `/` al final.
-   **Error RLS**: Si los datos se restauran pero no se ven en la app, verifica las políticas RLS. Puedes correr `node scripts/fix-rls-execute.js`.
