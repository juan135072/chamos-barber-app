-- Script para normalizar las categorías de servicios a minúsculas
-- Ejecutar este script UNA VEZ para corregir categorías existentes

-- Ver las categorías actuales antes de normalizar
SELECT DISTINCT categoria, COUNT(*) as cantidad 
FROM servicios 
GROUP BY categoria 
ORDER BY categoria;

-- Normalizar categorías comunes a minúsculas
UPDATE servicios SET categoria = 'cortes' WHERE LOWER(categoria) = 'cortes';
UPDATE servicios SET categoria = 'barbas' WHERE LOWER(categoria) = 'barbas';
UPDATE servicios SET categoria = 'barba' WHERE LOWER(categoria) = 'barba';
UPDATE servicios SET categoria = 'tintes' WHERE LOWER(categoria) = 'tintes';
UPDATE servicios SET categoria = 'tratamientos' WHERE LOWER(categoria) = 'tratamientos';
UPDATE servicios SET categoria = 'combos' WHERE LOWER(categoria) = 'combos';

-- Normalizar "Barba" (singular) a "barbas" (plural) para consistencia
UPDATE servicios SET categoria = 'barbas' WHERE categoria = 'barba';

-- Ver las categorías después de normalizar
SELECT DISTINCT categoria, COUNT(*) as cantidad 
FROM servicios 
GROUP BY categoria 
ORDER BY categoria;

-- Resultado esperado:
-- barbas, cortes, tintes, tratamientos, combos (todas en minúsculas y plural)
