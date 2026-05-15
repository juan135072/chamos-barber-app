-- ============================================
-- 🛠️ CORRECCIÓN DE COMISIONES HISTÓRICAS Y PORCENTAJES
-- ============================================

-- 1. Actualizar porcentajes de comisión actuales en la tabla barberos
-- Según la información proporcionada por el usuario:
UPDATE public.barberos 
SET porcentaje_comision = 60.00 
WHERE (nombre || ' ' || apellido) ILIKE '%ADONIS RINCON%';

UPDATE public.barberos 
SET porcentaje_comision = 60.00 
WHERE (nombre || ' ' || apellido) ILIKE '%ALEXANDER TABORDA%';

UPDATE public.barberos 
SET porcentaje_comision = 60.00 
WHERE (nombre || ' ' || apellido) ILIKE '%GUSTAVO MELENDEZ%';

UPDATE public.barberos 
SET porcentaje_comision = 60.00 
WHERE (nombre || ' ' || apellido) ILIKE '%ROSWILL AGUILERA%';

UPDATE public.barberos 
SET porcentaje_comision = 70.00 
WHERE (nombre || ' ' || apellido) ILIKE '%ROUDIT BARRETO%';

-- 2. Recalcular comisiones históricas en la tabla facturas
-- Esto alineará los reportes pasados con los porcentajes actuales
-- Solo para facturas no anuladas
UPDATE public.facturas f
SET 
  comision_barbero = ROUND(f.total * b.porcentaje_comision / 100, 2),
  ingreso_casa = f.total - ROUND(f.total * b.porcentaje_comision / 100, 2)
FROM public.barberos b
WHERE f.barbero_id = b.id
AND f.anulada = false;

-- 3. Limpiar CIERRES DE CAJA que puedan estar basados en datos incorrectos
-- (Opcional, pero recomendado si ya se hicieron cierres con porcentajes erróneos)
-- DELETE FROM public.cierres_caja;

-- 4. VERIFICACIÓN: Mostrar cómo quedaron los porcentajes
SELECT nombre, apellido, porcentaje_comision FROM public.barberos;
