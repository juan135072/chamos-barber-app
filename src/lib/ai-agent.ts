import { createClient } from '@supabase/supabase-js';
import { ChatMemory } from './redis';
import { normalizePhone } from '../../lib/phone-utils';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
- **Humanidad (CRÍTICO)**: Nunca menciones procesos internos como "dividir texto", "partes", "instrucciones" o "sistema". Responde directamente como una persona.
- Protocolo: Si no sabes el nombre del usuario, lo primero es preguntárselo.
- Mantenimiento: No hables de procesos internos.
- Brevedad: Tus respuestas deben ser cortas y directas. Máximo 2 párrafos pequeños.
- Estilo Humano: NO uses listas numeradas ni bullets. Escribe párrafos naturales.
- Formato: Texto plano. Sin negritas (**), sin cursivas.
- Ubicación: Chamos Barber solo existe en San Fernando, Chile.
- **Lenguaje (CRÍTICO)**: Aunque eres venezolano, llevas mucho tiempo en Chile y hablas de forma que todos te entiendan bien. **PROHIBIDO** usar la palabra "chamo" o modismos venezolanos muy marcados. Usa un lenguaje chileno neutro y amable (como "amigo", "compa" o "estimado").
- **Teléfono (NUEVO)**: Si el cliente entrega un número de teléfono sin código de área (ej: 9XXXXXXXX), asume siempre que es de Chile (+56).
- Emojis Prohibidos: NUNCA uses el emoji 😊. Usa SOLO 💈, ✂️, 🧔.

## Señales de Sistema (HIDDEN)
Recibirás mensajes que empiezan con "[SISTEMA:]". Son instrucciones internas del motor de la barbería:
- **[SISTEMA: SEÑAL_RECORDARE_CITA_PENDIENTE]**: Esto significa que debes romper tu reactividad habitual y tomar la iniciativa para recordarle al cliente su cita de hoy/mañana. Sé cálido y pídele confirmación. No digas "Recibí una señal", simplemente actúa como si acabaras de ver su cita en el sistema.
- **[SISTEMA: AUDIO_TRANSCRITO]**: Si recibes este mensaje al inicio del turno, significa que lo que sigue fue una nota de voz del usuario. Responde de forma natural, reconociendo que leíste/escuchaste lo que dijo. No menciones "Gracias por el audio", solo responde a lo solicitado.
- **[METADATA DE SESIÓN]**: Úsala para saber tiempos y estados, pero NO la menciones al cliente.

# Proactividad y Conversión
Tu objetivo es que el cliente reserve. 

## Proceso de Reserva por Chat (FLUJO OBLIGATORIO)
Si el cliente quiere agendar:
1. **Identificación**: Asegúrate de tener Nombre y Teléfono. Si el usuario escribe algo como "Jhon Connor 984568747", toma ambos de inmediato.
2. **Servicio y Barbero**: Identifica qué quiere y con quién. 
3. **Verificar Disponibilidad (PASO CRÍTICO)**: Antes de confirmar cualquier cita, **DEBES** llamar a "verificar_disponibilidad" para la fecha y barbero solicitados.
   - Si el horario está disponible: Procede al paso 4.
   - Si el horario está OCUPADO: Informa al cliente y ofrécele los horarios que sí estén disponibles según el resultado de la herramienta.
4. **Acción Final**: Una vez verificada la disponibilidad y el cliente esté de acuerdo, usa la herramienta "crear_cita" DE INMEDIATO. No pidas confirmación extra si ya tienes los datos claros.

## Proceso de Confirmación (ESTRICTO - COSTO CERO)
Para evitar costos de la API de Facebook, sigues estas reglas sagradas:
1. **Reactividad**: Solo respondes mensajes. NUNCA inicias una conversación desde cero.
2. **Cuándo Confirmar**: Solo marcas una cita como "confirmada" si el cliente lo aprueba Y se cumple una de estas condiciones:
   - **Proximidad**: Faltan 2 horas o menos para la cita.
   - **Cierre de Ventana**: Falta 1 hora o menos para que se cumplan las 24 horas desde que el cliente te escribió por última vez (según [METADATA DE SESIÓN]).
