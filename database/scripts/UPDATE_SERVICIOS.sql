-- ============================================
-- ACTUALIZACIÓN DE SERVICIOS - CHAMOS BARBER
-- ============================================
-- Este script actualiza todos los servicios y precios según el menú oficial
-- Fecha: 2025-12-15
-- ============================================

-- PRIMERO: Desactivar todos los servicios existentes
UPDATE public.servicios 
SET activo = false 
WHERE activo = true;

-- ============================================
-- CATEGORÍA: CORTE DE CABELLO
-- ============================================

-- Servicio 1: ADULTO MAYOR
INSERT INTO public.servicios (nombre, descripcion, precio, duracion, categoria, activo, imagen_url)
VALUES (
  'ADULTO MAYOR',
  'Incluye asesoría para un estilo retro, lavado de cabello, peinado y aplicación de producto de alta calidad.',
  8000,
  30,
  'Corte de Cabello',
  true,
  NULL
)
ON CONFLICT (nombre) 
DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  duracion = EXCLUDED.duracion,
  categoria = EXCLUDED.categoria,
  activo = true,
  updated_at = NOW();

-- Servicio 2: DEGRADADO
INSERT INTO public.servicios (nombre, descripcion, precio, duracion, categoria, activo, imagen_url)
VALUES (
  'DEGRADADO',
  'Incluye asesoría, lavado de cabello, peinado y aplicación de producto de alta calidad.',
  10000,
  30,
  'Corte de Cabello',
  true,
  NULL
)
ON CONFLICT (nombre) 
DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  duracion = EXCLUDED.duracion,
  categoria = EXCLUDED.categoria,
  activo = true,
  updated_at = NOW();

-- Servicio 3: CORTE DE NIÑO MENOR DE 10 AÑOS
INSERT INTO public.servicios (nombre, descripcion, precio, duracion, categoria, activo, imagen_url)
VALUES (
  'CORTE DE NIÑO MENOR DE 10 AÑOS',
  'Incluye asesoría profesional, secado y peinado con productos de alta calidad.',
  8000,
  30,
  'Corte de Cabello',
  true,
  NULL
)
ON CONFLICT (nombre) 
DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  duracion = EXCLUDED.duracion,
  categoria = EXCLUDED.categoria,
  activo = true,
  updated_at = NOW();

-- ============================================
-- CATEGORÍA: BARBA
-- ============================================

-- Servicio 4: PERFILADO DE BARBA
INSERT INTO public.servicios (nombre, descripcion, precio, duracion, categoria, activo, imagen_url)
VALUES (
  'PERFILADO DE BARBA',
  'Perfilado, rebaje, degradados y más. Este servicio contempla hacer un rediseño completo o parcial de tu look con barba. Puedes complementar este servicio con un corte de pelo. El servicio contempla un tratamiento de apertura de poros con toalla caliente.',
  5000,
  15,
  'Barba',
  true,
  NULL
)
ON CONFLICT (nombre) 
DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  duracion = EXCLUDED.duracion,
  categoria = EXCLUDED.categoria,
  activo = true,
  updated_at = NOW();

-- ============================================
-- CATEGORÍA: CORTE + BARBA
-- ============================================

-- Servicio 5: DEGRADADO + BARBA
INSERT INTO public.servicios (nombre, descripcion, precio, duracion, categoria, activo, imagen_url)
VALUES (
  'DEGRADADO + BARBA',
  'Incluye asesoría para corte de cabello estilo moderno en tendencia con servicio estilizado de barba + servicio de toalla caliente y lavado de cabello peinado y aplicación de producto.',
  14000,
  60,
  'Corte + Barba',
  true,
  NULL
)
ON CONFLICT (nombre) 
DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  duracion = EXCLUDED.duracion,
  categoria = EXCLUDED.categoria,
  activo = true,
  updated_at = NOW();

-- ============================================
-- CATEGORÍA: COLOR
-- ============================================

-- Servicio 6: PLATINADO
INSERT INTO public.servicios (nombre, descripcion, precio, duracion, categoria, activo, imagen_url)
VALUES (
  'PLATINADO',
  'Incluye asesoría, tratamiento de decoloración, tintura del cabello para lograr llegar al color deseado con productos de alta calidad.',
  50000,
  240,
  'Color',
  true,
  NULL
)
ON CONFLICT (nombre) 
DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  duracion = EXCLUDED.duracion,
  categoria = EXCLUDED.categoria,
  activo = true,
  updated_at = NOW();

-- Servicio 7: VISOS
INSERT INTO public.servicios (nombre, descripcion, precio, duracion, categoria, activo, imagen_url)
VALUES (
  'VISOS',
  'Realización de destellos de color en el cabello para llevar un look moderno.',
  30000,
  180,
  'Color',
  true,
  NULL
)
ON CONFLICT (nombre) 
DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  duracion = EXCLUDED.duracion,
  categoria = EXCLUDED.categoria,
  activo = true,
  updated_at = NOW();

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Ver todos los servicios activos
SELECT 
  id,
  nombre,
  categoria,
  precio,
  duracion,
  activo,
  created_at,
  updated_at
FROM public.servicios
WHERE activo = true
ORDER BY 
  CASE categoria
    WHEN 'Corte de Cabello' THEN 1
    WHEN 'Barba' THEN 2
    WHEN 'Corte + Barba' THEN 3
    WHEN 'Color' THEN 4
    ELSE 5
  END,
  nombre;

-- ============================================
-- RESUMEN DE SERVICIOS ACTUALIZADOS
-- ============================================
-- 
-- CORTE DE CABELLO:
-- 1. ADULTO MAYOR - $8,000 CLP - 30 min
-- 2. DEGRADADO - $10,000 CLP - 30 min
-- 3. CORTE DE NIÑO MENOR DE 10 AÑOS - $8,000 CLP - 30 min
--
-- BARBA:
-- 4. PERFILADO DE BARBA - $5,000 CLP - 15 min
--
-- CORTE + BARBA:
-- 5. DEGRADADO + BARBA - $14,000 CLP - 1 hr
--
-- COLOR:
-- 6. PLATINADO - $50,000 CLP - 4 hr
-- 7. VISOS - $30,000 CLP - 3 hr
--
-- TOTAL: 7 servicios activos
-- ============================================
