# 🧪 GUÍA: Insertar Datos de Prueba en Supabase

## 📍 PASO 1: Acceder a Supabase Dashboard

1. Ve a: **https://api.chamosbarber.com:8000** (o tu dashboard de Supabase)
2. Inicia sesión
3. Selecciona tu proyecto: **Chamos Barber**
4. En el menú lateral, busca: **📝 SQL Editor**

---

## 📄 PASO 2: Ejecutar el SQL

Copia y pega el contenido del archivo: **`DATOS_PRUEBA_TESTING.sql`**

O copia esto directamente:

```sql
-- 1️⃣ CATEGORÍAS DE SERVICIOS
INSERT INTO categorias_servicios (nombre, descripcion, orden, activo)
VALUES 
  ('Cortes', 'Cortes de cabello profesionales y modernos', 1, true),
  ('Barba', 'Servicios de arreglo y cuidado de barba', 2, true),
  ('Tratamientos', 'Tratamientos capilares y faciales', 3, true)
ON CONFLICT (nombre) DO NOTHING;

-- 2️⃣ SERVICIOS (6 servicios: 2 por categoría)
INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 'Corte Clásico', 'Corte tradicional con tijera y máquina, incluye lavado', 8000, 30, c.id, true, 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Cortes'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 'Fade Moderno', 'Degradado profesional con diseño, incluye lavado y acabado', 12000, 45, c.id, true, 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Cortes'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 'Arreglo de Barba', 'Perfilado y arreglo completo de barba con navaja', 6000, 20, c.id, true, 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Barba'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 'Barba Premium', 'Arreglo completo con toalla caliente, aceites y masaje facial', 10000, 35, c.id, true, 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Barba'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 'Tratamiento Capilar', 'Hidratación profunda y tratamiento anticaída', 15000, 40, c.id, true, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Tratamientos'
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO servicios (nombre, descripcion, precio, duracion_minutos, categoria_id, activo, imagen_url)
SELECT 'Limpieza Facial', 'Limpieza profunda de cutis con mascarilla y extracción', 18000, 50, c.id, true, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400'
FROM categorias_servicios c WHERE c.nombre = 'Tratamientos'
ON CONFLICT (nombre) DO NOTHING;

-- 3️⃣ BARBEROS (2)
INSERT INTO barberos (nombre, apellido, email, telefono, especialidad, anos_experiencia, foto_url, activo, descripcion_corta, instagram, calificacion_promedio)
VALUES 
  ('Carlos', 'Pérez', 'carlos@chamosbarber.com', '+56912345678', 'Cortes clásicos y modernos', 8, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', true, 'Barbero venezolano con 8 años de experiencia. Especialista en fades y diseños.', '@carlos_barber_chile', 4.8),
  ('Miguel', 'Rodríguez', 'miguel@chamosbarber.com', '+56987654321', 'Barba y tratamientos faciales', 3, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', true, 'Especialista en cuidado de barba y tratamientos. Atención personalizada.', '@miguel_barbershop', 4.5)
ON CONFLICT (email) DO NOTHING;

-- 4️⃣ HORARIOS (Lun-Sáb 9:00-19:00 para ambos barberos)
DO $$
DECLARE
  barbero RECORD;
  dia INT;
BEGIN
  FOR barbero IN SELECT id FROM barberos WHERE activo = true LOOP
    FOR dia IN 1..6 LOOP
      INSERT INTO horarios_barberos (barbero_id, dia_semana, hora_inicio, hora_fin, activo)
      VALUES (barbero.id, dia, '09:00', '19:00', true)
      ON CONFLICT (barbero_id, dia_semana) DO UPDATE
      SET hora_inicio = '09:00', hora_fin = '19:00', activo = true;
    END LOOP;
  END LOOP;
END $$;

-- 5️⃣ CITAS DE EJEMPLO (2)
DO $$
DECLARE
  carlos_id UUID;
  miguel_id UUID;
  servicio_fade UUID;
  servicio_barba UUID;
  fecha_manana DATE := CURRENT_DATE + INTERVAL '1 day';
  fecha_pasado_manana DATE := CURRENT_DATE + INTERVAL '2 days';
BEGIN
  SELECT id INTO carlos_id FROM barberos WHERE email = 'carlos@chamosbarber.com';
  SELECT id INTO miguel_id FROM barberos WHERE email = 'miguel@chamosbarber.com';
  SELECT id INTO servicio_fade FROM servicios WHERE nombre = 'Fade Moderno';
  SELECT id INTO servicio_barba FROM servicios WHERE nombre = 'Barba Premium';
  
  INSERT INTO citas (barbero_id, servicio_id, cliente_nombre, cliente_email, cliente_telefono, fecha, hora, estado, notas)
  VALUES 
    (carlos_id, servicio_fade, 'Juan Pérez', 'juan.test@gmail.com', '+56911111111', fecha_manana, '10:00', 'confirmada', 'Cliente regular, prefiere fade bajo'),
    (miguel_id, servicio_barba, 'Pedro González', 'pedro.test@gmail.com', '+56922222222', fecha_pasado_manana, '15:00', 'pendiente', 'Primera vez, consultar por alergias')
  ON CONFLICT DO NOTHING;
END $$;

-- ✅ VERIFICACIÓN
SELECT 'Categorías' as tabla, COUNT(*) as total FROM categorias_servicios
UNION ALL SELECT 'Servicios', COUNT(*) FROM servicios
UNION ALL SELECT 'Barberos', COUNT(*) FROM barberos
UNION ALL SELECT 'Horarios', COUNT(*) FROM horarios_barberos
UNION ALL SELECT 'Citas', COUNT(*) FROM citas;
```

