import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { ChatMemory } from '@/lib/redis';
import { generateChatResponse } from '@/lib/ai-agent';
import { sendMessageToChatwoot } from '@/lib/chatwoot';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Solo permitir vía cron o secret key (opcional)
    // if (req.headers['x-api-key'] !== process.env.WORKER_SECRET_KEY) return res.status(401)...

    try {
        console.log('[WORKER] Iniciando chequeo de confirmaciones proactivas...');

        // 2. Buscar citas PENDIENTES para hoy y mañana
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: appointments, error } = await supabase
            .from('citas')
            .select('*')
            .eq('estado', 'pendiente')
            .gte('fecha', now.toISOString().split('T')[0])
            .lte('fecha', tomorrow.toISOString().split('T')[0]);

        if (error) throw error;
        if (!appointments || appointments.length === 0) {
            return res.status(200).json({ status: 'no_pending_appointments' });
        }

        const stats = { scanned: appointments.length, triggered: 0, skipped: 0 };

        for (const appt of appointments) {
            const phone = appt.cliente_telefono;
            if (!phone) continue;

            // 3. Verificar si el cliente tiene una ventana de chat abierta en Redis
            const window = await ChatMemory.getConversationWindow(phone);
            if (!window) {
                console.log(`[WORKER] Cita ${appt.id} omitida: No hay ventana de chat activa para ${phone}`);
                stats.skipped++;
                continue;
            }

            // 4. Lógica de Disparo (Proactivo/Costo Cero)
            const apptDate = new Date(`${appt.fecha}T${appt.hora}`);
            const lastMsgDate = new Date(window.last_incoming_at);

            const hoursToAppt = (apptDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            const hoursSinceLastMsg = (now.getTime() - lastMsgDate.getTime()) / (1000 * 60 * 60);

            let shouldTrigger = false;
            let reason = '';

            if (hoursToAppt > 0 && hoursToAppt <= 2.5) {
                shouldTrigger = true;
                reason = 'Cercanía a la cita (<2.5h)';
            } else if (hoursSinceLastMsg >= 23 && hoursSinceLastMsg < 24) {
                shouldTrigger = true;
                reason = 'Cierre de ventana 24h (Inactividad 23h)';
            }

            if (shouldTrigger) {
                console.log(`[WORKER] 🚀 DISPARANDO IA para ${phone} (Conv:${window.conversationId}). Razón: ${reason}`);

                // Llamamos a la IA con un comando especial
                const systemSignal = `[SISTEMA: SEÑAL_RECORDARE_CITA_PENDIENTE] - El cliente tiene una cita hoy/mañana a las ${appt.hora}. Su ventana de chat gratis se va a cerrar en breve o su cita está muy cerca. Pídele confirmación amablemente.`;

                const aiResponse = await generateChatResponse(systemSignal, window.conversationId, { phone });

                if (aiResponse) {
                    // Dividir por ||| y enviar
                    const bubbles = aiResponse.split('|||').map(b => b.trim()).filter(b => b.length > 0);
                    for (const bubble of bubbles) {
                        await sendMessageToChatwoot(window.conversationId, bubble, 'outgoing');
                    }
                    stats.triggered++;
                }
            } else {
                stats.skipped++;
            }
        }

        return res.status(200).json({ status: 'done', stats });
    } catch (error) {
        console.error('[WORKER] Error:', error);
        return res.status(500).json({ error: String(error) });
    }
}
