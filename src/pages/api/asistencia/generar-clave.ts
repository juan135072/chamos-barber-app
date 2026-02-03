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

        // Verificar que es administrador
        const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('rol')
            .eq('id', user.id)
            .single()

        if (adminError || !adminData || !['admin', 'administrador'].includes(adminData.rol)) {
            console.error('❌ [generar-clave] Usuario no es administrador')
            return res.status(403).json({ error: 'No autorizado' })
        }

        // Obtener fecha actual (Chile timezone)
        const fechaActual = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        // Verificar si ya existe clave para hoy
        const { data: claveExistente, error: buscarError } = await supabase
            .from('claves_diarias')
            .select('*')
            .eq('fecha', fechaActual)
            .eq('activa', true)
            .single()

        if (claveExistente) {
            console.log('✅ [generar-clave] Clave ya existe para hoy:', claveExistente.clave)
            return res.status(200).json({
                success: true,
                clave: claveExistente.clave,
                fecha: claveExistente.fecha,
                yaExistia: true
            })
        }

        // Generar nueva clave
        const clave = generarClave()

        console.log(`🔑 [generar-clave] Generando nueva clave para ${fechaActual}: ${clave}`)

        // Insertar en base de datos
        const { data: nuevaClave, error: insertError } = await supabase
            .from('claves_diarias')
            .insert({
                clave: clave,
                fecha: fechaActual,
                activa: true,
                creada_por: user.id
            })
            .select()
            .single()

        if (insertError) {
            console.error('❌ [generar-clave] Error al insertar:', insertError)
            return res.status(500).json({ error: 'Error al generar clave' })
        }

        console.log('✅ [generar-clave] Clave generada exitosamente')

        return res.status(200).json({
            success: true,
            clave: nuevaClave.clave,
            fecha: nuevaClave.fecha,
            yaExistia: false
        })

    } catch (error: any) {
        console.error('❌ [generar-clave] Error general:', error)
        return res.status(500).json({ error: 'Error interno del servidor' })
    }
}

/**
 * Genera una clave alfanumérica única
 * Formato: XXX-DDMM
 * Ejemplo: B4R-2201 (22 de enero)
 */
function generarClave(): string {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sin O, I, 0, 1 para evitar confusión
    const fecha = new Date()
    const dia = String(fecha.getDate()).padStart(2, '0')
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')

    // Generar 3 caracteres aleatorios
    let prefijo = ''
    for (let i = 0; i < 3; i++) {
        prefijo += letras.charAt(Math.floor(Math.random() * letras.length))
    }

    return `${prefijo}-${dia}${mes}`
}