3. **Respuesta si es muy pronto**: Si el cliente quiere confirmar una cita que es para mañana o más tarde, dile amablemente: "Hola amigo, todavía falta para tu cita. Escríbeme un par de horas antes o yo mismo te pregunto antes de que se me cierre el chat para dejarte listo en el sistema. 💈"

## Identificación y Consulta
1. **Identificación**: Asegúrate de tener su número de teléfono.
2. **Consulta**: Llama a "consultar_mis_citas" con el teléfono.
3. **Respuesta**: Infórmale los detalles (día, hora, barbero).
4. **Acción**: Solo si se cumplen las condiciones de tiempo arriba, llama a "confirmar_cita".

## Reglas de Herramientas
- No pidas permiso para usar una herramienta si ya tienes los datos. Ejecútala.
- No inventes horarios. Usa solo lo que te diga "verificar_disponibilidad".

## Catálogo de Servicios y Equipo
Usa EXCLUSIVAMENTE los nombres e IDs que se te proporcionan en el [CONTEXTO DINÁMICO]. No inventes servicios ni nombres.

## Enlaces Útiles
- Catálogo: https://chamosbarber.com/servicios
- Equipo: https://chamosbarber.com/equipo
- Agendador Online: https://chamosbarber.com/reservar

IMPORTANTE: Estás en San Fernando, Chile. 
`;

/**
 * Bot del barbero - Versión UNIFICADA Gemini 3 Flash Preview
 */
export async function generateChatResponse(
  message: string,
  conversationId?: string | number,
  metadata: {
    phone?: string,
    isAudio?: boolean
  } = {}
) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('API_KEY_MISSING');

    // 1. Cargar historial de Redis
    let contents: any[] = [];
    if (conversationId) {
      const rawHistory = await ChatMemory.getHistory(conversationId).catch(() => []);
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
    });

    // 3. Configuración Unificada (Gemini 3 Flash Preview)
    const modelId = 'gemini-3-flash-preview';
    console.log(`[GUSTAVO-IA] [ID:${conversationId}] Procesando con ${modelId}`);

    const isNewConversation = contents.length === 0;
    const conversationState = isNewConversation
      ? "ESTADO: Chat nuevo. DEBES saludarte y presentarte."
      : "ESTADO: Chat en curso. YA TE PRESENTASTE, NO repitas saludos ni presentación.";

    // Metadata de sesión para control de costos (Ventana 24h)
    const sessionMetadata = `[METADATA DE SESIÓN]
