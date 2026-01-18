import type { NextApiRequest, NextApiResponse } from 'next';
import { generateChatResponse } from '@/lib/ai-agent';
import { sendMessageToChatwoot } from '@/lib/chatwoot';
import { ChatMemory } from '@/lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(200).json({ status: 'active', message: 'Chatwoot Webhook is ready' });
    }

    try {
        const body = req.body;
        console.log('[BOT-DEBUG] (Pages) Recibido webhook de Chatwoot:', JSON.stringify({
            event: body.event,
            account_id: body.account?.id,
            conversation_id: body.conversation?.id,
            sender_type: body.sender?.type,
            message_type: body.message_type
        }, null, 2));

        // Logs de diagnóstico de ENV (solo presencia)
        console.log('[BOT-DEBUG] Diagnóstico Chatwoot ENV:', {
            has_url: !!process.env.CHATWOOT_URL,
            has_token: !!process.env.CHATWOOT_ACCESS_TOKEN,
            url_preview: process.env.CHATWOOT_URL?.substring(0, 20)
        });

        // Solo procesar mensajes creados
        if (body.event !== 'message_created') {
            console.log(`[BOT-DEBUG] Evento ignorado: ${body.event}`);
            return res.status(200).json({ status: 'ignored_event' });
        }

        const { message_type, content, conversation, sender } = body;

        // Solo responder a mensajes entrantes (del cliente)
        if (message_type !== 'incoming') {
            return res.status(200).json({ status: 'bot_message_ignored' });
        }

        // Ignorar mensajes de agentes/bots
        if (sender?.type === 'user') {
            return res.status(200).json({ status: 'agent_message_ignored' });
        }

        if (!content || content.trim() === '') {
            return res.status(200).json({ status: 'empty_content' });
        }

        console.log(`[BOT-DEBUG] Mensaje recibido: "${content}" en conv:${conversation.id}. Iniciando espera de 7s...`);

        // --- LÓGICA DE AGRUPACIÓN (DEBOUNCE) ---
        const eventId = Math.random().toString(36).substring(7);
        const conversationId = conversation.id;

        // 1. Guardar mensaje en el buffer y marcar este evento como el último
        await ChatMemory.appendToBuffer(conversationId, content);
        await ChatMemory.setLastEventId(conversationId, eventId);

        // 2. Esperar 5 segundos de "silencio"
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Verificar si seguimos siendo el último mensaje
        const lastEventId = await ChatMemory.getLastEventId(conversationId);
        if (lastEventId !== eventId) {
            console.log(`[BOT-DEBUG] Conv:${conversationId} - Otro mensaje llegó. Cancelando este hilo.`);
            return res.status(200).json({ status: 'debounced' });
        }

        // 4. Si llegamos aquí, han pasado unos segundos sin mensajes nuevos. Consolidamos.
        let consolidatedMessage = content; // Fallback al mensaje actual
        try {
            const buffer = await ChatMemory.getBuffer(conversationId);
            if (buffer && buffer.length > 0) {
                consolidatedMessage = buffer.join('\n');
                console.log(`[BOT-DEBUG] Mensajes consolidados (${buffer.length}):`, consolidatedMessage);
            }
            await ChatMemory.clearBuffer(conversationId);
        } catch (bufferError) {
            console.error('[BOT-DEBUG] Error al consolidar buffer (usando fallback):', bufferError);
        }

        // Generar respuesta con AI
        let aiResponse = '';
        try {
            aiResponse = await generateChatResponse(consolidatedMessage, conversationId);
        } catch (aiError) {
            console.error('[BOT-DEBUG] Error crítico en generateChatResponse:', aiError);
            aiResponse = "Hola, te habla Gustavo. 💈 ||| Oye chamo, disculpa, pero el sistema me dio un pequeño tirón y no pude procesar tu mensaje completo. ||| Pásate por aquí si quieres asegurar tu hora directo: https://chamosbarber.com/reservar y nos vemos en la silla. 💈";
        }

        if (!aiResponse) {
            return res.status(200).json({ status: 'no_ai_response' });
        }

        // --- LÓGICA DE HUMANIZACIÓN DE SALIDA (FRAGMENTACIÓN) ---
        let messages: string[] = [];
        let delayBetweenBubbles = 2000; // Por defecto 2s

        const shouldHumanizeLongMessage = aiResponse.length > 130 && Math.random() < 0.4;

        if (shouldHumanizeLongMessage) {
            console.log(`[BOT-DEBUG] Aplicando flujo de humanización (40% roll hit) para mensaje de ${aiResponse.length} caracteres.`);
            const humanizedParts = await import('@/lib/ai-agent').then(m => m.splitLongMessage(aiResponse));
            if (humanizedParts.length > 1) {
                messages = humanizedParts;
                delayBetweenBubbles = 5000; // 5 segundos como dice el diagrama
            } else {
                messages = [aiResponse];
            }
        } else {
            // Comportamiento normal: dividir por ||| si la IA ya lo hizo o es corto
            messages = aiResponse
                .replace('TRANSFER_AGENT', '') // Limpiar flags
                .split('|||')
                .map(msg => msg.trim())
                .filter(msg => msg.length > 0);
        }

        // Detectar si se debe transferir a agente humano (en el texto original)
        const shouldTransfer = aiResponse.includes('TRANSFER_AGENT');

        // Enviar mensajes secuencialmente
        if (messages.length === 0) {
            console.warn('[BOT-DEBUG] No hay mensajes para enviar tras procesamiento.');
            return res.status(200).json({ status: 'no_messages' });
        }

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            if (!message) continue;

            // Pausa entre burbujas (excepto la primera)
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBubbles));
            }

            await sendMessageToChatwoot(conversationId, message, 'outgoing', body.account?.id);
            console.log(`[BOT-DEBUG] Burbuja ${i + 1}/${messages.length} enviada (Espera: ${delayBetweenBubbles}ms)`);
        }

        return res.status(200).json({
            status: 'success',
            transferred: shouldTransfer
        });
    } catch (error) {
        console.error('Error in Chatwoot webhook:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
