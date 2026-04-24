import { createClient } from '@supabase/supabase-js';
import { ChatMemory } from './redis';
import { normalizePhone } from '@/lib/phone-utils';

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
- **Respuestas Limpias (CRÍTICO)**: JAMÁS incluyas código JSON, nombres de funciones, IDs técnicos (UUIDs), ni parámetros de herramientas en tus respuestas al cliente. Si necesitas usar una herramienta, hazlo silenciosamente a través del mecanismo de tool_call. El cliente SOLO debe ver lenguaje natural y humano. NUNCA escribas cosas como {"name": "crear_cita"...} en tu respuesta.
- Protocolo: Si no sabes el nombre del usuario, lo primero es preguntárselo.
- Mantenimiento: No hables de procesos internos.
- Brevedad: Tus respuestas deben ser cortas y directas. Máximo 2 párrafos pequeños.
- Estilo Humano: NO uses listas numeradas ni bullets. Escribe párrafos naturales.
- Formato: Texto plano. Sin negritas (**), sin cursivas.
- Ubicación: Chamos Barber solo existe en San Fernando, Chile.
- **Lenguaje (CRÍTICO)**: Aunque eres venezolano, llevas mucho tiempo en Chile y hablas de forma que todos te entiendan bien. **PROHIBIDO** usar la palabra "chamo" o modismos venezolanos muy marcados. Usa un lenguaje chileno neutro y amable (como "amigo", "compa" o "estimado").
- **Teléfono (NUEVO)**: Si el cliente entrega un número de teléfono sin código de área (ej: 9XXXXXXXX), asume siempre que es de Chile (+56).
- **Horarios (NUEVO)**: Si el cliente dice una hora sin am/pm (ej: "a las 8"), usa el sentido común para una barbería. "A las 8" suele ser 8:00 o 20:00. Si tienes duda o es un horario de madrugada, pregunta para confirmar. **REGLA DE FORMATO**: Responde SIEMPRE usando el mismo formato horario que el cliente (si el cliente usa "las 8", dile "las 8:00 pm" o "las 20:30" según lo que él esté usando). Adapta tu estilo al del cliente.
- Emojis Prohibidos: NUNCA uses el emoji 😊. Usa SOLO 💈, ✂️, 🧔.

## Consciencia Temporal (CRÍTICO)
Cada mensaje del historial puede tener una marca de tiempo [fecha] al inicio.
DEBES prestar atención a estas fechas:
- Si un mensaje es de hace varios días o semanas, trátalo como una conversación PASADA. No uses esa información como si fuera de hoy.
- NO asumas que la información de días anteriores sigue vigente hoy (ej: citas, horarios solicitados, disponibilidad).
- Si el cliente pregunta algo HOY, responde basándote en la fecha y hora ACTUAL (ver [METADATA DE SESIÓN]), no en datos de conversaciones antiguas.
- Si ves que la última conversación fue hace días, saluda como un reencuentro natural: "Hola de nuevo, amigo! ¿Cómo te fue la última vez?"

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

