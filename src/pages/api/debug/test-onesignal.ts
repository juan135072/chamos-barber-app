import { NextApiRequest, NextApiResponse } from 'next'
import { sendNotificationToBarber } from '../../../lib/onesignal'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    const { barberId } = req.body

    if (!barberId) {
        return res.status(400).json({ message: 'Missing barberId' })
    }

    // Nota: Verificación de sesión eliminada para evitar problemas de dependencias (auth-helpers-nextjs) en producción.
    // Este endpoint es solo para depuración.

    try {
        console.log('🧪 Iniciando prueba de OneSignal para:', barberId)

        // Forzar validación de variables de entorno
        const apiKey = process.env.ONESIGNAL_REST_API_KEY
        if (!apiKey) {
            throw new Error('ONESIGNAL_REST_API_KEY no está definida en el servidor')
        }

        const result = await sendNotificationToBarber(
            barberId,
            'Prueba de Servidor 🧪',
            `Esta es una notificación enviada desde el servidor a las ${new Date().toLocaleTimeString()}`
        )

        const envDiagnostics = {
            hasKey: !!process.env.ONESIGNAL_REST_API_KEY,
            keyLength: process.env.ONESIGNAL_REST_API_KEY?.length || 0,
            keyPreview: process.env.ONESIGNAL_REST_API_KEY ? `${process.env.ONESIGNAL_REST_API_KEY.substring(0, 5)}...` : 'undefined'
        }

        if (result.success) {
            return res.status(200).json({ ...result, envCheck: envDiagnostics })
        } else {
            return res.status(500).json({ ...result, envCheck: envDiagnostics })
        }

    } catch (error) {
        console.error('❌ Error en prueba de OneSignal:', error)
        return res.status(500).json({
            success: false,
            error: String(error),
            envCheck: {
                hasKey: !!process.env.ONESIGNAL_REST_API_KEY,
                keyLength: process.env.ONESIGNAL_REST_API_KEY?.length || 0,
                keyPreview: process.env.ONESIGNAL_REST_API_KEY ? `${process.env.ONESIGNAL_REST_API_KEY.substring(0, 5)}...` : 'undefined'
            }
        })
    }
}
