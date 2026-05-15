# ⚡ QUICK FIX: Citas No Visibles en Admin

## 🎯 Problema
Citas creadas desde `/reservar` NO aparecen en panel `/admin` → tab Citas

## 🔧 Solución Rápida (2 minutos)

### Paso 1: Abrir Supabase
```
URL: https://supabase.chamosbarber.com
Usuario: admin@chamosbarber.com
```

### Paso 2: Ir a SQL Editor
```
Panel izquierdo → SQL Editor → New Query
```

### Paso 3: Copiar y Ejecutar este SQL

```sql
-- Limpiar políticas viejas
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON citas;
DROP POLICY IF EXISTS "Enable read access for all users" ON citas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer todas las citas" ON citas;

-- Habilitar RLS
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir crear citas sin login (desde /reservar)
CREATE POLICY "Permitir crear citas anónimas"
ON citas FOR INSERT TO anon
WITH CHECK (true);

-- Política 2: Permitir leer TODAS las citas para usuarios con login
CREATE POLICY "Permitir leer todas las citas a usuarios autenticados"
ON citas FOR SELECT TO authenticated
USING (true);

-- Política 3: Permitir actualizar citas
CREATE POLICY "Permitir actualizar citas a usuarios autenticados"
ON citas FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- Política 4: Permitir eliminar citas
CREATE POLICY "Permitir eliminar citas a usuarios autenticados"
ON citas FOR DELETE TO authenticated
USING (true);

-- Política 5: Service role puede hacer todo (backup)
CREATE POLICY "Service role tiene acceso completo"
ON citas FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

### Paso 4: Click en "RUN" (o Ctrl+Enter)

### Paso 5: Verificar
```sql
-- Ver políticas creadas
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'citas';

-- Ver citas existentes (deberías ver TODAS)
SELECT COUNT(*) as total FROM citas;
SELECT * FROM citas ORDER BY created_at DESC LIMIT 5;
```

## ✅ Test

1. **Crear nueva cita**:
   - Abre navegador incógnito
   - Ve a https://chamosbarber.com/reservar
   - Completa y envía formulario

2. **Verificar en admin**:
   - Login normal en https://chamosbarber.com/admin
   - Tab "Citas"
   - Click botón "Actualizar"
   - ✅ Deberías ver la cita nueva

## 🆘 Si No Funciona

Ver guía completa: [`CITAS_NO_VISIBLES_ADMIN.md`](./CITAS_NO_VISIBLES_ADMIN.md)

O ejecutar script completo:
```bash
# En Supabase SQL Editor
-- Copiar TODO el contenido de:
/scripts/SQL/fix-citas-rls.sql
```

---

**Tiempo estimado**: 2-3 minutos  
**Dificultad**: Fácil  
**Requiere**: Acceso a Supabase Studio
