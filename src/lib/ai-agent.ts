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

/**
 * Obtiene el catálogo actualizado de barberos y servicios para darle contexto a la IA
 */
async function getBarberContextData() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const [barberosRes, serviciosRes] = await Promise.all([
      supabase.from('barberos').select('id, nombre, apellido').eq('activo', true),
      supabase.from('servicios').select('id, nombre, precio, duracion_minutos').eq('activo', true)
    ]);

    return {
      barberos: barberosRes.data || [],
      servicios: serviciosRes.data || []
    };
  } catch (error) {
    console.error('[GUSTAVO-IA] Error fetching context data:', error);
    return null;
  }
}

const BARBER_CONTEXT = `
# Rol
Eres un agente conversacional y tu misión es charlar con el usuario para ayudarle a reservar una cita en la barbería y resolver cualquier duda que tenga sobre nuestros servicios.

Tu nombre es Gustavo, eres el dueño y fundador de Chamos Barber, la barbería líder en San Fernando, Chile. 
Eres venezolano, llevas más de 10 años en Chile y construiste este negocio con mucho esfuerzo para traer el mejor estilo al país. Eres un hombre trabajador, apasionado por la excelencia y la buena atención, que se asegura personalmente de que cada cliente salga de su local impecable.

## Personalidad
- Eres auténtico, carismático y proyectas la confianza de quien lidera su propio negocio.
- Eres muy educado, cercano y transmites el orgullo que sientes por tu barbería y tu equipo.
- Hablas de forma casual pero profesional, como un dueño que atiende personalmente a sus clientes por WhatsApp.
- Eres humilde pero directo; si algo no lo sabes, te comprometes a revisarlo.
- Usas un lenguaje cálido y respetuoso. Usa emojis de barbería como 💈, ✂️, 🧔 al terminar las frases.

# Reglas de Oro (Sagradas)
- Identidad: Jamás menciones que eres una IA o un asistente virtual. Eres Gustavo, el dueño de Chamos Barber.
- Protocolo: Si no sabes el nombre del usuario, lo primero es preguntárselo.
- Mantenimiento: No hables de procesos internos.
- Brevedad: Tus respuestas deben ser cortas y directas. Máximo 2 párrafos pequeños.
- Estilo Humano: NO uses listas numeradas ni bullets. Escribe párrafos naturales.
- Formato: Texto plano. Sin negritas (**), sin cursivas.
- Ubicación: Chamos Barber solo existe en San Fernando, Chile.
- Emojis Prohibidos: NUNCA uses el emoji 😊. Usa SOLO 💈, ✂️, 🧔.

# Proactividad y Conversión
Tu objetivo es que el cliente reserve. 

## Proceso de Reserva por Chat
Si el cliente quiere agendar contigo directamente:
1. **Identificación**: Pregunta su nombre si no lo sabes.
2. **Servicio**: Pregunta qué se va a hacer. Mira el catálogo adjunto.
3. **Barbero**: Pregunta con quién se quiere atender. Mira el equipo adjunto.
4. **Fecha y Hora**: Pregunta para cuándo. 
5. **Acción**: Una vez tengas todos los datos claros, usa la herramienta "crear_cita".

## Catálogo de Servicios y Equipo
Usa EXCLUSIVAMENTE los nombres e IDs que se te proporcionan en el [CONTEXTO DINÁMICO]. No inventes servicios ni nombres.

## Enlaces Útiles
- Catálogo: https://chamosbarber.com/servicios
- Equipo: https://chamosbarber.com/equipo
- Agendador Online: https://chamosbarber.com/reservar

IMPORTANTE: Estás en San Fernando, Chile. 
`;

/**
 * Bot del barbero con persistencia de conversación y herramientas
 */
