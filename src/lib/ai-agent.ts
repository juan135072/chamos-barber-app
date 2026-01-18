import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { ChatMemory } from './redis';

// Cliente administrativo para bypass de RLS en el servidor
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * CONTEXTO DE GUSTAVO - DUEÑO DE CHAMOS BARBER
 */
export const BARBER_CONTEXT = `
# Rol e Identidad
Eres Gustavo, el dueño y fundador de Chamos Barber en San Fernando, Chile. 
Eres venezolano, llevas más de 10 años en Chile y construiste este negocio con mucho esfuerzo.
Eres carismático, educado, apasionado por la excelencia y tratas a los clientes como si estuvieran en su segunda casa.

# Personalidad y Tono
- Hablas de forma casual pero profesional (WhatsApp style).
- Usa expresiones como: "chévere", "excelente", "bacán", "al tiro".
- JAMÁS uses la palabra "huecos" (connotación negativa en Chile). Di "horarios", "horas" o "disponibilidad".
- No digas que eres una IA. Eres Gustavo.
- Sé breve (máximo 100 palabras por mensaje).

# Reglas de Reserva
1. Siempre pide el nombre y el WhatsApp del cliente si no los tienes.
2. Identifica el servicio y el barbero.
3. Si el cliente no sabe quién atiende, usa 'get_barbers' y muéstralos de forma sencilla (ej: "• Carlos (Especialista en Degradados)").
4. Si el cliente no sabe qué servicios tenemos o pide precios, usa 'get_services' y muéstralos en una lista clara (ej: "• Corte Senior - $12.000").
5. Usa las herramientas (tools) para consultar disponibilidad real y realizar la reserva.
6. Si el cliente prefiere la web: https://chamosbarber.com/reservar

# Formato de Salida
Para enviar múltiples burbujas en WhatsApp, usa el separador ||| entre mensajes.
`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_barbers",
        description: "Obtiene la lista de barberos activos para conocer sus nombres e IDs.",
        parameters: { type: "OBJECT", properties: {} }
      },
      {
        name: "get_services",
        description: "Obtiene la lista de servicios disponibles (precios, duración, IDs).",
        parameters: { type: "OBJECT", properties: {} }
      },
      {
        name: "search_slots_day",
        description: "Busca horarios de disponibilidad para un barbero específico en una fecha.",
        parameters: {
          type: "OBJECT",
          properties: {
            barbero_id: { type: "STRING", description: "ID único del barbero" },
            date: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
            duration: { type: "NUMBER", description: "Duración en minutos (default 30)" }
          },
          required: ["barbero_id", "date"]
        }
      },
      {
        name: "book_slot",
        description: "Crea una reserva real en el sistema.",
        parameters: {
          type: "OBJECT",
          properties: {
            barbero_id: { type: "STRING" },
            servicio_id: { type: "STRING" },
            date: { type: "STRING", description: "YYYY-MM-DD" },
            time: { type: "STRING", description: "HH:MM" },
            name: { type: "STRING" },
            phone: { type: "STRING" },
            email: { type: "STRING" },
            notes: { type: "STRING", description: "Formato: [SERVICIOS SOLICITADOS: Serv1, Serv2]" }
          },
          required: ["barbero_id", "servicio_id", "date", "time", "name", "phone"]
        }
      }
    ]
  }
];

// Mapeo de funciones locales usando el cliente ADMIN
const functions: Record<string, Function> = {
  get_barbers: async () => {
    const { data } = await supabaseAdmin.from('barberos').select('id, nombre, apellido, especialidades').eq('activo', true);
    return data?.map(b => ({ id: b.id, nombre: `${b.nombre} ${b.apellido}`, especialidad: b.especialidades })) || [];
  },
  get_services: async () => {
    const { data } = await supabaseAdmin.from('servicios').select('id, nombre, precio, duracion_minutos').eq('activo', true);
    return data?.map(s => ({ id: s.id, nombre: s.nombre, precio: s.precio, duracion: s.duracion_minutos })) || [];
  },
  search_slots_day: async ({ barbero_id, date, duration }: any) => {
    const { data, error } = await supabaseAdmin.rpc('get_horarios_disponibles', {
      barbero_id_param: barbero_id,
      fecha_param: date,
      duracion_minutos_param: duration || 30
    });
    if (error) return { error: error.message };
    return (data as any[])?.filter(s => s.disponible).map(s => s.hora) || [];
  },
  book_slot: async (args: any) => {
    try {
      const { data, error } = await supabaseAdmin.from('citas').insert([{
        barbero_id: args.barbero_id,
        servicio_id: args.servicio_id,
        fecha: args.date,
        hora: args.time,
        cliente_nombre: args.name,
        cliente_telefono: args.phone,
        cliente_email: args.email || null,
        notas: args.notes || null,
        estado: 'pendiente'
      }]).select().single();

      if (error) throw error;
      return { success: true, cita_id: data.id, message: "Reserva creada exitosamente" };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};

export async function generateChatResponse(message: string) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is missing');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: tools as any
    });

    // Iniciamos chat con el contexto de Gustavo
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: BARBER_CONTEXT }] },
        { role: 'model', parts: [{ text: "Entendido, soy Gustavo, dueño de Chamos Barber. ¿En qué puedo ayudarte hoy?" }] }
      ]
    });

    const result = await chat.sendMessage(message);
    let response = result.response;
    let toolCalls = response.functionCalls();

    // Loop de ejecución de funciones (soporta múltiples llamadas en una respuesta)
    while (toolCalls && toolCalls.length > 0) {
      const toolResponses: Part[] = [];

      for (const call of toolCalls) {
        console.log(`[GUSTAVO-IA] Ejecutando: ${call.name}`, call.args);
        const functionHandler = functions[call.name];

        if (functionHandler) {
          const functionResult = await functionHandler(call.args);
          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { content: functionResult }
            }
          });
        }
      }

      // Enviar resultados de vuelta al modelo
      const result2 = await chat.sendMessage(toolResponses);
      response = result2.response;
      toolCalls = response.functionCalls();
    }

    return response.text();

  } catch (error) {
    console.error('Error generating AI response:', error);
    return "Hola, te habla Gustavo 🙏 ||| Disculpa, estoy con unos detalles técnicos en el sistema. ||| Pero no te preocupes, puedes agendar directo aquí y aseguras tu lugar al tiro: https://chamosbarber.com/reservar";
  }
}
