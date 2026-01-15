import type { NextApiRequest, NextApiResponse } from 'next'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sendMessageToChatwoot } from '@/lib/chatwoot'

const BARBER_CONTEXT = `Eres ChamoBot, asistente digital de Chamos Barber. Tu estilo es amigable, pana y directo.

REGLAS CLAVE:
- Respuestas CORTAS (máximo 2-3 líneas)
- Usa 1-2 emojis: 💈, ✂️, 😎, 🔥
- Habla natural, no robotizado
- Link de reserva: https://chamosbarber.com/agendar
- Link de servicios: https://chamosbarber.com/servicios

PRECIOS:
- Corte clásico: $10.000 (incluye lavado y peinado)

EJEMPLOS:
Usuario: "Hola"
Tú: "¡Hola! ¿Qué tal? 💈 ¿Buscas corte o consultar precios?"

Usuario: "Cuánto cuesta un corte"
Tú: "El corte te sale en $10.000. Te incluye lavado y peinado 😎 ||| ¿Te animas? Reserva aquí: https://chamosbarber.com/agendar"

Usuario: "Quiero una cita"
Tú: "Dale, el sistema es automático para que nadie te quite el cupo 🔒 ||| Asegúralo aquí: https://chamosbarber.com/agendar"

Si piden hablar con humano, di: "Entiendo, ya aviso al equipo 🙏" y agrega la palabra TRANSFER_AGENT al final.

Usa ||| para separar mensajes diferentes.`

type ChatwootMessage = {
    content: string
    message_type: 'incoming' | 'outgoing'
    created_at: number
    conversation: {
        id: number
        inbox_id: number
        contact_inbox: {
            source_id: string
        }
    }
    sender?: {
        name?: string
        type: 'contact' | 'user'
    }
    event: 'message_created' | 'message_updated' | 'conversation_created'
}

type ChatwootWebhookPayload = ChatwootMessage

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Solo aceptar POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const payload = req.body as ChatwootWebhookPayload

        console.log('📥 [Chatwoot Webhook] Received:', {
            event: payload.event,
            messageType: payload.message_type,
            content: payload.content?.substring(0, 50) + '...',
            conversationId: payload.conversation?.id,
        })

        // Filtrar mensajes que NO debemos procesar
        if (payload.event !== 'message_created') {
            console.log('⏭️ [Chatwoot Webhook] Skipping: Event is not message_created')
            return res.status(200).json({ status: 'ignored', reason: 'not_message_created' })
        }

        if (payload.message_type !== 'incoming') {
            console.log('⏭️ [Chatwoot Webhook] Skipping: Message is outgoing (bot or agent)')
            return res.status(200).json({ status: 'ignored', reason: 'outgoing_message' })
        }

        if (payload.sender?.type === 'user') {
            console.log('⏭️ [Chatwoot Webhook] Skipping: Message from agent/bot')
            return res.status(200).json({ status: 'ignored', reason: 'agent_message' })
        }

        if (!payload.content || payload.content.trim() === '') {
            console.log('⏭️ [Chatwoot Webhook] Skipping: Empty message')
            return res.status(200).json({ status: 'ignored', reason: 'empty_content' })
        }

        // Generar respuesta con Gemini usando SDK oficial
        const userMessage = payload.content
        const userName = payload.sender?.name || 'Cliente'

        console.log('🤖 [AI] Generating response for:', userMessage)

        // Inicializar Google Generative AI
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
        if (!apiKey) {
            throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured')
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        // Crear el prompt
        const fullPrompt = `${BARBER_CONTEXT}

Usuario (${userName}): ${userMessage}

ChamoBot:`

        console.log('📝 [AI] Sending prompt to Gemini...')

        const result = await model.generateContent(fullPrompt)
        const response = await result.response
        const aiResponse = response.text()

        console.log('💬 [AI] Generated response:', aiResponse)
        console.log('💬 [AI] Response length:', aiResponse?.length || 0)

        // Verificar que la respuesta no esté vacía
        if (!aiResponse || aiResponse.trim() === '') {
            console.error('⚠️ [AI] Empty response from Gemini, using fallback')
            await sendMessageToChatwoot(
                payload.conversation.id,
                '¡Hola! Soy ChamoBot 💈 ¿En qué puedo ayudarte hoy?',
                'outgoing'
            )
            return res.status(200).json({
                status: 'success',
                messagesSent: 1,
                fallback: true,
            })
        }

        // Detectar si se debe transferir a agente humano
        const shouldTransfer = aiResponse.includes('TRANSFER_AGENT')

        // Dividir respuesta por ||| para enviar múltiples mensajes
        const messages = aiResponse
            .replace('TRANSFER_AGENT', '') // Remover la flag antes de enviar
            .split('|||')
            .map((msg) => msg.trim())
            .filter((msg) => msg.length > 0)

        // Enviar mensajes a Chatwoot con pausa entre ellos
        const conversationId = payload.conversation.id

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i]

            // Pausa de 800ms entre mensajes para simular escritura
            if (i > 0) {
                await new Promise((resolve) => setTimeout(resolve, 800))
            }

            await sendMessageToChatwoot(conversationId, message, 'outgoing')
            console.log(`📤 [Chatwoot] Sent message ${i + 1}/${messages.length}`)
        }

        // Si se debe transferir, marcar conversación para agente humano
        if (shouldTransfer) {
            console.log(
                '🚨 [Transfer] Customer requested human agent for conversation:',
                conversationId
            )
        }

        return res.status(200).json({
            status: 'success',
            messagesSent: messages.length,
            transferred: shouldTransfer,
        })
    } catch (error) {
        console.error('❌ [Chatwoot Webhook] Error:', error)
        console.error('❌ [Error Details]:', JSON.stringify(error, null, 2))

        // En caso de error, enviar mensaje genérico al usuario
        try {
            const payload = req.body as ChatwootWebhookPayload
            if (payload?.conversation?.id) {
                await sendMessageToChatwoot(
                    payload.conversation.id,
                    'Disculpa, tuve un problema técnico. Un momento que te comunico con el equipo 🙏',
                    'outgoing'
                )
            }
        } catch (fallbackError) {
            console.error('❌ [Chatwoot] Failed to send error message:', fallbackError)
        }

        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        })
    }
}
