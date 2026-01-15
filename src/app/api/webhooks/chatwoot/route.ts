import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse } from '@/lib/ai-agent';
import { sendMessageToChatwoot } from '@/lib/chatwoot';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Solo procesar mensajes creados
        if (body.event !== 'message_created') {
            return NextResponse.json({ status: 'ignored_event' });
        }

        const { message_type, content, conversation, account } = body;

        // Solo responder a mensajes entrantes (del cliente)
        if (message_type !== 'incoming') {
            return NextResponse.json({ status: 'bot_message_ignored' });
        }

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
