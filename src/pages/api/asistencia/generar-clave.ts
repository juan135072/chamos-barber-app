import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'

/**
 * =====================================================
 * API: GENERAR CLAVE DIARIA
 * =====================================================
 * Genera una clave única para el día actual
 * Solo accesible por administradores
 */

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' })
    }

    try {
        const supabase = createPagesServerClient(req, res)

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('❌ [generar-clave] Error de autenticación:', authError)
            return res.status(401).json({ error: 'No autenticado' })
        }

        // Verificar que es administrador y obtener su comercio_id
        const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('rol, comercio_id')
            .eq('id', user.id)
            .single()

        if (adminError || !adminData || !['admin', 'administrador', 'cajero'].includes(adminData.rol)) {
            console.error('❌ [generar-clave] Usuario no autorizado o sin rol:', adminData?.rol)
            return res.status(403).json({ error: 'No autorizado' })
        }

        const comercioId = adminData.comercio_id

        if (!comercioId) {
            console.error('❌ [generar-clave] El administrador no tiene un comercio_id asignado')
            return res.status(403).json({ error: 'Configuración de multitenant incompleta: Tu usuario no tiene un comercio asignado.' })
        }

        // Obtener zona horaria configurada PARA ESTE COMERCIO
        const { data: configTimezone } = await supabase
            .from('sitio_configuracion')
            .select('valor')
            .eq('clave', 'sitio_timezone')
            .eq('comercio_id', comercioId)
            .maybeSingle()

        const timezone = configTimezone?.valor || 'America/Santiago'

        const { getDynamicHoy } = await import('@/lib/date-utils')
        const fechaActual = getDynamicHoy(timezone)

        // Verificar si ya existe clave para hoy EN ESTE COMERCIO
        const { data: claveExistente, error: buscarError } = await supabase
            .from('claves_diarias')
            .select('*')
            .eq('fecha', fechaActual)
            .eq('activa', true)
            .eq('comercio_id', comercioId)
            .maybeSingle()

        if (buscarError) {
            console.error('❌ [generar-clave] Error al buscar clave existente:', buscarError)
            return res.status(500).json({
                error: 'Error al verificar clave existente',
                details: buscarError.message,
                code: buscarError.code
            })
        }

        if (claveExistente) {
            console.log('✅ [generar-clave] Clave ya existe para este comercio hoy:', claveExistente.clave)
            return res.status(200).json({
                success: true,
                clave: claveExistente.clave,
                fecha: claveExistente.fecha,
                yaExistia: true
            })
        }

        // Generar nueva clave usando la fecha actual ajustada
        const clave = generarClave(fechaActual)

        console.log(`🔑 [generar-clave] Generando nueva clave para ${fechaActual} (Comercio ${comercioId}): ${clave}`)

        // Insertar en base de datos con comercio_id
        const { data: nuevaClave, error: insertError } = await supabase
            .from('claves_diarias')
            .insert({
                clave: clave,
                fecha: fechaActual,
                activa: true,
                creada_por: user.id,
                comercio_id: comercioId
            })
            .select()
            .single()

        if (insertError) {
            console.error('❌ [generar-clave] Error al insertar:', insertError)

            // Si el error es de duplicado (a pesar de nuestro select previo), significa que alguien la creó justo ahora o hay un tema de RLS
            if (insertError.code === '23505') {
                // Intentamos recuperar la que ya existe (aunque no la hayamos visto antes)
                const { data: claveRecuperada } = await supabase
                    .from('claves_diarias')
                    .select('clave, fecha')
                    .eq('fecha', fechaActual)
                    .eq('comercio_id', comercioId)
                    .maybeSingle()

                if (claveRecuperada) {
                    return res.status(200).json({
                        success: true,
                        clave: claveRecuperada.clave,
                        fecha: claveRecuperada.fecha,
                        yaExistia: true
                    })
                }
            }

            return res.status(500).json({
                error: 'Error al generar clave',
                details: insertError.message,
                code: insertError.code
            })
        }

        console.log('✅ [generar-clave] Clave generada exitosamente para comercio:', comercioId)

        return res.status(200).json({
            success: true,
            clave: nuevaClave.clave,
            fecha: nuevaClave.fecha,
            yaExistia: false
        })

    } catch (error: any) {
        console.error('❌ [generar-clave] Error general:', error)
        return res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message,
            stack: error.stack,
            debug: 'Catch block reached'
        })
    }
}

/**
 * Genera una clave alfanumérica única
 * Formato: XXX-DDMM
 * Ejemplo: B4R-2201 (22 de enero)
 */
function generarClave(fechaISO: string): string {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sin O, I, 0, 1 para evitar confusión

    // Parsear la fecha manual para asegurar que el DDMM coincida con el día de la clave
    const [year, month, day] = fechaISO.split('-')
    const diaClave = day
    const mesClave = month

    // Generar 3 caracteres aleatorios
    let prefijo = ''
    for (let i = 0; i < 3; i++) {
        prefijo += letras.charAt(Math.floor(Math.random() * letras.length))
    }

    return `${prefijo}-${diaClave}${mesClave}`
}