---

## 👥 PASO 3: Crear Usuarios de Prueba (Supabase Auth)

### **3.1. Ir a Authentication**

1. En Supabase Dashboard, ve a: **🔐 Authentication → Users**
2. Haz clic en: **"Add user" o "Invite user"**

### **3.2. Crear 3 Usuarios:**

#### **1️⃣ ADMIN**
```
Email: admin@chamosbarber.com
Password: Admin123456!
```

Después de crear este usuario:
- **Copia su UUID** (se mostrará en la lista de usuarios)
- Ejecuta este SQL:

```sql
-- Reemplaza 'UUID_DEL_ADMIN' con el UUID real
INSERT INTO admin_users (id, email, nombre, role, activo)
VALUES (
  'UUID_DEL_ADMIN',
  'admin@chamosbarber.com',
  'Administrador',
  'superadmin',
  true
);
```

#### **2️⃣ BARBERO (Carlos)**
```
Email: carlos@chamosbarber.com
Password: Carlos123456!
```

Después de crear este usuario:
- **Copia su UUID**
- Ejecuta este SQL:

```sql
-- Reemplaza 'UUID_DE_CARLOS' con el UUID real
UPDATE barberos
SET user_id = 'UUID_DE_CARLOS'
WHERE email = 'carlos@chamosbarber.com';
```

#### **3️⃣ CLIENTE**
```
Email: cliente@test.com
Password: Cliente123456!
```

Este usuario solo necesita estar en Authentication, no requiere SQL adicional.

---

## 🧪 PASO 4: Verificar Datos

Ejecuta estas queries para confirmar que todo está correcto:

```sql
-- Ver servicios por categoría
SELECT 
  c.nombre as categoria,
  s.nombre as servicio,
  s.precio,
  s.duracion_minutos
FROM servicios s
JOIN categorias_servicios c ON s.categoria_id = c.id
ORDER BY c.orden, s.precio;

-- Ver barberos y horarios
SELECT 
  b.nombre || ' ' || b.apellido as barbero,
  b.especialidad,
  COUNT(h.id) as dias_laborales
FROM barberos b
LEFT JOIN horarios_barberos h ON b.id = h.barbero_id
GROUP BY b.id, b.nombre, b.apellido, b.especialidad;

-- Ver citas programadas
SELECT 
  c.fecha,
  c.hora,
  c.cliente_nombre,
  b.nombre || ' ' || b.apellido as barbero,
  s.nombre as servicio,
  c.estado
FROM citas c
JOIN barberos b ON c.barbero_id = b.id
JOIN servicios s ON c.servicio_id = s.id
WHERE c.fecha >= CURRENT_DATE
ORDER BY c.fecha, c.hora;
```

---

## ✅ RESUMEN DE DATOS INSERTADOS

| Tabla | Cantidad | Detalles |
|-------|----------|----------|
| **Categorías** | 3 | Cortes, Barba, Tratamientos |
| **Servicios** | 6 | 2 por categoría ($6.000 - $18.000) |
| **Barberos** | 2 | Carlos (8 años exp), Miguel (3 años exp) |
| **Horarios** | 12 | Lun-Sáb 9:00-19:00 (ambos barberos) |
| **Citas** | 2 | 1 confirmada mañana, 1 pendiente pasado mañana |

---

## 🎯 USUARIOS PARA TESTING

| Rol | Email | Password | Acceso |
|-----|-------|----------|--------|
| **Admin** | admin@chamosbarber.com | Admin123456! | Panel completo, gestión |
| **Barbero** | carlos@chamosbarber.com | Carlos123456! | Dashboard barbero, citas |
| **Cliente** | cliente@test.com | Cliente123456! | Reservar citas, ver servicios |

---

## 🚀 ¡LISTO PARA TESTEAR!

Ahora puedes:

1. ✅ **Ver servicios** en: `https://chamosbarber.com`
2. ✅ **Reservar citas** como cliente
3. ✅ **Gestionar citas** como barbero
4. ✅ **Administrar sistema** como admin

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "violates foreign key constraint"
- Asegúrate de ejecutar los INSERTs en orden (categorías → servicios → barberos → horarios → citas)

### Error: "duplicate key value violates unique constraint"
- Los datos ya existen. Ignora el error o usa:
```sql
DELETE FROM citas;
DELETE FROM horarios_barberos;
DELETE FROM servicios;
DELETE FROM barberos;
DELETE FROM categorias_servicios;
```

### No puedo crear usuarios en Auth
- Verifica que tengas permisos de admin en Supabase
- Usa "Add user" → "Create new user" (no "Invite")

---

**¿Necesitas ayuda? Contáctame con el error específico que veas.** 🙋‍♂️
