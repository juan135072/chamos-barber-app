import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

const redis = redisUrl ? new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        if (times > 3) return null; // Dejar de reintentar rápido para no bloquear
        return delay;
    }
}) : null;

if (redis) {
    redis.on('error', (err) => {
        console.error('[REDIS] Connection Error:', err.message);
    });
}

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
    getHistory: async (conversationId: string | number, limit = 20) => {
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

            // Limitar el tamaño de la lista (ej: últimos 20 mensajes)
            await redis.ltrim(key, 0, 19);

            // Expiración en 45 días (cobertura total para ciclos de barbería)
            await redis.expire(key, 3888000);
        } catch (error) {
            console.error('[REDIS] Error adding message:', error);
        }
    },

    /**
     * BUFFER TEMPORAL (Para agrupación de mensajes / Debounce)
     */
    appendToBuffer: async (conversationId: string | number, text: string) => {
        if (!redis) return;
        try {
            const key = `chat_buffer:${conversationId}`;
            await redis.rpush(key, text);
            await redis.expire(key, 60); // 1 minuto de vida por si acaso
        } catch (error) {
            console.error('[REDIS] Error appending to buffer:', error);
        }
    },

    getBuffer: async (conversationId: string | number) => {
        if (!redis) return [];
        try {
            const key = `chat_buffer:${conversationId}`;
            return await redis.lrange(key, 0, -1);
        } catch (error) {
            console.error('[REDIS] Error getting buffer:', error);
            return [];
        }
    },

    clearBuffer: async (conversationId: string | number) => {
        if (!redis) return;
        try {
            await redis.del(`chat_buffer:${conversationId}`);
        } catch (error) {
            console.error('[REDIS] Error clearing buffer:', error);
        }
    },

    /**
     * Seguimiento del ID del último evento para saber si hubo mensajes nuevos durante la espera.
     */
    setLastEventId: async (conversationId: string | number, eventId: string) => {
        if (!redis) return;
        try {
            await redis.set(`last_event:${conversationId}`, eventId, 'EX', 60);
        } catch (error) {
            console.error('[REDIS] Error setting last event ID:', error);
        }
    },

    getLastEventId: async (conversationId: string | number) => {
        if (!redis) return null;
        try {
            return await redis.get(`last_event:${conversationId}`);
        } catch (error) {
            console.error('[REDIS] Error getting last event ID:', error);
            return null;
        }
    }
};

export default redis;
