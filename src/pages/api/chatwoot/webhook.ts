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

        // 2. Esperar 7 segundos de "silencio"
        await new Promise(resolve => setTimeout(resolve, 7000));

        // 3. Verificar si seguimos siendo el último mensaje
        const lastEventId = await ChatMemory.getLastEventId(conversationId);
        if (lastEventId !== eventId) {
            console.log(`[BOT-DEBUG] Conv:${conversationId} - Otro mensaje llegó. Cancelando este hilo.`);
            return res.status(200).json({ status: 'debounced' });
        }

        // 4. Si llegamos aquí, han pasado 7s sin mensajes nuevos. Consolidamos.
        const buffer = await ChatMemory.getBuffer(conversationId);
        const consolidatedMessage = buffer.join('\n');
        await ChatMemory.clearBuffer(conversationId);

        console.log(`[BOT-DEBUG] Procesando todos los mensajes consolidados:`, consolidatedMessage);

        // Generar respuesta con AI
        const aiResponse = await generateChatResponse(consolidatedMessage, conversationId);

        if (!aiResponse) {
            return res.status(200).json({ status: 'no_ai_response' });
        }

        // Detectar si se debe transferir a agente humano
        const shouldTransfer = aiResponse.includes('TRANSFER_AGENT');

        // Dividir respuesta por ||| para enviar múltiples mensajes (rhythm)
        const messages = aiResponse
            .replace('TRANSFER_AGENT', '') // Remover la flag antes de enviar
            .split('|||')
            .map(msg => msg.trim())
            .filter(msg => msg.length > 0);

        // Enviar mensajes secuencialmente
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            // Pausa entre burbujas (excepto la primera)
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await sendMessageToChatwoot(conversationId, message, 'outgoing', body.account?.id);
            console.log(`[BOT-DEBUG] Burbuja ${i + 1}/${messages.length} enviada`);
        }

        return res.status(200).json({
            status: 'success',
            messagesProcessed: buffer.length,
            transferred: shouldTransfer
        });
    } catch (error) {
        console.error('Error in Chatwoot webhook:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