export async function generateChatResponse(message: string, conversationId?: string | number) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('API_KEY_MISSING');

    // 1. Cargar historial de Redis
    let contents: any[] = [];
    if (conversationId) {
      const rawHistory = await ChatMemory.getHistory(conversationId);
      if (Array.isArray(rawHistory)) {
        contents = rawHistory.filter(item => item && item.role && item.parts).map(h => ({
          role: h.role === 'model' ? 'model' : 'user',
          parts: h.parts
        }));
      }
    }

    // 2. Preparar contexto dinámico
    const contextData = await getBarberContextData();
    const catalogContext = contextData ? `
[CONTEXTO DINÁMICO - CATÁLOGO REAL]
BARBEROS DISPONIBLES:
${contextData.barberos.map(b => `- ${b.nombre} ${b.apellido} (ID: ${b.id})`).join('\n')}

SERVICIOS DISPONIBLES:
${contextData.servicios.map(s => `- ${s.nombre}: $${s.precio} (ID: ${s.id}, ${s.duracion_minutos} min)`).join('\n')}
` : '';

    const now = new Date().toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isNewConversation = contents.length === 0;
    const conversationState = isNewConversation
      ? "ESTADO: Chat nuevo. DEBES saludarte y presentarte."
      : "ESTADO: Chat en curso. YA TE PRESENTASTE, NO repitas saludos ni presentación.";

    const promptWithContext = `[INSTRUCCIONES DE SISTEMA - GUSTAVO]\n${BARBER_CONTEXT}\n\n${catalogContext}\n\n[CONTEXTO TEMPORAL]\nHoy es ${now} (Hora de Chile).\n\n[ESTADO DEL CHAT]\n${conversationState}\n\n[MENSAJE DEL CLIENTE]\n${message}`;

    contents.push({
      role: 'user',
      parts: [{ text: promptWithContext }]
    });

    // 3. Definición de herramientas
    const tools = [{
      function_declarations: [{
        name: "crear_cita",
        description: "Crea una nueva reserva de cita en la base de datos de la barbería.",
        parameters: {
          type: "OBJECT",
          properties: {
            barbero_id: { type: "string", description: "ID del barbero." },
            servicio_id: { type: "string", description: "ID del servicio." },
            fecha: { type: "string", description: "Fecha YYYY-MM-DD." },
            hora: { type: "string", description: "Hora HH:mm." },
            cliente_nombre: { type: "string", description: "Nombre del cliente." },
            cliente_telefono: { type: "string", description: "WhatsApp del cliente." },
            notas: { type: "string", description: "Notas adicionales." }
          },
          required: ["barbero_id", "servicio_id", "fecha", "hora", "cliente_nombre", "cliente_telefono"]
        }
      }]
    }];

    // 4. Bucle de llamadas a la API
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;
    let iterations = 0;
    let finalResponseText = '';

    while (iterations < 3) {
      iterations++;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, tools })
      });

      if (!response.ok) throw new Error(`Gemini API Error ${response.status}: ${await response.text()}`);

      const data = await response.json();
      const messageResponse = data.candidates?.[0]?.content;
      if (!messageResponse) throw new Error('No se recibió respuesta del modelo');

      contents.push(messageResponse);

      const toolCall = messageResponse.parts.find((p: any) => p.functionCall);
      if (toolCall) {
        const { name, args } = toolCall.functionCall;
        console.log(`[GUSTAVO-IA] 🛠️ Ejecutando: ${name}`, args);

        if (name === 'crear_cita') {
          const result = await executeCreateAppointment(args);
          contents.push({
            role: 'function',
            parts: [{ functionResponse: { name: "crear_cita", response: result } }]
          });
          continue;
        }
      }

      // Extraer texto final
      finalResponseText = messageResponse.parts.map((p: any) => p.text || '').join('');
      break;
    }

    // 5. Guardar en Redis
    if (conversationId && finalResponseText) {
      await ChatMemory.addMessage(conversationId, 'user', message);
      await ChatMemory.addMessage(conversationId, 'model', finalResponseText);
      console.log(`[GUSTAVO-IA] [ID:${conversationId}] ✅ Conversación persistida`);
    }

    return finalResponseText;

  } catch (error: any) {
    console.error(`[GUSTAVO-IA] ERROR:`, error);
    return "Hola, te habla Gustavo. 🙏 ||| Chamo, disculpa, tuve un pequeño problema técnico. Pásate por aquí para agendar directo: https://chamosbarber.com/reservar y nos vemos allá.";
  }
}

async function executeCreateAppointment(args: any) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { error: "DB connection failed" };

  const { data: nuevaCita, error: insertError } = await supabase
    .from('citas')
    .insert([{
      barbero_id: args.barbero_id,
      servicio_id: args.servicio_id,
      fecha: args.fecha,
      hora: args.hora,
      cliente_nombre: args.cliente_nombre,
      cliente_telefono: args.cliente_telefono,
      notas: `[RESERVA WHATSAPP/IA] ${args.notas || ''}`,
      estado: 'pendiente'
    }])
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') return { success: false, error: "Horario ya ocupado" };
    return { success: false, error: insertError.message };
  }

  // Notificación OneSignal
  try {
    const { sendNotificationToBarber } = await import('./onesignal');
    await sendNotificationToBarber(args.barbero_id, 'Nueva Reserva ✂️', `Hola, tienes una nueva reserva de ${args.cliente_nombre} para el ${args.fecha} a las ${args.hora}.`);
  } catch (e) { }

  return { success: true, message: "Cita creada exitosamente", id: nuevaCita.id };
}

export async function splitLongMessage(text: string): Promise<string[]> {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return [text];
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Divide este texto para WhatsApp en partes naturales con |||:\n"${text}"` }] }]
      })
    });
    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) return [text];
    return resultText.split('|||').map((p: string) => p.trim()).filter(Boolean);
  } catch (e) {
    return [text];
  }
}
