# 📝 Sistema de Notas de Clientes - Guía Completa

## 🎯 Descripción

El sistema de notas de clientes permite a los barberos guardar información importante sobre sus clientes, como:
- Preferencias de corte y estilo
- Alergias a productos
- Detalles especiales (ej: "le gusta la barba corta", "usa degradado bajo")
- Historial de trabajos realizados
- Cualquier información relevante para próximas visitas

## ✨ Características

### 1. **Notas por Cliente**
- Cada barbero puede guardar múltiples notas por cliente
- Las notas están organizadas cronológicamente
- Se pueden agregar desde la vista de citas

### 2. **Sistema de Etiquetas**
- 8 etiquetas predefinidas:
  - Corte especial
  - Alergia
  - Preferencia de estilo
  - Producto recomendado
  - Cliente VIP
  - Primera visita
  - Cliente frecuente
  - Solicitud especial
- Posibilidad de crear etiquetas personalizadas

### 3. **Indicador Visual**
- Botón dorado si el cliente tiene notas guardadas
- Muestra la cantidad de notas disponibles
- Acceso rápido desde cada cita

### 4. **Historial Completo**
- Ver todas las notas guardadas del cliente
- Fecha y hora de cada nota
- Capacidad de eliminar notas antiguas
- Asociación con la cita específica (opcional)

## 📋 Configuración en Supabase

### Paso 1: Ejecutar Script SQL

1. Ir a **Supabase Dashboard** → https://app.supabase.com
2. Seleccionar tu proyecto
3. Ir a **SQL Editor** (menú lateral izquierdo)
4. Clic en **New Query**
5. Copiar y pegar el contenido del archivo `supabase/setup-notas-clientes.sql`
6. Clic en **Run** o presionar `Ctrl + Enter`

### Paso 2: Verificar la Creación

Ejecuta esta query para verificar que la tabla se creó correctamente:

```sql
-- Verificar tabla
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'notas_clientes';

-- Verificar estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notas_clientes'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notas_clientes';
```

### Paso 3: Verificar RLS

La tabla debe tener RLS habilitado con estas políticas:

- ✅ `barberos_can_view_own_notas` - SELECT
- ✅ `barberos_can_create_notas` - INSERT
- ✅ `barberos_can_update_own_notas` - UPDATE
- ✅ `barberos_can_delete_own_notas` - DELETE
- ✅ `admin_can_view_all_notas` - SELECT (admin)
- ✅ `admin_can_modify_all_notas` - ALL (admin)

## 🚀 Uso del Sistema

### Desde el Panel de Barbero

#### 1. Ver Notas Existentes

1. Ir a **Panel de Barbero** → **Mis Citas**
2. Buscar la cita del cliente
3. Si el botón muestra un número (ej: "3 Notas"), el cliente ya tiene notas guardadas
4. Hacer clic en el botón **"Ver Notas"** o **"Agregar Nota"**

#### 2. Agregar Nueva Nota

1. En el modal que se abre, escribir la nota en el área de texto
2. (Opcional) Agregar etiquetas haciendo clic en las predefinidas
3. (Opcional) Agregar etiquetas personalizadas
4. Hacer clic en **"Guardar Nota"**

**Ejemplos de Notas Útiles**:
- "Cliente prefiere corte fade con degradado bajo"
- "Alérgico a productos con alcohol"
- "Le gusta usar cera de fijación fuerte"
- "Pedir recordatorio 2 días antes de la cita"
- "Cliente habitual, viene cada 15 días"

#### 3. Gestionar Etiquetas

**Etiquetas Predefinidas**:
- Hacer clic en cualquier etiqueta predefinida para agregarla
- Hacer clic en la X para removerla

**Etiquetas Personalizadas**:
1. Escribir el nombre en el campo "Etiqueta personalizada"
2. Presionar Enter o clic en el botón +
3. La etiqueta se agregará a la nota

#### 4. Ver Historial

El historial muestra:
- Todas las notas anteriores del cliente
- Fecha y hora de creación
- Etiquetas asociadas
- Opción para eliminar notas obsoletas

## 🎨 Interfaz Visual

### Botón de Notas

**Sin notas guardadas**:
```
┌─────────────────────┐
│  📝  Agregar Nota   │
└─────────────────────┘
```

**Con notas guardadas** (dorado):
```
┌─────────────────────┐
│  📝  3 Notas       │  ← Número de notas
└─────────────────────┘
```

### Modal de Notas

```
┌───────────────────────────────────────────────┐
│  📝 Notas del Cliente                      ✕ │
│  Juan Pérez • juan@email.com                 │
├───────────────────────────────────────────────┤
│                                               │
│  ➕ Agregar Nueva Nota                        │
│  ┌─────────────────────────────────────────┐ │
│  │ Escribe tu nota aquí...                 │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  🏷️ Etiquetas:                                │
│  [Corte especial] [Alergia] [Preferencia]   │
│  [+ Personalizada]                            │
│                                               │
│  [💾 Guardar Nota]                            │
│                                               │
├───────────────────────────────────────────────┤
│  📜 Historial de Notas (3)                    │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ 📅 15 de noviembre, 2025 - 14:30       │ │
│  │ Cliente prefiere corte fade bajo        │ │
│  │ 🏷️ [Corte especial] [Cliente frecuente] │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │ 📅 1 de noviembre, 2025 - 10:15        │ │
│  │ Alérgico a productos con alcohol        │ │
│  │ 🏷️ [Alergia]                            │ │
│  └─────────────────────────────────────────┘ │
│                                               │
└───────────────────────────────────────────────┘
```

