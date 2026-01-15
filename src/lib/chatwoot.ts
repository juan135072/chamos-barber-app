const CHATWOOT_URL = process.env.CHATWOOT_URL;
const CHATWOOT_API_KEY = process.env.CHATWOOT_API_KEY;

export async function sendMessageToChatwoot(
    accountId: number,
    conversationId: number,
    content: string
) {
    if (!CHATWOOT_URL || !CHATWOOT_API_KEY) {
        console.warn('⚠️ CHATWOOT_URL o CHATWOOT_API_KEY no están configurados');
        return null;
    }

    // Split content by ||| for multiple bubbles if needed by the caller, 
    // but usually webhooks expects one message at a time or handles the separator.
    // For WhatsApp via Chatwoot, sending multiple messages sequentially is better.
    const parts = content.split('|||').map(p => p.trim()).filter(Boolean);

    const results = [];
    for (const part of parts) {
        try {
            const response = await fetch(
                `${CHATWOOT_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api_access_token': CHATWOOT_API_KEY,
                    },
                    body: JSON.stringify({
                        content: part,
                        message_type: 'outgoing',
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ Error sending message to Chatwoot:', error);
            } else {
                results.push(await response.json());
            }
        } catch (error) {
            console.error('❌ Network error sending to Chatwoot:', error);
        }
    }

    return results;
}