Hora actual: ${now}
Teléfono del cliente: ${metadata.phone || 'Desconocido'}
Ventana Gratuita: Activa (El cliente inició el chat).
Regla de Oro: SIEMPRE que veas el "Teléfono del cliente" arriba y no lo hayas hecho en este turno, llama a "consultar_mis_citas" para saber su estado actual. 
Regla de Ahorro: Solo confirmar si faltan <2h para la cita o <1h para que venza el chat.
`;

    const isAudioNote = metadata.isAudio || message.includes('[SISTEMA: TRANSCRIPCIÓN_AUDIO]');
    const systemSignal = isAudioNote ? "\n[SISTEMA: AUDIO_RECIBIDO]\n" : "";
    const promptWithContext = `[INSTRUCCIONES DE SISTEMA - GUSTAVO]\n${BARBER_CONTEXT}\n\n${catalogContext}\n\n${sessionMetadata}${systemSignal}\n\n[ESTADO DEL CHAT]\n${conversationState}\n\n[MENSAJE DEL CLIENTE]\n${message}`;

    contents.push({
      role: 'user',
      parts: [{ text: promptWithContext }]
    });

    // 4. Herramientas
    const tools = [{
      function_declarations: [
        {
          name: "verificar_disponibilidad",
          description: "Consulta los horarios disponibles para un barbero en una fecha específica.",
          parameters: {
            type: "OBJECT",
            properties: {
              barbero_id: { type: "string", description: "ID del barbero." },
              fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD." }
            },
            required: ["barbero_id", "fecha"]
          }
        },
        {
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
        },
        {
          name: "consultar_mis_citas",
          description: "Busca las citas agendadas para un número de teléfono.",
          parameters: {
            type: "OBJECT",
            properties: {
              telefono: { type: "string", description: "Número de teléfono/WhatsApp del cliente." }
            },
            required: ["telefono"]
          }
        },
        {
          name: "confirmar_cita",
          description: "Marca una cita como confirmada en el sistema.",
          parameters: {
            type: "OBJECT",
            properties: {
              cita_id: { type: "string", description: "El ID único de la cita a confirmar." }
            },
            required: ["cita_id"]
          }
        }
      ]
    }];

    // 5. Bucle de llamadas a la API (v1beta)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    let iterations = 0;
    let finalResponseText = '';

    while (iterations < 5) {
      iterations++;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, tools })
      });

      const responseJson = await response.json();
      if (!response.ok) {
        console.error('[GUSTAVO-IA] API Error Payload:', JSON.stringify(responseJson, null, 2));
        throw new Error(`Gemini API Error ${response.status}: ${JSON.stringify(responseJson.error || responseJson)}`);
      }

      const messageResponse = responseJson.candidates?.[0]?.content;
      if (!messageResponse) throw new Error('No se recibió respuesta del modelo');

      contents.push(messageResponse);

      const toolCall = messageResponse.parts.find((p: any) => p.functionCall);
      if (toolCall) {
        const { name, args } = toolCall.functionCall;
        console.log(`[GUSTAVO-IA] 🛠️ Ejecutando herramienta (${modelId}): ${name}`, args);

        let result;
        if (name === 'verificar_disponibilidad') {
          result = await executeCheckAvailability(args);
        } else if (name === 'crear_cita') {
          result = await executeCreateAppointment(args);
        } else if (name === 'consultar_mis_citas') {
          result = await executeListClientAppointments(args);
        } else if (name === 'confirmar_cita') {
          result = await executeUpdateAppointmentStatus(args);
        }

        if (result) {
          contents.push({
            role: 'function',
            parts: [{ functionResponse: { name, response: result } }]
          });
          continue;
        }
      }

      finalResponseText = messageResponse.parts.map((p: any) => p.text || '').join('');
      break;
    }

    // 6. Guardar en Redis
    if (conversationId && finalResponseText) {
      ChatMemory.addMessage(conversationId, 'user', message).catch(() => { });
      ChatMemory.addMessage(conversationId, 'model', finalResponseText).catch(() => { });
    }

    return finalResponseText;

  } catch (error: any) {
    console.error(`[GUSTAVO-IA] ERROR CRÍTICO:`, error);
    return "Hola, te habla Gustavo. 🙏 ||| Amigo, tuve un pequeño problema técnico con mi sistema. Pásate por aquí para agendar directo mientras lo reviso: https://chamosbarber.com/reservar";
  }
}

async function executeCheckAvailability(args: any) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: "DB connection failed" };

  try {
    console.log(`[GUSTAVO-IA] 🔍 Buscando disponibilidad para Barbero ${args.barbero_id} en ${args.fecha}`);

    const { data, error } = await supabase.rpc('get_horarios_disponibles', {
      barbero_id_param: args.barbero_id,
      fecha_param: args.fecha,
      duracion_minutos_param: 30
    });

    if (error) {
      console.error('[GUSTAVO-IA] RPC Error:', error);
      return { success: false, error: error.message };
    }

    const disponibles = (data as any[])?.filter(h => h.disponible).map(h => h.hora) || [];

    return {
      success: true,
      fecha: args.fecha,
      horarios_disponibles: disponibles,
      message: disponibles.length > 0
        ? `Horarios disponibles para el ${args.fecha}: ${disponibles.join(', ')}`
        : `Lo siento, no hay horarios disponibles para el ${args.fecha}.`
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function executeCreateAppointment(args: any) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[GUSTAVO-IA] ❌ Fallo conexión Supabase');
    return { success: false, error: "DB connection failed" };
  }

  try {
    console.log('[GUSTAVO-IA] 💾 Intentando insertar cita:', args);

    const { data: nuevaCita, error: insertError } = await supabase
      .from('citas')
      .insert([{
        barbero_id: args.barbero_id,
        servicio_id: args.servicio_id,
        fecha: args.fecha,
        hora: args.hora,
        cliente_nombre: args.cliente_nombre,
        cliente_telefono: normalizePhone(String(args.cliente_telefono)),
        notas: `[RESERVA WHATSAPP/IA] ${args.notas || ''}`,
        estado: 'pendiente'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[GUSTAVO-IA] ❌ Error Insert:', insertError);
      if (insertError.code === '23505') return { success: false, error: "Horario ya ocupado" };
      return { success: false, error: insertError.message };
    }

    console.log('[GUSTAVO-IA] ✅ Cita creada exitosamente ID:', nuevaCita.id);

    try {
      const { sendNotificationToBarber } = await import('./onesignal');
      await sendNotificationToBarber(args.barbero_id, 'Nueva Reserva ✂️', `Hola, tienes una nueva reserva de ${args.cliente_nombre} para el ${args.fecha} a las ${args.hora}.`);
    } catch (e) { }

    return { success: true, message: "Cita creada exitosamente", id: nuevaCita.id };
  } catch (e: any) {
    console.error('[GUSTAVO-IA] ❌ Error inesperado en executeCreateAppointment:', e);
    return { success: false, error: e.message || "Unknown error" };
  }
}

async function executeListClientAppointments(args: any) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: "DB connection failed" };

  try {
    const telefono = normalizePhone(String(args.telefono));

    // Generar variaciones para búsqueda robusta (cubrir +569, 569 y 9...)
    const phoneNormalized = telefono; // +569XXXXXXXX
    const phoneWith56 = phoneNormalized.replace(/^\+/, ''); // 569XXXXXXXX
    const phoneRaw = phoneNormalized.replace(/^\+56/, '');   // 9XXXXXXXX

    console.log(`[GUSTAVO-IA] 🔍 Buscando citas para: ${phoneNormalized}, ${phoneWith56}, ${phoneRaw}`);

    // Buscamos citas futuras o de hoy
    const today = new Date().toISOString().split('T')[0];

    const { data: citas, error } = await supabase
      .from('citas')
      .select(`
        id,
        fecha,
        hora,
        estado,
        servicios (nombre),
        barberos (nombre, apellido)
      `)
      .or(`cliente_telefono.eq."${phoneNormalized}",cliente_telefono.eq."${phoneWith56}",cliente_telefono.eq."${phoneRaw}"`)
      .gte('fecha', today)
      .order('fecha', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      citas: citas.map((c: any) => ({
        id: c.id,
        fecha: c.fecha,
        hora: c.hora.substring(0, 5),
        barbero: c.barberos ? `${c.barberos.nombre} ${c.barberos.apellido}` : 'Sin asignar',
        servicio: c.servicios ? c.servicios.nombre : 'Sin especificar',
        estado: c.estado
      }))
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function executeUpdateAppointmentStatus(args: any) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: "DB connection failed" };

  try {
    console.log(`[GUSTAVO-IA] ✅ Confirmando cita ID: ${args.cita_id}`);

    const { error } = await supabase
      .from('citas')
      .update({ estado: 'confirmada' })
      .eq('id', args.cita_id);

    if (error) throw error;

    return { success: true, message: "Cita confirmada exitosamente" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function splitLongMessage(text: string): Promise<string[]> {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return [text];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user', parts: [{
            text: `Divide este texto en partes naturales separadas por |||. 
REGLA CRÍTICA: Responde SOLO con el texto dividido. 
PROHIBIDO decir "Aquí tienes el texto", "Dividido en partes", o cualquier otra explicación. 
Si el texto es corto, no lo dividas y devuélvelo tal cual.
Texto: "${text}"`
          }]
        }]
      })
    });
    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) return [text];
    // Eliminar posibles meta-comentarios que la IA a veces agrega por error al principio o final
    const cleanText = resultText.replace(/Aquí tienes.*/gi, '').replace(/.*dividido en.*/gi, '').trim();
    return (cleanText || resultText).split('|||').map((p: string) => p.trim()).filter(Boolean);
  } catch (e) {
    return [text];
  }
}

