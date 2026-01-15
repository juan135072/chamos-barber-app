import type { NextApiRequest, NextApiResponse } from 'next'
import { generateText } from 'ai'
import { aiModel, BARBER_CONTEXT } from '@/lib/ai-config'
import { sendMessageToChatwoot } from '@/lib/chatwoot'

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
        // 1. Solo procesar event "message_created"
        if (payload.event !== 'message_created') {
            console.log('⏭️ [Chatwoot Webhook] Skipping: Event is not message_created')
            return res.status(200).json({ status: 'ignored', reason: 'not_message_created' })
        }

        // 2. Solo procesar mensajes entrantes (incoming)
        if (payload.message_type !== 'incoming') {
            console.log('⏭️ [Chatwoot Webhook] Skipping: Message is outgoing (bot or agent)')
            return res.status(200).json({ status: 'ignored', reason: 'outgoing_message' })
        }

        // 3. Ignorar mensajes del bot mismo
        if (payload.sender?.type === 'user') {
            console.log('⏭️ [Chatwoot Webhook] Skipping: Message from agent/bot')
            return res.status(200).json({ status: 'ignored', reason: 'agent_message' })
        }

        // 4. Verificar que hay contenido
        if (!payload.content || payload.content.trim() === '') {
            console.log('⏭️ [Chatwoot Webhook] Skipping: Empty message')
            return res.status(200).json({ status: 'ignored', reason: 'empty_content' })
        }

        // Generar respuesta con Gemini
        const userMessage = payload.content
        const userName = payload.sender?.name || 'Cliente'

        console.log('🤖 [AI] Generating response for:', userMessage)

        // Crear el prompt combinado
        const fullPrompt = `${BARBER_CONTEXT}

Usuario (${userName}): ${userMessage}

ChamoBot:`

        const { text: aiResponse } = await generateText({
            model: aiModel,
            prompt: fullPrompt,
            temperature: 0.7,
        })

        console.log('💬 [AI] Generated response:', aiResponse)

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
            // TODO: Implementar lógica de transferencia a agente humano
            // Por ahora solo lo logueamos
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
