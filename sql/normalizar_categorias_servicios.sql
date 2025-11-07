-- ============================================================================
-- Script para normalizar las categorías de servicios
-- Ejecutar este script UNA VEZ para corregir categorías existentes
-- ============================================================================

-- PASO 1: Ver las categorías actuales antes de normalizar
-- Esto te mostrará EXACTAMENTE qué está guardado (con mayúsculas, espacios, etc)
SELECT 
  categoria,
  LOWER(TRIM(categoria)) as categoria_normalizada,
  LENGTH(categoria) as longitud,
  COUNT(*) as cantidad_servicios
FROM servicios 
GROUP BY categoria 
ORDER BY categoria;

-- PASO 2: Normalizar todas las categorías
-- Primero limpiamos espacios y convertimos a minúsculas

-- Limpiar espacios en blanco al inicio y final
UPDATE servicios SET categoria = TRIM(categoria);

-- Normalizar CORTES (singular y plural, cualquier mayúscula)
UPDATE servicios SET categoria = 'cortes' 
WHERE LOWER(TRIM(categoria)) IN ('corte', 'cortes');

-- Normalizar BARBAS (singular y plural, cualquier mayúscula)
-- IMPORTANTE: Esto arregla "Barba" → "barbas"
UPDATE servicios SET categoria = 'barbas' 
WHERE LOWER(TRIM(categoria)) IN ('barba', 'barbas');

-- Normalizar TINTES (singular y plural, cualquier mayúscula)
UPDATE servicios SET categoria = 'tintes' 
WHERE LOWER(TRIM(categoria)) IN ('tinte', 'tintes');

-- Normalizar TRATAMIENTOS (singular y plural, cualquier mayúscula)
-- IMPORTANTE: Esto arregla mayúsculas en "Tratamientos"
UPDATE servicios SET categoria = 'tratamientos' 
WHERE LOWER(TRIM(categoria)) IN ('tratamiento', 'tratamientos');

-- Normalizar COMBOS (singular y plural, cualquier mayúscula)
UPDATE servicios SET categoria = 'combos' 
WHERE LOWER(TRIM(categoria)) IN ('combo', 'combos');

-- Normalizar ESPECIALES (si existe)
UPDATE servicios SET categoria = 'especiales' 
WHERE LOWER(TRIM(categoria)) IN ('especial', 'especiales');

-- PASO 3: Ver las categorías después de normalizar
SELECT 
  categoria,
  COUNT(*) as cantidad_servicios
FROM servicios 
GROUP BY categoria 
ORDER BY categoria;

-- PASO 4: Verificar que todos los servicios tengan categoría válida
SELECT 
  nombre, 
  categoria
FROM servicios 
WHERE categoria NOT IN ('cortes', 'barbas', 'tintes', 'tratamientos', 'combos', 'especiales')
ORDER BY categoria;

-- ============================================================================
-- Resultado esperado después de ejecutar:
-- ============================================================================
-- categoria     | cantidad_servicios
-- --------------|-------------------
-- barbas        | X
-- combos        | X
-- cortes        | X
-- especiales    | X (si existe)
-- tintes        | X
-- tratamientos  | X
-- ============================================================================
-- TODAS en minúsculas, plural, sin espacios
-- ============================================================================
