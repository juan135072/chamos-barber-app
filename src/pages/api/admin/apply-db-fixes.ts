/**
 * ONE-TIME MIGRATION ROUTE — delete after confirming all fixes applied.
 *
 * Recreates views and functions lost during the Supabase → InsForge migration.
 * Protected by INSFORGE_API_KEY bearer token.
 *
 * Usage (run once after deploy):
 *   curl -X POST https://chamosbarber.com/api/admin/apply-db-fixes \
 *     -H "Authorization: Bearer <INSFORGE_API_KEY>"
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { adminRawSql } from '@/lib/insforge-admin'

// ---------------------------------------------------------------------------
// SQL blocks — each applied independently so one failure doesn't block others
// ---------------------------------------------------------------------------

const FIXES: Array<{ name: string; sql: string }> = [

  // ---- 1. VIEW: usuarios_con_permisos ----------------------------------------
  // Used by usePermissions.ts on every authenticated page.
  // Without this view, ALL auth users see null permissions.
  {
    name: 'VIEW usuarios_con_permisos',
    sql: `
DROP VIEW IF EXISTS public.usuarios_con_permisos CASCADE;

CREATE OR REPLACE VIEW public.usuarios_con_permisos AS
SELECT
  u.id,
  u.email,
  u.nombre,
  u.rol,
  u.activo,
  u.telefono,
  u.barbero_id,
  r.nombre_display AS rol_nombre,
  r.descripcion    AS rol_descripcion,
  r.permisos,
  r.created_at     AS rol_created_at
FROM public.admin_users u
LEFT JOIN public.roles_permisos r ON r.rol = u.rol
ORDER BY u.nombre;

GRANT SELECT ON public.usuarios_con_permisos TO authenticated;
GRANT SELECT ON public.usuarios_con_permisos TO anon;
`,
  },

  // ---- 2. VIEW: barberos_resumen ---------------------------------------------
  // Used by supabase-liquidaciones.ts for the settlements admin panel.
  // Uses NOT EXISTS instead of liquidacion_id IS NULL to avoid dependency
  // on a column that may not have been migrated.
  {
    name: 'VIEW barberos_resumen',
    sql: `
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
  COUNT(DISTINCT f.id) FILTER (WHERE f.anulada = false)            AS total_ventas,
  COALESCE(SUM(f.total)            FILTER (WHERE f.anulada = false), 0) AS total_vendido,
  COALESCE(SUM(f.comision_barbero) FILTER (WHERE f.anulada = false), 0) AS comisiones_generadas,
  COALESCE(
    SUM(f.comision_barbero) FILTER (
      WHERE f.anulada = false
        AND NOT EXISTS (
          SELECT 1 FROM public.liquidaciones l
          WHERE l.barbero_id = b.id
            AND l.estado = 'pagada'
            AND f.created_at::DATE >= l.fecha_inicio
            AND f.created_at::DATE <= l.fecha_fin
        )
    ), 0
  )                                                                    AS comisiones_pendientes,
  COALESCE(SUM(l.total_comision) FILTER (WHERE l.estado = 'pagada'), 0) AS comisiones_pagadas,
  MAX(l.fecha_pago)                                                     AS ultima_liquidacion
FROM public.barberos b
LEFT JOIN public.facturas     f ON b.id = f.barbero_id
LEFT JOIN public.liquidaciones l ON b.id = l.barbero_id
GROUP BY b.id, b.nombre, b.apellido, b.email, b.telefono, b.activo, b.porcentaje_comision;

GRANT SELECT ON public.barberos_resumen TO authenticated;
GRANT SELECT ON public.barberos_resumen TO anon;
`,
  },

  // ---- 3. VIEW: ventas_diarias_por_barbero -----------------------------------
  // Used in admin reports panel.
  {
    name: 'VIEW ventas_diarias_por_barbero',
    sql: `
DROP VIEW IF EXISTS public.ventas_diarias_por_barbero CASCADE;

CREATE OR REPLACE VIEW public.ventas_diarias_por_barbero AS
SELECT
  b.id                                          AS barbero_id,
  (b.nombre || ' ' || b.apellido)               AS barbero_nombre,
  f.created_at::DATE                            AS fecha,
  COUNT(f.id)                                   AS total_ventas,
  COALESCE(SUM(f.total), 0)                     AS total_ingresos,
  COALESCE(SUM(f.comision_barbero), 0)          AS total_comision,
  COALESCE(SUM(f.ingreso_casa), 0)              AS total_casa,
  COALESCE(AVG(f.porcentaje_comision), 0)       AS porcentaje_promedio
FROM public.barberos b
JOIN public.facturas f ON b.id = f.barbero_id
WHERE f.anulada = false
GROUP BY b.id, b.nombre, b.apellido, f.created_at::DATE;

GRANT SELECT ON public.ventas_diarias_por_barbero TO authenticated;
GRANT SELECT ON public.ventas_diarias_por_barbero TO anon;
`,
  },

  // ---- 4. VIEW: cierre_caja_diario -------------------------------------------
  // Used in POS cash management.
  {
    name: 'VIEW cierre_caja_diario',
    sql: `
DROP VIEW IF EXISTS public.cierre_caja_diario CASCADE;

CREATE OR REPLACE VIEW public.cierre_caja_diario AS
SELECT
  f.created_at::DATE          AS fecha,
  f.metodo_pago,
  COUNT(f.id)                 AS cantidad_transacciones,
  COALESCE(SUM(f.total), 0)          AS total_cobrado,
  COALESCE(SUM(f.comision_barbero), 0) AS total_comisiones,
  COALESCE(SUM(f.ingreso_casa), 0)   AS ingreso_neto_casa
FROM public.facturas f
WHERE f.anulada = false
GROUP BY f.created_at::DATE, f.metodo_pago;

GRANT SELECT ON public.cierre_caja_diario TO authenticated;
GRANT SELECT ON public.cierre_caja_diario TO anon;
`,
  },

  // ---- 5. FUNCTION: aprobar_solicitud_barbero --------------------------------
  // Called by /api/solicitudes/aprobar with (p_solicitud_id, p_auth_user_id).
  // Creates barbero + admin_user records and marks the solicitud as approved.
  // Auth user is already created by adminCreateUser() before this is called.
  {
    name: 'FUNCTION aprobar_solicitud_barbero',
    sql: `
DROP FUNCTION IF EXISTS public.aprobar_solicitud_barbero(uuid, uuid);
DROP FUNCTION IF EXISTS public.aprobar_solicitud_barbero(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.aprobar_solicitud_barbero(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.aprobar_solicitud_barbero(
  p_solicitud_id  uuid,
  p_auth_user_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sol record;
BEGIN
  SELECT * INTO v_sol
  FROM public.solicitudes_barberos
  WHERE id = p_solicitud_id AND estado = 'pendiente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada o ya fue procesada';
  END IF;

  INSERT INTO public.barberos (
    id, nombre, apellido, email, telefono,
    especialidades, descripcion, imagen_url,
    activo, comercio_id
  )
  VALUES (
    p_auth_user_id,
    v_sol.nombre, v_sol.apellido, v_sol.email, v_sol.telefono,
    ARRAY[v_sol.especialidad], v_sol.descripcion, v_sol.imagen_url,
    true, v_sol.comercio_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.admin_users (id, email, nombre, rol, barbero_id, activo)
  VALUES (
    p_auth_user_id,
    v_sol.email,
    v_sol.nombre || ' ' || v_sol.apellido,
    'barbero',
    p_auth_user_id,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.solicitudes_barberos
  SET estado = 'aprobada', barbero_id = p_auth_user_id, fecha_revision = NOW()
  WHERE id = p_solicitud_id;

  RETURN jsonb_build_object('success', true, 'barbero_id', p_auth_user_id);

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en aprobar_solicitud_barbero: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprobar_solicitud_barbero(uuid, uuid) TO authenticated;
`,
  },

  // ---- 6. FUNCTION: get_horarios_disponibles ---------------------------------
  // Used by /reservar booking flow and AI agent.
  // Latest version (2026-03-04): reads times from sitio_configuracion,
  // supports pausa_inicio/pausa_fin in horarios_atencion.
  {
    name: 'FUNCTION get_horarios_disponibles',
    sql: `
DROP FUNCTION IF EXISTS public.get_horarios_disponibles(uuid, date);

CREATE OR REPLACE FUNCTION public.get_horarios_disponibles(
  barbero_id_param uuid,
  fecha_param      date
)
RETURNS TABLE (hora text, disponible boolean, motivo text)
LANGUAGE plpgsql
AS $$
DECLARE
  dia_semana_num integer;
  hora_actual    time;
  fecha_actual   date;
  v_apertura     time;
  v_cierre       time;
  v_intervalo    text;
BEGIN
  dia_semana_num := EXTRACT(DOW FROM fecha_param);
  fecha_actual   := CURRENT_DATE;
  hora_actual    := CURRENT_TIME;

  SELECT COALESCE(NULLIF(valor,''),'09:00')::time INTO v_apertura
  FROM public.sitio_configuracion WHERE clave = 'horario_apertura' LIMIT 1;

  SELECT COALESCE(NULLIF(valor,''),'19:00')::time INTO v_cierre
  FROM public.sitio_configuracion WHERE clave = 'horario_cierre' LIMIT 1;

  SELECT COALESCE(NULLIF(valor,''),'30') || ' minutes' INTO v_intervalo
  FROM public.sitio_configuracion WHERE clave = 'intervalo_citas' LIMIT 1;

  IF v_apertura IS NULL THEN v_apertura := '09:00'::time; END IF;
  IF v_cierre   IS NULL THEN v_cierre   := '19:00'::time; END IF;
  IF v_intervalo IS NULL THEN v_intervalo := '30 minutes'; END IF;

  RETURN QUERY
  WITH horarios_base AS (
    SELECT to_char(h, 'HH24:MI') AS hora_slot
    FROM generate_series(v_apertura, v_cierre, v_intervalo::interval) h
  ),
  citas_reservadas AS (
    SELECT c.hora::time AS hora_reservada
    FROM public.citas c
    WHERE c.barbero_id = barbero_id_param
      AND c.fecha = fecha_param
      AND c.estado IN ('pendiente','confirmada')
  ),
  horarios_trabajo AS (
    SELECT ht.hora_inicio, ht.hora_fin, ht.pausa_inicio, ht.pausa_fin
    FROM public.horarios_atencion ht
    WHERE ht.barbero_id = barbero_id_param
      AND ht.dia_semana = dia_semana_num
      AND ht.activo = true
  )
  SELECT
    hb.hora_slot::text,
    CASE
      WHEN fecha_param < fecha_actual THEN false
      WHEN fecha_param = fecha_actual AND hb.hora_slot::time <= hora_actual THEN false
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 FROM horarios_trabajo ht2
          WHERE hb.hora_slot::time >= ht2.hora_inicio
            AND hb.hora_slot::time <  ht2.hora_fin
        ) THEN false
      WHEN EXISTS (
        SELECT 1 FROM horarios_trabajo ht3
        WHERE ht3.pausa_inicio IS NOT NULL
          AND ht3.pausa_fin IS NOT NULL
          AND hb.hora_slot::time >= ht3.pausa_inicio
          AND hb.hora_slot::time <  ht3.pausa_fin
      ) THEN false
      WHEN EXISTS (
        SELECT 1 FROM citas_reservadas cr
        WHERE cr.hora_reservada = hb.hora_slot::time
      ) THEN false
      ELSE true
    END,
    CASE
      WHEN fecha_param < fecha_actual THEN 'Fecha pasada'
      WHEN fecha_param = fecha_actual AND hb.hora_slot::time <= hora_actual THEN 'Hora pasada'
      WHEN EXISTS (SELECT 1 FROM horarios_trabajo)
        AND NOT EXISTS (
          SELECT 1 FROM horarios_trabajo ht2
          WHERE hb.hora_slot::time >= ht2.hora_inicio
            AND hb.hora_slot::time <  ht2.hora_fin
        ) THEN 'Fuera de horario de trabajo'
      WHEN EXISTS (
        SELECT 1 FROM horarios_trabajo ht3
        WHERE ht3.pausa_inicio IS NOT NULL
          AND ht3.pausa_fin IS NOT NULL
          AND hb.hora_slot::time >= ht3.pausa_inicio
          AND hb.hora_slot::time <  ht3.pausa_fin
      ) THEN 'Pausa o inactividad del barbero'
      WHEN EXISTS (
        SELECT 1 FROM citas_reservadas cr
        WHERE cr.hora_reservada = hb.hora_slot::time
      ) THEN 'Ya reservado'
      ELSE 'Disponible'
    END
  FROM horarios_base hb
  ORDER BY hb.hora_slot;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_horarios_disponibles(uuid, date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_horarios_disponibles(uuid, date) TO authenticated;
`,
  },

  // ---- 7. FUNCTION: eliminar_citas_canceladas --------------------------------
  // Used by the admin panel "clean cancelled appointments" button.
  {
    name: 'FUNCTION eliminar_citas_canceladas',
    sql: `
DROP FUNCTION IF EXISTS public.eliminar_citas_canceladas();

CREATE OR REPLACE FUNCTION public.eliminar_citas_canceladas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_filas_borradas integer;
BEGIN
  UPDATE public.facturas
  SET cita_id = NULL
  WHERE cita_id IN (SELECT id FROM public.citas WHERE estado = 'cancelada');

  DELETE FROM public.citas WHERE estado = 'cancelada';
  GET DIAGNOSTICS v_filas_borradas = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'count',   v_filas_borradas,
    'message', 'Se eliminaron ' || v_filas_borradas || ' citas canceladas.'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_citas_canceladas() TO authenticated;
`,
  },

  // ---- 8. Performance indexes ------------------------------------------------
  {
    name: 'INDEXES performance',
    sql: `
CREATE INDEX IF NOT EXISTS idx_citas_barbero_fecha_hora
  ON public.citas(barbero_id, fecha, hora)
  WHERE estado IN ('pendiente','confirmada');

CREATE INDEX IF NOT EXISTS idx_horarios_atencion_barbero_dia
  ON public.horarios_atencion(barbero_id, dia_semana)
  WHERE activo = true;
`,
  },
]

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — use POST' })
  }

  const apiKey = process.env.INSFORGE_API_KEY
  const bearer = (req.headers.authorization ?? '').replace('Bearer ', '')
  if (!apiKey || bearer !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const results: Array<{ name: string; status: 'ok' | 'error'; error?: string }> = []

  for (const fix of FIXES) {
    try {
      await adminRawSql(fix.sql)
      results.push({ name: fix.name, status: 'ok' })
    } catch (err: any) {
      results.push({ name: fix.name, status: 'error', error: err.message })
    }
  }

  const allOk = results.every(r => r.status === 'ok')
  return res.status(allOk ? 200 : 207).json({
    summary: allOk ? 'All fixes applied successfully' : 'Some fixes failed — check results',
    results,
  })
}
