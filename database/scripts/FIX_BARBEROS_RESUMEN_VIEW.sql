-- =====================================================
-- 🔧 FIX: Vista barberos_resumen
-- =====================================================
-- Corrige la vista para usar f.liquidacion_id en lugar de l.facturas_ids
-- =====================================================

DROP VIEW IF EXISTS public.barberos_resumen CASCADE;

CREATE OR REPLACE VIEW public.barberos_resumen AS
SELECT 
  b.id,
  b.nombre,
  b.apellido,
  b.email,
  b.telefono,
  b.activo,
  b.porcentaje_comision,
  
  -- Ventas totales (no anuladas)
  COUNT(DISTINCT f.id) FILTER (WHERE f.anulada = false) as total_ventas,
  COALESCE(SUM(f.total) FILTER (WHERE f.anulada = false), 0) as total_vendido,
  
  -- Comisiones generadas (total)
  COALESCE(SUM(f.comision_barbero) FILTER (WHERE f.anulada = false), 0) as comisiones_generadas,
  
  -- Comisiones pendientes (facturas sin liquidacion_id)
  COALESCE(
    SUM(f.comision_barbero) FILTER (
      WHERE f.anulada = false 
      AND f.liquidacion_id IS NULL
    ), 0
  ) as comisiones_pendientes,
  
  -- Comisiones pagadas (sum de liquidaciones pagadas)
  COALESCE(
    SUM(l.total_comision) FILTER (WHERE l.estado = 'pagada'), 0
  ) as comisiones_pagadas,
  
  -- Última liquidación (fecha de pago)
  MAX(l.fecha_pago) as ultima_liquidacion
  
FROM public.barberos b
LEFT JOIN public.facturas f ON b.id = f.barbero_id
LEFT JOIN public.liquidaciones l ON b.id = l.barbero_id
GROUP BY b.id, b.nombre, b.apellido, b.email, b.telefono, b.activo, b.porcentaje_comision;

-- Comentario
COMMENT ON VIEW public.barberos_resumen IS 
'Vista con resumen de ventas y comisiones por barbero. 
Usa f.liquidacion_id IS NULL para detectar comisiones pendientes.';

-- Dar permisos
GRANT SELECT ON public.barberos_resumen TO authenticated;
GRANT SELECT ON public.barberos_resumen TO anon;

-- =====================================================
-- ✅ VERIFICACIÓN
-- =====================================================

-- Ver resumen de Carlos
SELECT 
  id,
  nombre,
  apellido,
  email,
  total_ventas,
  total_vendido,
  comisiones_generadas,
  comisiones_pendientes,
  comisiones_pagadas,
  porcentaje_comision
FROM public.barberos_resumen
WHERE email = 'carlos@chamosbarber.com';

-- =====================================================
-- 📋 RESULTADO ESPERADO PARA CARLOS
-- =====================================================
-- | nombre | total_ventas | total_vendido | comisiones_pendientes |
-- |--------|--------------|---------------|----------------------|
-- | Carlos | 2            | 33000.00      | 5400.00              |
--
-- Desglose:
-- - B-0001: $15,000 (liquidada en LIQ-000001)
-- - B-0003: $18,000 (SIN liquidar) ← Esta debe aparecer
-- =====================================================
