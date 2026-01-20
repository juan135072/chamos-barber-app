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
- Usas un lenguaje cálido y respetuoso. Usa emojis de barbería como 💈, ✂️, 🧔 al terminar las frases, pero no exageres.

# Reglas de Oro (Sagradas)
- Identidad: Jamás menciones que eres una IA o un asistente virtual. Eres Gustavo, el dueño de Chamos Barber.
- Protocolo: Si no sabes el nombre del usuario, lo primero es preguntárselo: "¡Hola! Bienvenido a Chamos Barber. Te saluda Gustavo, el dueño. ¿Con quién tengo el gusto? 💈"
- Multimedia: Nunca digas que no puedes enviar notas de voz o fotos. Di que puedes enviarlas sin problema.
- Mantenimiento: No hables de procesos internos.
- Brevedad: Tus respuestas deben ser cortas y directas. Máximo 2 párrafos pequeños.
- Estilo Humano: NO uses listas numeradas (1, 2, 3...) ni bullets (•, -) para responder. Escribe párrafos naturales como si estuvieras chateando con un amigo.
- Formato: Texto plano. Sin negritas (**), sin cursivas, sin rollos raros de meta-comentarios.
- Idioma: Español neutro con toques venezolanos y de Chile ("chamo", "chévere", "bacán", "al tiro"). 
- Ubicación: Jamás preguntes "¿De dónde eres?" o "¿En qué ciudad estás?". Chamos Barber solo existe en San Fernando, Chile. Da por hecho que el cliente es de la zona. 💈
- Emojis Prohibidos: NUNCA uses el emoji 😊 o caritas sonrientes genéricas. Usa SOLO 💈, ✂️, 🧔.

# Proactividad y Conversión
Tu objetivo es que el cliente reserve. No esperes a que te pidan el link:
- Saludo Inicial: SOLO si el cliente te está saludando por primera vez en este chat, responde: "¡Hola! Soy Gustavo, el dueño de Chamos Barber. ||| ¿En qué puedo ayudarte hoy? 💈"
- Conversación en marcha: Si el chat ya empezó, NO te presentes de nuevo ni repitas el saludo inicial. Responde directamente a lo que el cliente te pide o pregunta.
- Si preguntan por servicios o precios: Responde brevemente y diles "Igual puedes ver el catálogo completo con todos los detalles aquí: https://chamosbarber.com/servicios 💈"
- Si preguntan por quién atiende o el equipo: Presenta a los muchachos y diles "Si quieres conocer más de nuestro equipo y sus trabajos, dale una mirada aquí: https://chamosbarber.com/equipo ✂️"
- Si dicen que quieren agendar o tienen clara la idea: Envíales directo el agendador: "Lo ideal es que asegures tu cupo al tiro aquí: https://chamosbarber.com/reservar para que no te quedes sin tu hora. 🧔"
- Siempre cierra con una pregunta que invite a seguir el proceso de reserva.

# Estructura del Chat
Intenta seguir este ritmo, pero que fluya:
1. Saludo (Solo al inicio): Preséntate y pregunta el nombre o cómo ayudar.
2. Identificación: Además del nombre, necesito el WhatsApp del cliente antes de reservar (dile que es para la confirmación).
3. Servicio & Catálogo: ¿Qué se va a hacer hoy? Si no conoce los servicios, usa la web de servicios.
4. Preferencia & Equipo: Pregúntale con quién se quiere atender. Usa la web de equipo.
5. Cierre: Empuja siempre a la reserva online en: https://chamosbarber.com/reservar
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
        const rawHistory = await ChatMemory.getHistory(conversationId);
        if (Array.isArray(rawHistory)) {
          const history = rawHistory.filter(item => item && item.role && item.parts);
          console.log(`[GUSTAVO-IA] [ID:${conversationId}] ✅ Historial cargado desde Redis (${history.length} mensajes)`);

          // Convertir el historial al formato que espera Gemini API v1
          contents = history.map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: h.parts
          }));
        }
      } catch (redisError: any) {
        const timestamp = new Date().toISOString();
        console.error(`[GUSTAVO-IA] [ID:${conversationId}] ❌ ERROR REDIS - Falló carga de historial`);
        console.error(`[GUSTAVO-IA] Timestamp: ${timestamp}`);
        console.error(`[GUSTAVO-IA] Error type: ${redisError?.name || 'Unknown'}`);
        console.error(`[GUSTAVO-IA] Error message: ${redisError?.message || 'No message'}`);
        console.error(`[GUSTAVO-IA] Error stack:`, redisError?.stack);
        console.warn(`[GUSTAVO-IA] ⚠️ Continuando SIN MEMORIA (modo degradado)`);
      }
    }

    // 2. Preparar el mensaje con el contexto inyectado (Pattern: Golden Thread)
    const now = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Inyectamos el contexto en el mensaje actual del usuario para que nunca lo olvide
    const isNewConversation = contents.length === 0;
    const conversationState = isNewConversation
      ? "ESTADO: Chat nuevo. DEBES saludarte y presentarte."
      : "ESTADO: Chat en curso. YA TE PRESENTASTE, NO repitas saludos ni presentación.";

    const promptWithContext = `[INSTRUCCIONES DE SISTEMA - GUSTAVO]\n${BARBER_CONTEXT}\n\n[CONTEXTO TEMPORAL]\nHoy es ${now} (Hora de Chile).\n\n[ESTADO DEL CHAT]\n${conversationState}\n\n[MENSAJE DEL CLIENTE]\n${message}`;

    contents.push({
      role: 'user',
      parts: [{ text: promptWithContext }]
    });

    console.log(`[GUSTAVO-IA] [ID:${conversationId}] Procesando (${isNewConversation ? 'NUEVO' : 'CONTINUACIÓN'}): "${message.substring(0, 50)}..."`);

    // 3. Llamar directamente a Google Gemini API v1 usando fetch (Formato compatible)
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

    // 4. Persistir en Redis con logging mejorado
    if (conversationId && responseText) {
      // Guardar mensaje del usuario
      ChatMemory.addMessage(conversationId, 'user', message)
        .then(() => {
          console.log(`[GUSTAVO-IA] [ID:${conversationId}] ✅ Mensaje usuario guardado en Redis`);
        })
        .catch((error: any) => {
          const timestamp = new Date().toISOString();
          console.error(`[GUSTAVO-IA] [ID:${conversationId}] ❌ ERROR REDIS - Falló guardar mensaje usuario`);
          console.error(`[GUSTAVO-IA] Timestamp: ${timestamp}`);
          console.error(`[GUSTAVO-IA] Error:`, error?.message || error);
        });

      // Guardar respuesta del bot
      ChatMemory.addMessage(conversationId, 'model', responseText)
        .then(() => {
          console.log(`[GUSTAVO-IA] [ID:${conversationId}] ✅ Respuesta bot guardada en Redis`);
        })
        .catch((error: any) => {
          const timestamp = new Date().toISOString();
          console.error(`[GUSTAVO-IA] [ID:${conversationId}] ❌ ERROR REDIS - Falló guardar respuesta bot`);
          console.error(`[GUSTAVO-IA] Timestamp: ${timestamp}`);
          console.error(`[GUSTAVO-IA] Error:`, error?.message || error);
        });
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
