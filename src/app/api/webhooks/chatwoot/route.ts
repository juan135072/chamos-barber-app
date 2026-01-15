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

        const { message_type, content, conversation, account } = body;

        // Solo responder a mensajes entrantes (del cliente)
        if (message_type !== 'incoming') {
            console.log(`[BOT-DEBUG] Mensaje ignorado (tipo: ${message_type})`);
            return NextResponse.json({ status: 'bot_message_ignored' });
        }

        console.log(`[BOT-DEBUG] Procesando mensaje: "${content}" en conversación ${conversation.id}`);

        // Generar respuesta con AI
        const aiResponse = await generateChatResponse(content);

        // Enviar respuesta a Chatwoot
        await sendMessageToChatwoot(account.id, conversation.id, aiResponse);

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('Error in Chatwoot webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
