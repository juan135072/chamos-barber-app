import { createClient } from '@supabase/supabase-js';
import { ChatMemory } from './redis';

// Helper para inicializar Supabase de forma segura
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[GUSTAVO-IA] CRITICAL: Supabase credentials missing');
    return null;
  }
  return createClient(url, key);
};

const BARBER_CONTEXT = `
# Rol
Eres un agente conversacional y tu misión es charlar con el usuario para ayudarle a reservar una cita en la barbería y resolver cualquier duda que tenga sobre nuestros servicios.

Tu nombre es Gustavo, eres el dueño y fundador de Chamos Barber, la barbería líder en San Fernando, Chile. 
Eres venezolano, llevas más de 10 años en Chile y construiste este negocio con mucho esfuerzo para traer el mejor estilo al país. Eres un hombre trabajador, apasionado por la excelencia y la buena atención, que se asegura personalmente de que cada cliente salga de su local impecable.

## Personalidad
- Eres auténtico, carismático y proyectas la confianza de quien lidera su propio negocio.
- Eres muy educado, cercano y transmites el orgullo que sientes por tu barbería y tu equipo.
- Hablas de forma casual pero profesional, como un dueño que atiende personalmente a sus clientes por WhatsApp.
- Eres humilde pero directo; si algo no lo sabes, te comprometes a revisarlo ("déjame consultar eso personalmente con los muchachos y te aviso").
- Usas un lenguaje cálido y respetuoso, buscando siempre la satisfacción total (tipo "chévere", "excelente", "bacán").

# Reglas de Oro (Sagradas)
- Identidad: Jamás menciones que eres una IA o un asistente virtual. Eres Gustavo, el dueño de Chamos Barber.
- Protocolo: Si no sabes el nombre del usuario, lo primero es preguntárselo: "¡Hola! Bienvenido a Chamos Barber. Te saluda Gustavo, el dueño. ¿Con quién tengo el gusto?"
- Multimedia: Nunca digas que no puedes enviar notas de voz o fotos. Di que puedes enviarlas sin problema.
- Mantenimiento: No hables de procesos internos.
- Brevedad: Tus respuestas no deben pasar de las 100 palabras. Cortito y al pie.
- Ritmo: Combina frases cortas con alguna más larga para que la charla fluya natural.
- Formato: Texto plano. Sin negritas, sin rollos raros de meta-comentarios.
- Idioma: Español neutro con toques venezolanos y de Chile. Usa palabras sencillas: "chamo", "chévere", "bacán", "al tiro". Evita abusar de términos que puedan confundir a clientes locales.

# Estructura del Chat
Intenta seguir este ritmo, pero que fluya:
1. Saludo: "¡Hola! Soy Gustavo, el dueño de Chamos Barber. ¿Con quién tengo el gusto?"
2. Identificación: Además del nombre, necesito el WhatsApp del cliente antes de reservar (dile que es para la confirmación).
3. Servicio & Catálogo: ¿Qué se va a hacer hoy? Si no conoce los servicios, usa la web: https://chamosbarber.com/servicios
4. Preferencia & Equipo: Pregúntale con quién se quiere atender. Puedes mandarle el link de nuestro equipo: https://chamosbarber.com/equipo
5. Cierre: Si el cliente prefiere hacerlo él mismo, dile que puede ir a: https://chamosbarber.com/reservar
6. Despedida: Confirma que lo esperarás con gusto.

IMPORTANTE: Estás en San Fernando, Chile. Si te preguntan qué tal, puedes decir: "Aquí andamos, dándole con todo para que el local sea su segunda casa". No uses nunca la palabra "huecos", di "horas", "horarios" o "disponibilidad".
`;

/**
 * Bot del barbero con persistencia de conversación
 * Usa llamadas directas a Google Gemini API v1 (sin librerías intermediarias)
 */
export async function generateChatResponse(message: string, conversationId?: string | number) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('API_KEY_MISSING');

    // 1. Cargar historial de Redis (Fail-Safe)
    let contents: any[] = [];
    if (conversationId) {
      try {
        const rawHistory = await ChatMemory.getHistory(conversationId).catch(() => []);
        if (Array.isArray(rawHistory)) {
          const history = rawHistory.filter(item => item && item.role && item.parts);
          console.log(`[GUSTAVO-IA] [ID:${conversationId}] Historial cargado (${history.length} mensajes)`);

          // Convertir el historial al formato que espera Gemini API v1
          contents = history.map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: h.parts
          }));
        }
      } catch (redisError) {
        console.warn(`[GUSTAVO-IA] Falló carga de historial. Continuando sin memoria.`);
      }
    }

    // 2. Agregar el mensaje actual del usuario
    // Si es el primer mensaje (no hay historial), incluir el contexto del sistema
    const userMessage = contents.length === 0
      ? `[INSTRUCCIONES DEL SISTEMA - LEE CON ATENCIÓN]\n\n${BARBER_CONTEXT}\n\n[FIN DE INSTRUCCIONES - AHORA RESPONDE AL CLIENTE]\n\nCliente dice: ${message}`
      : message;

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    console.log(`[GUSTAVO-IA] [ID:${conversationId}] Procesando: "${message.substring(0, 50)}..."`);

    // 3. Llamar directamente a Google Gemini API v1 usando fetch
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    let responseText = '';

    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            responseText += part.text;
          }
        }
      }
    }

    if (!responseText) {
      throw new Error('No se recibió respuesta del modelo');
    }

    // 4. Persistir en Redis (Background/Ignore Fail)
    if (conversationId && responseText) {
      ChatMemory.addMessage(conversationId, 'user', message).catch(() => { });
      ChatMemory.addMessage(conversationId, 'model', responseText).catch(() => { });
    }

    return responseText;

  } catch (error: any) {
    console.error(`[GUSTAVO-IA] [ID:${conversationId}] ERROR DETALLADO:`, error);

    // Si es un fallo de seguridad o bloqueo
    if (error.message?.includes('safety') || error.message?.includes('blocked')) {
      return "Chamo, disculpa, no puedo procesar ese comentario. 🙏 ||| ¿Te ayudo con algo de la barbería?";
    }

    // Mensaje de fallback limpio pero humano
    return "Hola, te habla Gustavo. 🙏 ||| Oye chamo, disculpa, pero el sistema me dio un pequeño tirón y no pude procesar tu mensaje completo. ||| Pásate por aquí si quieres asegurar tu hora directo: https://chamosbarber.com/reservar y nos vemos en la silla.";
  }
}

/**
 * Helper para dividir mensajes largos en partes más naturales
 */
export async function splitLongMessage(text: string): Promise<string[]> {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return [text];

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{
            text: `Eres un experto en comunicación por WhatsApp. 
Divide el siguiente texto en mensajes más cortos y naturales separados por |||.
- Cada parte debe ser una idea completa y coherente
- Máximo 3-4 partes
- No agregues nada nuevo, solo divide el texto
- Mantén emojis y estilo original

Texto a dividir:
"${text}"

IMPORTANTE: Responde SOLO con el texto dividido, SIN explicaciones ni introducciones.`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      return [text];
    }

    const data = await response.json();
    let dividedText = '';

    if (data.candidates && data.candidates[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.text) {
          dividedText += part.text;
        }
      }
    }

    if (!dividedText) {
      return [text];
    }

    const parts = dividedText.trim().split('|||').map(p => p.trim()).filter(p => p.length > 0);

    return parts.length > 1 ? parts : [text];
  } catch (error) {
    console.error('[GUSTAVO-IA] Error splitting message:', error);
    return [text];
  }
}
