import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse } from '@/lib/ai-agent';
import { sendMessageToChatwoot } from '@/lib/chatwoot';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[BOT-DEBUG] Recibido webhook de Chatwoot:', JSON.stringify(body, null, 2));

        // Solo procesar mensajes creados
        if (body.event !== 'message_created') {
            console.log(`[BOT-DEBUG] Evento ignorado: ${body.event}`);
            return NextResponse.json({ status: 'ignored_event' });
        }

        const { message_type, content, conversation, account, sender } = body;

        // Solo responder a mensajes entrantes (del cliente)
        if (message_type !== 'incoming') {
            console.log(`[BOT-DEBUG] Mensaje ignorado (tipo: ${message_type})`);
            return NextResponse.json({ status: 'bot_message_ignored' });
        }

        // Ignorar mensajes de agentes/bots
        if (sender?.type === 'user') {
            console.log(`[BOT-DEBUG] Mensaje de agente ignorado`);
            return NextResponse.json({ status: 'agent_message_ignored' });
        }

        console.log(`[BOT-DEBUG] Procesando mensaje: "${content}" en conversación ${conversation.id}`);

        // Generar respuesta con AI
        const aiResponse = await generateChatResponse(content);

        if (!aiResponse) {
            return NextResponse.json({ status: 'no_response' });
        }

        // Detectar si se debe transferir a agente humano
        const shouldTransfer = aiResponse.includes('TRANSFER_AGENT');

        // Dividir respuesta por ||| para enviar múltiples mensajes (rhythm)
        const messages = aiResponse
            .replace('TRANSFER_AGENT', '') // Remover la flag antes de enviar
            .split('|||')
            .map(msg => msg.trim())
            .filter(msg => msg.length > 0);

        // Enviar mensajes secuencialmente con una pequeña pausa para simular escritura natural
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            // Pausa entre burbujas (excepto la primera)
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await sendMessageToChatwoot(conversation.id, message, 'outgoing');
            console.log(`[BOT-DEBUG] Burbuja ${i + 1}/${messages.length} enviada`);
        }

        if (shouldTransfer) {
            console.log('🚨 [TRANSFER] Cliente solicitó agente humano para conversación:', conversation.id);
        }

        return NextResponse.json({
            status: 'success',
            bubblesSent: messages.length,
            transferred: shouldTransfer
        });
    } catch (error) {
        console.error('Error in Chatwoot webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