## PROTOCOLO TÉCNICO DE HERRAMIENTAS (OBLIGATORIO)
- **Formato Estricto**: Al activar una herramienta, usa ÚNICAMENTE el formato técnico del sistema.
- **MAL (EJEMPLO)**: 'verificar_disponibilidad(bartero_id=..., fecha=...)' o 'func1=crear_cita(...)'. Esto ROMPE el sistema.
- **BIEN (FORMA CORRECTA)**: Debes generar una llamada de herramienta pura (tool_call) en formato JSON, sin texto rodeándola.
- **PROHIBIDO**: No incluyas emojis, modismos ni saludos DENTRO o ALREDEDOR de la llamada técnica.
- **Serialidad**: Debes llamar a las herramientas de UNA EN UNA. Espera el resultado de la primera antes de llamar a la siguiente.
- **Precisión**: Usa exactamente el nombre de campo 'barbero_id'.

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
/**
 * Bot del barbero - Versión UNIFICADA con Soporte para Proxy de Agentes (Llama/Kimi)
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
    const proxyUrl = process.env.LOCAL_AI_PROXY_URL || process.env.LOCAL_API_AGENTES_PROXY_URL;
    const modelId = process.env.AGENT_MODEL || 'llama-3.3-70b-versatile';

    console.log(`[GUSTAVO-IA] 🚀 INICIANDO GENERACIÓN: "${message.substring(0, 50)}..." | Conv: ${conversationId} | Metadata:`, JSON.stringify(metadata));

    if (!proxyUrl) {
      console.warn('[GUSTAVO-IA] LOCAL_AI_PROXY_URL missing. Verify Coolify ENV variables.');
      return "Hola amiguito, te habla Gustavo. 💈 ||| Mis sistemas están en mantenimiento un momentito, pero por favor resérvame directamente aquí: https://chamosbarber.com/reservar";
    }

    // 1. Cargar historial y convertir a formato OpenAI
    let messages: any[] = [];
    if (conversationId) {
      const rawHistory = await ChatMemory.getHistory(conversationId).catch(() => []);
      if (Array.isArray(rawHistory)) {
        messages = rawHistory.filter(item => item && item.role).map(h => {
          const textContent = h.parts?.[0]?.text || h.content || '';
          // Inyectar marca temporal si existe para que la IA sepa cuándo ocurrió cada mensaje
          let prefix = '';
          if (h.timestamp) {
            try {
              prefix = `[${new Date(h.timestamp).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}] `;
            } catch { prefix = ''; }
          }
          return {
            role: h.role === 'model' ? 'assistant' : 'user',
            content: prefix + textContent
          };
        });
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
      minute: '2-digit',
    });

    const isNewConversation = messages.length === 0;
    const conversationState = isNewConversation
      ? "ESTADO: Chat nuevo. DEBES saludarte y presentarte."
      : "ESTADO: Chat en curso. YA TE PRESENTASTE, NO repitas saludos ni presentación.";

    const sessionMetadata = `[METADATA DE SESIÓN]
Hora actual: ${now}
Teléfono del cliente: ${metadata.phone || 'Desconocido'}
Ventana Gratuita: Activa (El cliente inició el chat).
Regla de Oro: SIEMPRE que veas el "Teléfono del cliente" arriba y no lo hayas hecho en ese turno, llama a "consultar_mis_citas" para saber su estado actual. 
Regla de Ahorro: Solo confirmar si faltan <2h para la cita o <1h para que venza el chat.
Contexto Temporal: Para barbería, "las 8" en la mañana suele ser 08:00 y "las 8" en la tarde es 20:00.

REGLA DE CITAS PASADAS (CRÍTICO): Cuando consultes las citas del cliente, COMPARA la fecha y hora de cada cita con la "Hora actual" de arriba. Si la fecha de la cita ya pasó, o si es HOY pero la hora de la cita ya pasó, esa cita YA OCURRIÓ o fue PERDIDA. NUNCA le digas al cliente "tienes una cita a las 19:00" si ya son las 23:00. En ese caso dile que esa cita ya pasó y pregúntale si quiere reagendar.
`;

    const isAudioNote = metadata.isAudio || message.includes('[SISTEMA: TRANSCRIPCIÓN_AUDIO]');
    const systemSignal = isAudioNote ? "\n[SISTEMA: AUDIO_RECIBIDO]\n" : "";

    const systemPrompt = `[INSTRUCCIONES DE SISTEMA - GUSTAVO]\n${BARBER_CONTEXT}\n\n${catalogContext}\n\n${sessionMetadata}${systemSignal}\n\n[ESTADO DEL CHAT]\n${conversationState}`;

    // Insertar system prompt al inicio
    messages.unshift({
      role: 'system',
      content: systemPrompt
    });

    // Agregar mensaje actual
    messages.push({
      role: 'user',
      content: message
    });

    // 4. Definición de Herramientas (Formato OpenAI)
    const tools = [
      {
        type: "function",
        function: {
          name: "verificar_disponibilidad",
          description: "Consulta los horarios disponibles para un barbero en una fecha específica.",
          parameters: {
            type: "object",
            properties: {
              barbero_id: { type: "string", description: "ID único del barbero (ej: uuid). Asegúrate de usar exactament el nombre de campo 'barbero_id'." },
              fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD." }
            },
            required: ["barbero_id", "fecha"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "crear_cita",
          description: "Crea una nueva reserva de cita en la base de datos de la barbería.",
          parameters: {
            type: "object",
            properties: {
              barbero_id: { type: "string", description: "El ID (UUID) del barbero seleccionado. OBTÉNLOS del CATÁLOGO DINÁMICO. Campo obligatorio." },
              servicio_id: { type: "string", description: "El ID (UUID) del servicio seleccionado. OBTÉNLOS del CATÁLOGO DINÁMICO. Campo obligatorio." },
              fecha: { type: "string", description: "Fecha de la cita YYYY-MM-DD. Campo obligatorio." },
              hora: { type: "string", description: "Hora de la cita HH:mm. Campo obligatorio." },
              cliente_nombre: { type: "string", description: "Nombre completo del cliente." },
              cliente_telefono: { type: "string", description: "Número de WhatsApp del cliente (+56XXXXXXXXX)." },
              notas: { type: "string", description: "Notas adicionales o requerimientos del cliente." }
            },
            required: ["barbero_id", "servicio_id", "fecha", "hora", "cliente_nombre", "cliente_telefono"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "consultar_mis_citas",
          description: "Busca las citas agendadas para un número de teléfono.",
          parameters: {
            type: "object",
            properties: {
              telefono: { type: "string", description: "Número de teléfono/WhatsApp del cliente." }
            },
            required: ["telefono"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "confirmar_cita",
          description: "Marca una cita como confirmada en el sistema.",
          parameters: {
            type: "object",
            properties: {
              cita_id: { type: "string", description: "El ID único de la cita a confirmar." }
            },
            required: ["cita_id"]
          }
        }
      }
    ];

    // 5. Bucle de llamadas (Proxy logic)
    let iterations = 0;
    let finalResponseText = '';

    while (iterations < 5) {
      iterations++;
      console.log(`[GUSTAVO-IA] Llamando al proxy (it:${iterations})...`);

      // Nota: En entornos con certificados auto-firmados (como Coolify), 
      // fetch puede fallar con DEPTH_ZERO_SELF_SIGNED_CERT.
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId,
          messages,
          tools,
          tool_choice: 'auto'
        }),
        // @ts-ignore - Bypass para certificados auto-firmados en Node.js
        agent: process.env.NODE_ENV === 'production' ? undefined : undefined
      });

      if (!response.ok) {
        const errText = await response.text();

        try {
          const errJSON = JSON.parse(errText);
          if (errJSON.failed_generation) {
            console.log(`[GUSTAVO-IA] 🔄 Iniciando recuperación por 'failed_generation'...`);
            const parsedResults = heuristicToolParser(errJSON.failed_generation);

            if (parsedResults.length > 0) {
              console.log(`[GUSTAVO-IA] 🧠 Heurística exitosa: ${parsedResults.length} herramientas detectadas`);

              for (const parsed of parsedResults) {
                console.log(`[GUSTAVO-IA] 🛠️  EJECUTANDO FALLBACK: ${parsed.name}`, JSON.stringify(parsed.args));

                // Generar ID único para este tool_call simulado
                const fakeToolCallId = `call_fb_${Date.now()}_${Math.random().toString(36).substring(7)}`;

                const assistantMessage = {
                  role: 'assistant',
                  tool_calls: [{
                    id: fakeToolCallId,
                    type: 'function',
                    function: { name: parsed.name, arguments: JSON.stringify(parsed.args) }
                  }]
                };
                messages.push(assistantMessage);

                let result;
                if (parsed.name === 'verificar_disponibilidad') result = await executeCheckAvailability(parsed.args);
                else if (parsed.name === 'crear_cita') result = await executeCreateAppointment(parsed.args);
                else if (parsed.name === 'consultar_mis_citas') result = await executeListClientAppointments(parsed.args);
                else if (parsed.name === 'confirmar_cita') result = await executeUpdateAppointmentStatus(parsed.args);

                console.log(`[GUSTAVO-IA] ✅ RESULTADO FALLBACK ${parsed.name}:`, JSON.stringify(result));

                messages.push({
                  role: 'tool',
                  tool_call_id: fakeToolCallId,
                  name: parsed.name,
                  content: JSON.stringify(result)
                });
              }

              continue; // Reintentar con el historial de herramientas completo
            }
          }
        } catch (pe) {
          console.error('[GUSTAVO-IA] ❌ Falló el parseo heurístico del error:', pe);
        }

        throw new Error(`Proxy Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) throw new Error('No se recibió respuesta válida del proxy');

      messages.push(assistantMessage);

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          const { name, arguments: argsString } = toolCall.function;
          const args = JSON.parse(argsString);
          console.log(`[GUSTAVO-IA] 🛠️  EJECUTANDO: ${name}`, JSON.stringify(args));

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

          console.log(`[GUSTAVO-IA] ✅ RESULTADO ${name}:`, JSON.stringify(result));

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: name,
            content: JSON.stringify(result)
          });
        }
        continue;
      }

      finalResponseText = assistantMessage.content || '';
      // Sanitizar: eliminar JSON de tool_calls que el modelo incluyó como texto
      finalResponseText = sanitizeToolCallLeaks(finalResponseText);
      break;
    }

    // 6. Guardar en Redis (Mantener formato previo para compatibilidad)
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
    // Manejo robusto de parámetros (evitar alucinaciones como barro_id o bartero_id)
    const barberoIdStr = args.barbero_id || args.barro_id || args.bartero_id || args.barbero;

    if (!barberoIdStr) {
      console.error('[GUSTAVO-IA] ❌ Fallo: No se recibió barbero_id');
      return { success: false, error: "Missing barbero_id" };
    }

    // 4. Obtener duracción aproximada del servicio (o default)
    const { data: svc } = await supabase.from('servicios').select('duracion').eq('id', args.servicio_id).single();
    const duracion = svc?.duracion || 30;

    // FECHA OBLIGATORIA: Si no viene, usamos hoy
    const fechaFinal = args.fecha || new Date().toISOString().split('T')[0];

    console.log(`[GUSTAVO-IA] 🔍 Buscando disponibilidad para Barbero ${barberoIdStr} en ${fechaFinal}`);

    const { data: slots, error: rpcError } = await supabase.rpc('get_horarios_disponibles', {
      barbero_id_param: barberoIdStr,
      fecha_param: fechaFinal,
      duracion_minutos_param: duracion
    });

    if (rpcError) { // Changed 'error' to 'rpcError' to match the new variable name
      console.error('[GUSTAVO-IA] RPC Error:', rpcError);
      return { success: false, error: rpcError.message };
    }

    const disponibles = (slots as any[])?.filter(h => h.disponible).map(h => h.hora) || [];

    return {
      success: true,
      fecha: fechaFinal,
      horarios_disponibles: disponibles,
      message: disponibles.length > 0
        ? `Horarios disponibles para el ${fechaFinal}: ${disponibles.join(', ')}`
        : `Lo siento, no hay horarios disponibles para el ${fechaFinal}.`
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
    // Manejo robusto de parámetros (evitar alucinaciones como barro_id o bartero_id)
    const barberoIdStr = args.barbero_id || args.barro_id || args.bartero_id || args.barbero;

    if (!barberoIdStr) {
      console.error('[GUSTAVO-IA] ❌ Fallo: No se recibió barbero_id para crear cita');
      return { success: false, error: "Missing barbero_id" };
    }

    const payload = {
      barbero_id: barberoIdStr,
      servicio_id: args.servicio_id,
      fecha: args.fecha,
      hora: args.hora,
      cliente_nombre: args.cliente_nombre,
      cliente_telefono: normalizePhone(String(args.cliente_telefono)),
      notas: `[RESERVA WHATSAPP/IA] ${args.notas || ''}`,
      estado: 'pendiente'
    };

    console.log('[GUSTAVO-IA] 💾 Intentando INSERT en Supabase:', JSON.stringify(payload));

    const { data: nuevaCita, error: insertError } = await supabase
      .from('citas')
      .insert([payload])
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
      const barberoIdStr = args.barbero_id || args.barro_id || args.bartero_id || args.barrera_id || args.barbero;
      await sendNotificationToBarber(String(barberoIdStr), 'Nueva Reserva ✂️', `Hola, tienes una nueva reserva de ${args.cliente_nombre} para el ${args.fecha} a las ${args.hora}.`);
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
    const proxyUrl = process.env.LOCAL_AI_PROXY_URL;
    const modelId = process.env.AGENT_MODEL || 'llama-3.3-70b-versatile';

    if (!proxyUrl) return [text];

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: 'user', content: `Divide este texto en partes naturales separadas por |||. 
REGLA CRÍTICA: Responde SOLO con el texto dividido. 
PROHIBIDO decir "Aquí tienes el texto", "Dividido en partes", o cualquier otra explicación. 
Si el texto es corto, no lo dividas y devuélvelo tal cual.
Texto: "${text}"`
        }]
      })
    });

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content;

    if (!resultText) return [text];

    // Eliminar posibles meta-comentarios que la IA a veces agrega por error al principio o final
    const cleanText = resultText.replace(/Aquí tienes.*/gi, '').replace(/.*dividido en.*/gi, '').trim();
    return (cleanText || resultText).split('|||').map((p: string) => p.trim()).filter(Boolean);
  } catch (e) {
    return [text];
  }
}

