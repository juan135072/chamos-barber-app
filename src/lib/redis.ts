import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

const redis = redisUrl ? new Redis(redisUrl) : null;

if (!redis && process.env.NODE_ENV === 'production') {
    console.warn('[REDIS] REDIS_URL is missing in production. Buffer memory will not be available.');
}

/**
 * Gestiona el historial de chat en Redis para darle memoria a la IA.
 */
export const ChatMemory = {
    /**
     * Obtiene los últimos mensajes de una conversación.
     */
    getHistory: async (conversationId: string | number, limit = 10) => {
        if (!redis) return [];
        try {
            const key = `chat_history:${conversationId}`;
            const history = await redis.lrange(key, 0, limit - 1);
            return history.map(item => JSON.parse(item)).reverse();
        } catch (error) {
            console.error('[REDIS] Error getting history:', error);
            return [];
        }
    },

    /**
     * Añade un nuevo mensaje al historial.
     */
    addMessage: async (conversationId: string | number, role: 'user' | 'model', text: string) => {
        if (!redis) return;
        try {
            const key = `chat_history:${conversationId}`;
            const message = JSON.stringify({ role, parts: [{ text }] });

            // Añadir al inicio de la lista
            await redis.lpush(key, message);

            // Limitar el tamaño de la lista (ej: últimos 15 mensajes)
            await redis.ltrim(key, 0, 14);

            // Expiración en 24 horas si no hay actividad
            await redis.expire(key, 86400);
        } catch (error) {
            console.error('[REDIS] Error adding message:', error);
        }
    }
};

export default redis;