## 📊 Estructura de Datos

### Tabla: notas_clientes

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `barbero_id` | UUID | ID del barbero (FK) |
| `cliente_email` | VARCHAR(255) | Email del cliente |
| `cliente_nombre` | VARCHAR(255) | Nombre del cliente |
| `cliente_telefono` | VARCHAR(50) | Teléfono del cliente |
| `notas` | TEXT | Contenido de la nota |
| `cita_id` | UUID | ID de la cita relacionada (opcional) |
| `tags` | TEXT[] | Array de etiquetas |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

### Ejemplo de Registro

```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "barbero_id": "barbero-uuid-123",
  "cliente_email": "juan@email.com",
  "cliente_nombre": "Juan Pérez",
  "cliente_telefono": "+56987654321",
  "notas": "Cliente prefiere corte fade con degradado bajo. Le gusta usar cera de fijación fuerte.",
  "cita_id": "cita-uuid-456",
  "tags": ["Corte especial", "Cliente frecuente"],
  "created_at": "2025-11-06T14:30:00.000Z",
  "updated_at": "2025-11-06T14:30:00.000Z"
}
```

## 🔐 Seguridad (RLS)

### Políticas Implementadas

1. **Barberos solo ven sus propias notas**
   - Un barbero NO puede ver notas de otros barberos
   - Filtro automático por `barbero_id`

2. **Barberos pueden CRUD sus notas**
   - Crear, leer, actualizar y eliminar sus propias notas
   - No pueden modificar notas de otros barberos

3. **Administradores tienen acceso completo**
   - Ver todas las notas de todos los barberos
   - Modificar o eliminar cualquier nota (con precaución)

## 💡 Casos de Uso

### Caso 1: Alergia a Productos
```
Nota: "Cliente alérgico a productos con alcohol y fragancias fuertes"
Tags: [Alergia]
Uso: El barbero revisa antes de aplicar productos
```

### Caso 2: Preferencia de Estilo
```
Nota: "Prefiere fade bajo (nivel 2-3), barba recortada a 5mm"
Tags: [Corte especial] [Preferencia de estilo]
Uso: Recordatorio del estilo preferido para mantener consistencia
```

### Caso 3: Cliente VIP
```
Nota: "Cliente frecuente, viene cada 15 días. Muy puntual."
Tags: [Cliente VIP] [Cliente frecuente]
Uso: Prioridad en atención y recordatorios personalizados
```

### Caso 4: Primera Visita
```
Nota: "Primera visita. Nervioso con las máquinas. Tomarse tiempo extra."
Tags: [Primera visita] [Solicitud especial]
Uso: Atención especial en la primera experiencia
```

## 🧪 Testing

### Verificar Funcionamiento

1. **Crear una nota**:
   - Login como barbero
   - Ir a una cita
   - Clic en "Agregar Nota"
   - Escribir y guardar

2. **Verificar en base de datos**:
```sql
SELECT * FROM notas_clientes 
WHERE barbero_id = 'tu-barbero-uuid'
ORDER BY created_at DESC
LIMIT 5;
```

3. **Ver historial**:
   - Abrir modal de notas del mismo cliente
   - Verificar que aparece la nota guardada

4. **Agregar etiquetas**:
   - Crear nota con etiquetas
   - Verificar que se guardan correctamente

5. **Eliminar nota**:
   - Clic en icono de basura
   - Confirmar eliminación
   - Verificar que desaparece del historial

## 🚨 Troubleshooting

### Problema: No se guardan las notas

**Solución**:
1. Verificar que la tabla existe:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name = 'notas_clientes';
```

2. Verificar RLS:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'notas_clientes';
```

3. Verificar que el barbero tiene `barbero_id`:
```sql
SELECT b.id, b.nombre, u.email 
FROM barberos b 
JOIN usuarios u ON b.user_id = u.id 
WHERE u.email = 'email@barbero.com';
```

### Problema: No aparecen notas guardadas

**Solución**:
1. Verificar que las notas existen:
```sql
SELECT * FROM notas_clientes 
WHERE cliente_email = 'email@cliente.com';
```

2. Verificar filtro por barbero:
```sql
SELECT * FROM notas_clientes 
WHERE barbero_id = 'tu-barbero-uuid' 
AND cliente_email = 'email@cliente.com';
```

### Problema: Error de permisos

**Solución**:
1. Verificar que RLS está habilitado:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notas_clientes';
```

2. Re-ejecutar script de políticas:
```sql
-- Desde supabase/setup-notas-clientes.sql
-- Copiar solo la sección de RLS POLICIES
```

## 📈 Mejoras Futuras

### Potenciales Features:
- [ ] Búsqueda de notas por etiquetas
- [ ] Exportar historial de notas de un cliente
- [ ] Adjuntar fotos a las notas (antes/después)
- [ ] Compartir notas entre barberos del mismo local
- [ ] Recordatorios automáticos basados en notas
- [ ] Estadísticas de clientes VIP vs regulares
- [ ] Integración con sistema de fidelización
- [ ] Notificaciones cuando un cliente con alergias agenda

## 📚 Referencias

- **Archivo SQL**: `supabase/setup-notas-clientes.sql`
- **Componente Modal**: `src/components/barbero/NotasClienteModal.tsx`
- **Componente Citas**: `src/components/barbero/CitasSection.tsx`
- **Types Database**: `lib/database.types.ts`

---

**Versión**: 1.0  
**Fecha**: 6 de Noviembre, 2025  
**Autor**: Sistema Chamos Barber App  
**Estado**: ✅ Funcional y listo para usar