/**
 * Sanitiza la respuesta del modelo eliminando JSON de tool_calls que se haya
 * filtrado como texto plano. Esto ocurre cuando el LLM no genera un tool_call
 * estructurado sino que escribe el JSON directamente en su respuesta.
 */
function sanitizeToolCallLeaks(text: string): string {
  if (!text) return text;

  // Patrón 1: Detectar bloques JSON completos de tool calls
  // Ej: {"name": "crear_cita", "arguments": "{...}"}
  const toolCallJsonRegex = /\{[\s\S]*?"name"\s*:\s*"(?:crear_cita|verificar_disponibilidad|consultar_mis_citas|confirmar_cita)"[\s\S]*?\}(?:\s*\))?/g;
  let cleaned = text.replace(toolCallJsonRegex, '').trim();

  // Patrón 2: Detectar llamadas en formato func(...) 
  // Ej: crear_cita(barbero_id="...", fecha="...")
  const funcCallRegex = /(?:crear_cita|verificar_disponibilidad|consultar_mis_citas|confirmar_cita)\s*\([^)]*\)/g;
  cleaned = cleaned.replace(funcCallRegex, '').trim();

  // Patrón 3: Limpiar UUIDs sueltos que no deberían estar en la respuesta
  // Ej: "28fdc033-f8a0-4cf7-8ec7-4952fc98d27e"
  const uuidRegex = /["']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']?/gi;
  // Solo limpiar UUIDs si están rodeados de contexto técnico (no limpiar IDs en texto normal)
  const technicalUuidRegex = /(?:barbero_id|servicio_id|cita_id|id)\s*[:=]\s*["']?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']?/gi;
  cleaned = cleaned.replace(technicalUuidRegex, '').trim();

  // Limpiar puntuación redundante dejada por las eliminaciones
  cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim();

  // Si después de limpiar queda vacío o muy corto, dar respuesta genérica
  if (!cleaned || cleaned.length < 10) {
    return 'Listo amigo, ya te dejé todo agendado en el sistema. Nos vemos en la silla! 💈';
  }

  return cleaned;
}

/**
 * Intento de parseo avanzado de strings generados por modelos que no siguen bien 
 * el formato JSON de herramientas de OpenAI/Proxy.
 * Soporta:
 * 1. Formato func(arg=val)
 * 2. Formato NDJSON (múltiples objetos JSON por línea)
 * 3. Formato JSON-string (el que reporta el proxy en failed_generation)
 */
function heuristicToolParser(text: string): { name: string, args: any }[] {
  const results: { name: string, args: any }[] = [];
  if (!text) return results;

  // Caso 1: Intentar separar por líneas y ver si son objetos JSON (frecuente en fallos del proxy)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('{') || l.includes('{"name"'));

  for (const line of lines) {
    try {
      // Limpiar posibles prefijos como 'func1=' o similares si están pegados
      const cleanLine = line.replace(/^[a-zA-Z0-9]+=/, '').trim();
      const obj = JSON.parse(cleanLine);

      // Caso A: Formato OpenAI Standard (name + arguments string)
      if (obj.name && obj.arguments) {
        results.push({
          name: obj.name,
          args: typeof obj.arguments === 'string' ? JSON.parse(obj.arguments) : obj.arguments
        });
      }
      // Caso B: Formato Llama/Kimi alternativo (name + parameters object)
      else if (obj.name && obj.parameters) {
        results.push({
          name: obj.name,
          args: obj.parameters
        });
      }
      // Caso C: Variación simplificada (name + args)
      else if (obj.name && obj.args) {
        results.push({ name: obj.name, args: obj.args });
      }
    } catch (e) { }
  }

  // Si no se detectó nada como JSON, intentar el regex de funciones tradicional (ej: func(a=b))
  if (results.length === 0) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      // Limpiar prefijos como 'func1=' también aquí
      const cleanLine = line.replace(/^[a-zA-Z0-9]+=/, '').trim();
      const nameMatch = cleanLine.match(/^\s*(\w+)\(/);
      if (nameMatch) {
        const name = nameMatch[1];
        const args: any = {};
        const openParen = cleanLine.indexOf('(');
        const closeParen = cleanLine.lastIndexOf(')');

        if (openParen !== -1 && closeParen !== -1) {
          const argsString = cleanLine.substring(openParen + 1, closeParen);

          // Regex robusto para capturar pares key=val
          // Captura el valor hasta la próxima coma o cierre de paréntesis
          const pairRegex = /(\w+)\s*=\s*(.+?)(?=,\s*\w+\s*=|(?:\s*\)$))/g;
          let match;
          while ((match = pairRegex.exec(argsString + ',')) !== null) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^['"]|['"]$/g, '');
            if (key && val) args[key] = val;
          }

          // Fallback si el regex anterior falla (caso de un solo argumento o formato simple)
          if (Object.keys(args).length === 0 && argsString.includes('=')) {
            const pairs = argsString.split(/,\s*(?=\w+\s*=)/).map(p => p.trim());
            for (const pair of pairs) {
              const [k, ...v] = pair.split('=');
              if (k && v.length) args[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
            }
          }

          results.push({ name, args });
        }
      }
    }
  }

  return results;
}

