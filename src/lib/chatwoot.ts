const CHATWOOT_URL = process.env.CHATWOOT_URL
const CHATWOOT_ACCESS_TOKEN = process.env.CHATWOOT_ACCESS_TOKEN

/**
 * Send a message to Chatwoot conversation
 * @param conversationId - The conversation ID
 * @param content - The message content
 * @param messageType - 'outgoing' for bot messages, 'incoming' for user messages
 * @param accountIdOverride - Optional account ID extracted from webhook
 */
export async function sendMessageToChatwoot(
    conversationId: number,
    content: string,
    messageType: 'outgoing' | 'incoming' = 'outgoing',
    accountIdOverride?: number
) {
    if (!CHATWOOT_URL || !CHATWOOT_ACCESS_TOKEN) {
        console.warn('⚠️ CHATWOOT_URL or CHATWOOT_ACCESS_TOKEN not configured')
        return null
    }

    try {
        // Use override if provided, otherwise environment variable, otherwise default to 1
        const accountId = accountIdOverride || Number(process.env.CHATWOOT_ACCOUNT_ID) || 1

        const response = await fetch(
            `${CHATWOOT_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api_access_token': CHATWOOT_ACCESS_TOKEN,
                },
                body: JSON.stringify({
                    content: content,
                    message_type: messageType,
                    private: false,
                }),
            }
        )

        if (!response.ok) {
            const error = await response.text()
            console.error(`❌ [Chatwoot] Error sending message:`, error)
            throw new Error(`Chatwoot API error: ${response.status} ${error}`)
        }

        const result = await response.json()
        console.log(`✅ [Chatwoot] Message sent successfully`)
        return result
    } catch (error) {
        console.error('❌ [Chatwoot] Network error:', error)
        throw error
    }
}
