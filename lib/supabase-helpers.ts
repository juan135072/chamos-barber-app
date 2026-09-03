1|import { supabase } from './initSupabase'
2|import type { Database } from './database.types'
3|
4|const devLog = (...args: unknown[]) => {
5|  if (process.env.NODE_ENV !== 'production') console.log(...args)
6|}
7|
8|// Alias sin tipo estricto para operaciones sobre tablas no presentes en los tipos
9|// generados (cierres_caja, caja_sesiones, movimientos_caja) o RPCs no tipados.
10|// eslint-disable-next-line @typescript-eslint/no-explicit-any
11|const db = supabase as any
12|
13|// Tipos de base de datos
14|type Barbero = Database['public']['Tables']['barberos']['Row']
15|type Servicio = Database['public']['Tables']['servicios']['Row']
16|type Cita = Database['public']['Tables']['citas']['Row']
17|type AdminUser = Database['public']['Tables']['admin_users']['Row']
18|type PortfolioItem = Database['public']['Tables']['barbero_portfolio']['Row']
19|
20|// Helper para barberos
21|export const chamosSupabase = {
22|  // Barberos
23|  getBarberos: async (activo?: boolean) => {
24|    let query = supabase.from('barberos').select('*')
25|
26|    if (activo !== undefined && activo !== null) {
27|      query = query.eq('activo', activo)
28|    }
29|
30|    const { data, error } = await query.order('nombre')
31|
32|    if (error) throw error
33|    return data as Barbero[]
34|  },
35|
36|  getBarbero: async (id: string) => {
37|    const { data, error } = await supabase
38|      .from('barberos')
39|      .select('*')
40|      .eq('id', id)
41|      .single()
42|
43|    if (error) throw error
44|    return data as Barbero
45|  },
46|
47|  createBarbero: async (barbero: Database['public']['Tables']['barberos']['Insert']) => {
48|    // Usar API route con service_role key para bypasear RLS
49|    const response = await fetch('/api/barberos/create', {
50|      method: 'POST',
51|      headers: {
52|        'Content-Type': 'application/json',
53|      },
54|      body: JSON.stringify(barbero)
55|    })
56|
57|    if (!response.ok) {
58|      const errorData = await response.json()
59|      throw new Error(errorData.error || 'Error al crear barbero')
60|    }
61|
62|    const result = await response.json()
63|    return result.barbero as Barbero
64|  },
65|
66|  updateBarbero: async (id: string, updates: Database['public']['Tables']['barberos']['Update']) => {
67|    // Si solo se está actualizando el campo 'activo', usar la API route específica
68|    if (Object.keys(updates).length === 1 && 'activo' in updates) {
69|      const response = await fetch('/api/barberos/toggle-active', {
70|        method: 'POST',
71|        headers: {
72|          'Content-Type': 'application/json',
73|        },
74|        body: JSON.stringify({
75|          barberoId: id,
76|          activo: updates.activo
77|        })
78|      })
79|
80|      if (!response.ok) {
81|        const errorData = await response.json()
82|        throw new Error(errorData.error || 'Error al actualizar barbero')
83|      }
84|
85|      const result = await response.json()
86|      return result.barbero as Barbero
87|    }
88|
89|    // Para otras actualizaciones, usar API route general con service_role
90|    const response = await fetch('/api/barberos/update', {
91|      method: 'PUT',
92|      headers: {
93|        'Content-Type': 'application/json',
94|      },
95|      body: JSON.stringify({
96|        barberoId: id,
97|        updates
98|      })
99|    })
100|
101|    if (!response.ok) {
102|      const errorData = await response.json()
103|      throw new Error(errorData.error || 'Error al actualizar barbero')
104|    }
105|
106|    const result = await response.json()
107|    return result.barbero as Barbero
108|  },
109|
110|  deleteBarbero: async (id: string) => {
111|    // Soft delete: marcar como inactivo en vez de eliminar
112|    // Usa API route con service_role key para bypasear RLS
113|    const response = await fetch('/api/barberos/toggle-active', {
114|      method: 'POST',
115|      headers: {
116|        'Content-Type': 'application/json',
117|      },
118|      body: JSON.stringify({
119|        barberoId: id,
120|        activo: false
121|      })
122|    })
123|
124|    if (!response.ok) {
125|      const errorData = await response.json()
126|      throw new Error(errorData.error || 'Error al desactivar barbero')
127|    }
128|
129|    return await response.json()
130|  },
131|
132|  // Eliminar barbero PERMANENTEMENTE (solo para casos especiales)
133|  // ⚠️ ADVERTENCIA: Esto elimina todos los datos y NO se puede deshacer
134|  permanentlyDeleteBarbero: async (id: string) => {
135|    // Usa API route con service_role key para bypasear RLS
136|    const response = await fetch('/api/barberos/delete-permanent', {
137|      method: 'DELETE',
138|      headers: {
139|        'Content-Type': 'application/json',
140|      },
141|      body: JSON.stringify({
142|        barberoId: id
143|      })
144|    })
145|
146|    if (!response.ok) {
147|      const errorData = await response.json()
148|      throw new Error(errorData.error || 'Error al eliminar barbero permanentemente')
149|    }
150|
151|    return await response.json()
152|  },
153|
154|  // Servicios
155|  getServicios: async (activo?: boolean) => {
156|    let query = supabase.from('servicios').select('*')
157|
158|    if (activo !== undefined) {
159|      query = query.eq('activo', activo)
160|    }
161|
162|    const { data, error } = await query.order('nombre')
163|
164|    if (error) throw error
165|    return data as Servicio[]
166|  },
167|
168|  getServicio: async (id: string) => {
169|    const { data, error } = await supabase
170|      .from('servicios')
171|      .select('*')
172|      .eq('id', id)
173|      .single()
174|
175|    if (error) throw error
176|    return data as Servicio
177|  },
178|
179|  createServicio: async (servicio: Database['public']['Tables']['servicios']['Insert']) => {
180|    const { data, error } = await db
181|      .from('servicios')
182|      .insert([servicio])
183|      .select()
184|      .single()
185|
186|    if (error) throw error
187|    return data as Servicio
188|  },
189|
190|  updateServicio: async (id: string, updates: Database['public']['Tables']['servicios']['Update']) => {
191|    const { data, error } = await db
192|      .from('servicios')
193|      .update({ ...updates, updated_at: new Date().toISOString() })
194|      .eq('id', id)
195|      .select()
196|      .single()
197|
198|    if (error) throw error
199|    return data as Servicio
200|  },
201|
202|  deleteServicio: async (id: string) => {
203|    // Primero verificar si hay citas asociadas
204|    const { data: citas, error: citasError } = await supabase
205|      .from('citas')
206|      .select('id')
207|      .eq('servicio_id', id)
208|      .limit(1)
209|
210|    if (citasError) throw citasError
211|
212|    // Si hay citas asociadas, lanzar error descriptivo
213|    if (citas && citas.length > 0) {
214|      throw new Error(
215|        'No se puede eliminar este servicio porque tiene citas asociadas. ' +
216|        'Por favor, desactiva el servicio en lugar de eliminarlo, o elimina primero las citas asociadas.'
217|      )
218|    }
219|
220|    // Si no hay citas, proceder con la eliminación
221|    const { error } = await supabase
222|      .from('servicios')
223|      .delete()
224|      .eq('id', id)
225|
226|    if (error) throw error
227|  },
228|
229|  // Citas
230|  getCitas: async (filters?: {
231|    barbero_id?: string
232|    fecha?: string
233|    estado?: string
234|  }) => {
235|    let query = supabase
236|      .from('citas')
237|      .select(`
238|        *,
239|        barberos (nombre, apellido),
240|        servicios (nombre, precio, duracion_minutos)
241|      `)
242|
243|    if (filters?.barbero_id) {
244|      query = query.eq('barbero_id', filters.barbero_id)
245|    }
246|    if (filters?.fecha) {
247|      query = query.eq('fecha', filters.fecha)
248|    }
249|    if (filters?.estado) {
250|      query = query.eq('estado', filters.estado)
251|    }
252|
253|    const { data, error } = await query.order('fecha').order('hora')
254|
255|    if (error) throw error
256|    return data || []
257|  },
258|
259|  getCita: async (id: string) => {
260|    const { data, error } = await supabase
261|      .from('citas')
262|      .select(`
263|        *,
264|        barberos (nombre, apellido),
265|        servicios (nombre, precio, duracion_minutos)
266|      `)
267|      .eq('id', id)
268|      .single()
269|
270|    if (error) throw error
271|    return data
272|  },
273|
274|  createCita: async (cita: Database['public']['Tables']['citas']['Insert']) => {
275|    // VALIDACIÓN 1: Verificar disponibilidad antes de insertar
276|    const { data: existingCitas } = await supabase
277|      .from('citas')
278|      .select('id, cliente_nombre')
279|      .eq('barbero_id', cita.barbero_id ?? '')
280|      .eq('fecha', cita.fecha ?? '')
281|      .eq('hora', cita.hora ?? '')
282|      .in('estado', ['pendiente', 'confirmada'])
283|
284|    if (existingCitas && existingCitas.length > 0) {
285|      throw new Error('⚠️ Lo sentimos, este horario acaba de ser reservado por otro cliente. Por favor selecciona otro horario.')
286|    }
287|
288|    // VALIDACIÓN 2: Verificar que no sea una hora pasada
289|    const { getChileAhora } = await import('../src/lib/date-utils')
290|    const ahora = getChileAhora()
291|    const [hReserva, mReserva] = cita.hora.split(':').map(Number)
292|    const fechaHora = new Date(`${cita.fecha}T00:00:00`)
293|    fechaHora.setHours(hReserva, mReserva, 0, 0)
294|
295|    if (fechaHora <= ahora) {
296|      throw new Error('⚠️ No puedes reservar una cita en el pasado. Por favor selecciona otra fecha u hora.')
297|    }
298|
299|    // VALIDACIÓN 3: Intentar insertar con manejo de race conditions
300|    const { data, error } = await db
301|      .from('citas')
302|      .insert([cita])
303|      .select()
304|      .single()
305|
306|    if (error) {
307|      // Si es un error de constraint único (race condition), mensaje más claro
308|      if (error.code === '23505') {
309|        throw new Error('⚠️ Este horario fue reservado mientras completabas el formulario. Por favor selecciona otro horario.')
310|      }
311|      throw error
312|    }
313|
314|    return data as Cita
315|  },
316|
317|  updateCita: async (id: string, updates: Database['public']['Tables']['citas']['Update']) => {
318|    const { data, error } = await db
319|      .from('citas')
320|      .update({ ...updates, updated_at: new Date().toISOString() })
321|      .eq('id', id)
322|      .select()
323|      .single()
324|
325|    if (error) throw error
326|    return data as Cita
327|  },
328|
329|  deleteCita: async (id: string) => {
330|    const { error } = await supabase
331|      .from('citas')
332|      .delete()
333|      .eq('id', id)
334|
335|    if (error) throw error
336|  },
337|
338|  // Horarios disponibles
339|  getHorariosDisponibles: async (barbero_id: string, fecha: string, duracion_minutos: number = 30): Promise<{ hora: string, disponible: boolean, motivo?: string }[] | null> => {
340|    try {
341|      const { data, error } = await db
342|        .rpc('get_horarios_disponibles', {
343|          p_barbero_id: barbero_id,
344|          p_fecha: fecha,
345|          p_duracion_minutos: duracion_minutos
346|        })
347|
348|      if (error) {
349|        console.error('Error en getHorariosDisponibles:', error)
350|        throw error
351|      }
352|
353|      return (data as { hora: string, disponible: boolean, motivo?: string }[] | null) || []
354|    } catch (error) {
355|      console.error('Error calling get_horarios_disponibles:', error)
356|      // Si la función no existe aún, retornar null para usar horarios por defecto
357|      return null
358|    }
359|  },
360|
361|  // Horarios de atención (horarios_atencion)
362|  getHorariosAtencion: async (barbero_id?: string) => {
363|    let query = supabase
364|      .from('horarios_atencion')
365|      .select(`
366|        *,
367|        barberos (nombre, apellido)
368|      `)
369|
370|    if (barbero_id) {
371|      query = query.eq('barbero_id', barbero_id)
372|    }
373|
374|    const { data, error } = await query.order('dia_semana').order('hora_inicio')
375|
376|    if (error) throw error
377|    return data
378|  },
379|
380|  createHorarioAtencion: async (horario: Database['public']['Tables']['horarios_atencion']['Insert']) => {
381|    const { data, error } = await db
382|      .from('horarios_atencion')
383|      .insert([horario])
384|      .select()
385|      .single()
386|
387|    if (error) throw error
388|    return data
389|  },
390|
391|  updateHorarioAtencion: async (id: string, updates: Database['public']['Tables']['horarios_atencion']['Update']) => {
392|    const { data, error } = await db
393|      .from('horarios_atencion')
394|      .update(updates)
395|      .eq('id', id)
396|      .select()
397|      .single()
398|
399|    if (error) throw error
400|    return data
401|  },
402|
403|  deleteHorarioAtencion: async (id: string) => {
404|    const { error } = await supabase
405|      .from('horarios_atencion')
406|      .delete()
407|      .eq('id', id)
408|
409|    if (error) throw error
410|  },
411|
412|  // Horarios bloqueados (horarios_bloqueados)
413|  getHorariosBloqueados: async (barbero_id?: string) => {
414|    let query = supabase
415|      .from('horarios_bloqueados')
416|      .select(`
417|        *,
418|        barberos (nombre, apellido)
419|      `)
420|
421|    if (barbero_id) {
422|      query = query.eq('barbero_id', barbero_id)
423|    }
424|
425|    const { data, error } = await query.order('fecha_hora_inicio', { ascending: false })
426|
427|    if (error) throw error
428|    return data
429|  },
430|
431|  createHorarioBloqueado: async (bloqueo: Database['public']['Tables']['horarios_bloqueados']['Insert']) => {
432|    const { data, error } = await db
433|      .from('horarios_bloqueados')
434|      .insert([bloqueo])
435|      .select()
436|      .single()
437|
438|    if (error) throw error
439|    return data
440|  },
441|
442|  updateHorarioBloqueado: async (id: string, updates: Database['public']['Tables']['horarios_bloqueados']['Update']) => {
443|    const { data, error } = await db
444|      .from('horarios_bloqueados')
445|      .update(updates)
446|      .eq('id', id)
447|      .select()
448|      .single()
449|
450|    if (error) throw error
451|    return data
452|  },
453|
454|  deleteHorarioBloqueado: async (id: string) => {
455|    const { error } = await supabase
456|      .from('horarios_bloqueados')
457|      .delete()
458|      .eq('id', id)
459|
460|    if (error) throw error
461|  },
462|
463|  // DEPRECATED: Legacy functions for backward compatibility
464|  getHorariosTrabajo: async (barbero_id?: string) => {
465|    console.warn('⚠️ getHorariosTrabajo is deprecated. Use getHorariosAtencion instead.')
466|    return chamosSupabase.getHorariosAtencion(barbero_id)
467|  },
468|
469|  createHorarioTrabajo: async (horario: Database['public']['Tables']['horarios_atencion']['Insert']) => {
470|    console.warn('⚠️ createHorarioTrabajo is deprecated. Use createHorarioAtencion instead.')
471|    return chamosSupabase.createHorarioAtencion(horario)
472|  },
473|
474|  updateHorarioTrabajo: async (id: string, updates: Database['public']['Tables']['horarios_atencion']['Update']) => {
475|    console.warn('⚠️ updateHorarioTrabajo is deprecated. Use updateHorarioAtencion instead.')
476|    return chamosSupabase.updateHorarioAtencion(id, updates)
477|  },
478|
479|  deleteHorarioTrabajo: async (id: string) => {
480|    console.warn('⚠️ deleteHorarioTrabajo is deprecated. Use deleteHorarioAtencion instead.')
481|    return chamosSupabase.deleteHorarioAtencion(id)
482|  },
483|
484|  // Portfolio
485|  getPortfolio: async (barbero_id?: string) => {
486|    let query = supabase
487|      .from('barbero_portfolio')
488|      .select(`
489|        *,
490|        barberos (nombre, apellido)
491|      `)
492|
493|    if (barbero_id) {
494|      query = query.eq('barbero_id', barbero_id)
495|    }
496|
497|    const { data, error } = await query
498|      .eq('activo', true)
499|      .order('orden')
500|
501|    if (error) throw error
502|    return data
503|  },
504|
505|  createPortfolioItem: async (item: Database['public']['Tables']['barbero_portfolio']['Insert']) => {
506|    const { data, error } = await db
507|      .from('barbero_portfolio')
508|      .insert([item])
509|      .select()
510|      .single()
511|
512|    if (error) throw error
513|    return data as PortfolioItem
514|  },
515|
516|  updatePortfolioItem: async (id: string, updates: Database['public']['Tables']['barbero_portfolio']['Update']) => {
517|    const { data, error } = await db
518|      .from('barbero_portfolio')
519|      .update({ ...updates, updated_at: new Date().toISOString() })
520|      .eq('id', id)
521|      .select()
522|      .single()
523|
524|    if (error) throw error
525|    return data as PortfolioItem
526|  },
527|
528|  deletePortfolioItem: async (id: string) => {
529|    const { error } = await supabase
530|      .from('barbero_portfolio')
531|      .delete()
532|      .eq('id', id)
533|
534|    if (error) throw error
535|  },
536|
537|  // Usuarios admin
538|  getAdminUsers: async () => {
539|    const { data, error } = await supabase
540|      .from('admin_users')
541|      .select('id, email, nombre, rol, activo, created_at')
542|      .order('nombre')
543|
544|    if (error) throw error
545|    return data
546|  },
547|
548|  getAdminUser: async (email: string) => {
549|    const { data, error } = await supabase
550|      .from('admin_users')
551|      .select('*')
552|      .eq('email', email)
553|      .eq('activo', true)
554|      .single()
555|
556|    if (error) throw error
557|    return data as AdminUser
558|  },
559|
560|  createAdminUser: async (user: Database['public']['Tables']['admin_users']['Insert']) => {
561|    const { data, error } = await db
562|      .from('admin_users')
563|      .insert([user])
564|      .select('id, email, nombre, rol, activo, created_at')
565|      .single()
566|
567|    if (error) throw error
568|    return data
569|  },
570|
571|  updateAdminUser: async (id: string, updates: Database['public']['Tables']['admin_users']['Update']) => {
572|    const { data, error } = await db
573|      .from('admin_users')
574|      .update({ ...updates, updated_at: new Date().toISOString() })
575|      .eq('id', id)
576|      .select('id, email, nombre, rol, activo, created_at')
577|      .single()
578|
579|    if (error) throw error
580|    return data
581|  },
582|
583|  deleteAdminUser: async (id: string) => {
584|    const { error } = await supabase
585|      .from('admin_users')
586|      .delete()
587|      .eq('id', id)
588|
589|    if (error) throw error
590|  },
591|
592|  // Configuración del sitio (Multitenant Aware)
593|  getConfiguracion: async (clave?: string) => {
594|    if (clave) {
595|      const { data, error } = await supabase
596|        .from('sitio_configuracion')
597|        .select('*')
598|        .eq('clave', clave)
599|        .single()
600|      if (error) throw error
601|      return data
602|    }
603|
604|    const { data, error } = await supabase
605|      .from('sitio_configuracion')
606|      .select('*')
607|      .order('clave')
608|
609|    if (error) throw error
610|    return data
611|  },
612|
613|  updateConfiguracion: async (clave: string, valor: string) => {
614|    const { data: { user } } = await supabase.auth.getUser()
615|    if (!user) throw new Error('Usuario no autenticado')
616|
617|    const { data: adminUser } = await db
618|      .from('admin_users')
619|      .select('comercio_id')
620|      .eq('id', user.id)
621|      .single()
622|
623|    const comercio_id = adminUser?.comercio_id
624|
625|    const { data, error } = await db
626|      .from('sitio_configuracion')
627|      .upsert({ clave, valor, comercio_id, updated_at: new Date().toISOString() }, {
628|        onConflict: 'clave,comercio_id'
629|      })
630|      .select()
631|      .single()
632|
633|    if (error) throw error
634|    return data
635|  },
636|
637|  // Gestión de Horario General (Configuración de puntualidad)
638|  getHorarioGeneral: async () => {
639|    const { data: { user } } = await supabase.auth.getUser()
640|    if (!user) throw new Error('Usuario no autenticado')
641|
642|    const { data: adminUser } = await db
643|      .from('admin_users')
644|      .select('comercio_id')
645|      .eq('id', user.id)
646|      .single()
647|
648|    if (!adminUser?.comercio_id) throw new Error('Comercio no asociado al usuario')
649|
650|    const { data, error } = await db
651|      .from('configuracion_horarios')
652|      .select('*')
653|      .eq('comercio_id', adminUser.comercio_id)
654|      .eq('activa', true)
655|      .maybeSingle()
656|
657|    if (error) throw error
658|    return data
659|  },
660|
661|  updateHorarioGeneral: async (updates: { hora_entrada_puntual: string, hora_salida_minima?: string }) => {
662|    const { data: { user } } = await supabase.auth.getUser()
663|    if (!user) throw new Error('Usuario no autenticado')
664|
665|    const { data: adminUser } = await db
666|      .from('admin_users')
667|      .select('comercio_id')
668|      .eq('id', user.id)
669|      .single()
670|
671|    if (!adminUser?.comercio_id) throw new Error('Comercio no asociado al usuario')
672|
673|    const { data, error } = await db
674|      .from('configuracion_horarios')
675|      .upsert({
676|        nombre: 'Horario General',
677|        comercio_id: adminUser.comercio_id,
678|        hora_entrada_puntual: updates.hora_entrada_puntual,
679|        hora_salida_minima: updates.hora_salida_minima,
680|        activa: true,
681|        updated_at: new Date().toISOString()
682|      }, {
683|        onConflict: 'nombre,comercio_id'
684|      })
685|      .select()
686|      .single()
687|
688|    if (error) throw error
689|    return data
690|  },
691|
692|  // Storage - Subir imagen de barbero
693|  uploadBarberoFoto: async (file: File, barberoId: string) => {
694|    try {
695|      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
696|      if (!validTypes.includes(file.type)) {
697|        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
698|      }
699|
700|      const maxSize = 5 * 1024 * 1024 // 5MB
701|      if (file.size > maxSize) {
702|        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
703|      }
704|
705|      devLog('📤 [uploadBarberoFoto] Subiendo archivo:', file.name)
706|
707|      // Convertir a base64 para enviar por API route
708|      const base64 = await new Promise<string>((resolve, reject) => {
709|        const reader = new FileReader()
710|        reader.onload = () => {
711|          const result = reader.result as string
712|          const comma = result.indexOf(',')
713|          resolve(comma >= 0 ? result.slice(comma + 1) : result)
714|        }
715|        reader.onerror = reject
716|        reader.readAsDataURL(file)
717|      })
718|
719|      const response = await fetch('/api/upload/barbero-foto', {
720|        method: 'POST',
721|        headers: { 'Content-Type': 'application/json' },
722|        body: JSON.stringify({ barberoId, fileName: file.name, base64, contentType: file.type }),
723|        signal: AbortSignal.timeout(30000),
724|      })
725|
726|      if (!response.ok) {
727|        const err = await response.json().catch(() => ({ error: 'Error de conexión' }))
728|        throw new Error(err.error || 'Error al subir imagen')
729|      }
730|
731|      const result = await response.json()
732|      devLog('✅ [uploadBarberoFoto] Archivo subido:', result.path)
733|
734|      return {
735|        path: result.path,
736|        publicUrl: result.publicUrl,
737|      }
738|    } catch (error: any) {
739|      console.error('❌ [uploadBarberoFoto] Error:', error)
740|      throw error
741|    }
742|  },
743|
744|  // Storage - Eliminar imagen de barbero
745|  deleteBarberoFoto: async (filePath: string) => {
746|    try {
747|      devLog('🗑️ [deleteBarberoFoto] Eliminando archivo:', filePath)
748|
749|      const { error } = await supabase.storage
750|        .from('barberos-fotos')
751|        .remove([filePath])
752|
753|      if (error) {
754|        console.error('❌ [deleteBarberoFoto] Error eliminando:', error)
755|        throw error
756|      }
757|
758|      devLog('✅ [deleteBarberoFoto] Archivo eliminado')
759|    } catch (error: any) {
760|      console.error('❌ [deleteBarberoFoto] Error:', error)
761|      // No lanzar error si el archivo no existe o es timeout/red
762|      const msg = (error.message || error.error_description || '').toLowerCase()
763|      if (msg.includes('not found') || msg.includes('timeout') || msg.includes('timed out') || msg.includes('network') || msg.includes('fetch')) {
764|        devLog('⚠️ [deleteBarberoFoto] Error no crítico (timeout/red/not found), continuando...')
765|        return
766|      }
767|      throw error
768|    }
769|  },
770|
771|    // Storage - Subir imagen de servicio
  uploadServicioFoto: async (file: File, servicioId: string) => {
    try {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!validTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
      }
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
      }
      devLog('📤 [uploadServicioFoto] Subiendo archivo:', file.name)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const comma = result.indexOf(',')
          resolve(comma >= 0 ? result.slice(comma + 1) : result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'servicio', entityId: servicioId, fileName: file.name, base64, contentType: file.type }),
        signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error de conexión' }))
        throw new Error(err.error || 'Error al subir imagen')
      }
      const result = await response.json()
      devLog('✅ [uploadServicioFoto] Archivo subido:', result.path)
      return { path: result.path, publicUrl: result.publicUrl }
    } catch (error: any) {
      console.error('❌ [uploadServicioFoto] Error:', error)
      throw error
    }
  },

  // Storage - Subir imagen de producto
  uploadProductoFoto: async (file: File, productoId: string) => {
    try {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!validTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
      }
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
      }
      devLog('📤 [uploadProductoFoto] Subiendo archivo:', file.name)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const comma = result.indexOf(',')
          resolve(comma >= 0 ? result.slice(comma + 1) : result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'producto', entityId: productoId, fileName: file.name, base64, contentType: file.type }),
        signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error de conexión' }))
        throw new Error(err.error || 'Error al subir imagen')
      }
      const result = await response.json()
      devLog('✅ [uploadProductoFoto] Archivo subido:', result.path)
      return { path: result.path, publicUrl: result.publicUrl }
    } catch (error: any) {
      console.error('❌ [uploadProductoFoto] Error:', error)
      throw error
    }
  },

  // Storage - Subir imagen de corte
  uploadCorteFoto: async (file: File, corteId: string) => {
    try {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      if (!validTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
      }
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
      }
      devLog('📤 [uploadCorteFoto] Subiendo archivo:', file.name)
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const comma = result.indexOf(',')
          resolve(comma >= 0 ? result.slice(comma + 1) : result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'corte', entityId: corteId, fileName: file.name, base64, contentType: file.type }),
        signal: AbortSignal.timeout(30000),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Error de conexión' }))
        throw new Error(err.error || 'Error al subir imagen')
      }
      const result = await response.json()
      devLog('✅ [uploadCorteFoto] Archivo subido:', result.path)
      return { path: result.path, publicUrl: result.publicUrl }
    } catch (error: any) {
      console.error('❌ [uploadCorteFoto] Error:', error)
      throw error
    }
  },1|import { supabase } from './initSupabase'
2|import type { Database } from './database.types'
3|
4|const devLog = (...args: unknown[]) => {
5|  if (process.env.NODE_ENV !== 'production') console.log(...args)
6|}
7|
8|// Alias sin tipo estricto para operaciones sobre tablas no presentes en los tipos
9|// generados (cierres_caja, caja_sesiones, movimientos_caja) o RPCs no tipados.
10|// eslint-disable-next-line @typescript-eslint/no-explicit-any
11|const db = supabase as any
12|
13|// Tipos de base de datos
14|type Barbero = Database['public']['Tables']['barberos']['Row']
15|type Servicio = Database['public']['Tables']['servicios']['Row']
16|type Cita = Database['public']['Tables']['citas']['Row']
17|type AdminUser = Database['public']['Tables']['admin_users']['Row']
18|type PortfolioItem = Database['public']['Tables']['barbero_portfolio']['Row']
19|
20|// Helper para barberos
21|export const chamosSupabase = {
22|  // Barberos
23|  getBarberos: async (activo?: boolean) => {
24|    let query = supabase.from('barberos').select('*')
25|
26|    if (activo !== undefined && activo !== null) {
27|      query = query.eq('activo', activo)
28|    }
29|
30|    const { data, error } = await query.order('nombre')
31|
32|    if (error) throw error
33|    return data as Barbero[]
34|  },
35|
36|  getBarbero: async (id: string) => {
37|    const { data, error } = await supabase
38|      .from('barberos')
39|      .select('*')
40|      .eq('id', id)
41|      .single()
42|
43|    if (error) throw error
44|    return data as Barbero
45|  },
46|
47|  createBarbero: async (barbero: Database['public']['Tables']['barberos']['Insert']) => {
48|    // Usar API route con service_role key para bypasear RLS
49|    const response = await fetch('/api/barberos/create', {
50|      method: 'POST',
51|      headers: {
52|        'Content-Type': 'application/json',
53|      },
54|      body: JSON.stringify(barbero)
55|    })
56|
57|    if (!response.ok) {
58|      const errorData = await response.json()
59|      throw new Error(errorData.error || 'Error al crear barbero')
60|    }
61|
62|    const result = await response.json()
63|    return result.barbero as Barbero
64|  },
65|
66|  updateBarbero: async (id: string, updates: Database['public']['Tables']['barberos']['Update']) => {
67|    // Si solo se está actualizando el campo 'activo', usar la API route específica
68|    if (Object.keys(updates).length === 1 && 'activo' in updates) {
69|      const response = await fetch('/api/barberos/toggle-active', {
70|        method: 'POST',
71|        headers: {
72|          'Content-Type': 'application/json',
73|        },
74|        body: JSON.stringify({
75|          barberoId: id,
76|          activo: updates.activo
77|        })
78|      })
79|
80|      if (!response.ok) {
81|        const errorData = await response.json()
82|        throw new Error(errorData.error || 'Error al actualizar barbero')
83|      }
84|
85|      const result = await response.json()
86|      return result.barbero as Barbero
87|    }
88|
89|    // Para otras actualizaciones, usar API route general con service_role
90|    const response = await fetch('/api/barberos/update', {
91|      method: 'PUT',
92|      headers: {
93|        'Content-Type': 'application/json',
94|      },
95|      body: JSON.stringify({
96|        barberoId: id,
97|        updates
98|      })
99|    })
100|
101|    if (!response.ok) {
102|      const errorData = await response.json()
103|      throw new Error(errorData.error || 'Error al actualizar barbero')
104|    }
105|
106|    const result = await response.json()
107|    return result.barbero as Barbero
108|  },
109|
110|  deleteBarbero: async (id: string) => {
111|    // Soft delete: marcar como inactivo en vez de eliminar
112|    // Usa API route con service_role key para bypasear RLS
113|    const response = await fetch('/api/barberos/toggle-active', {
114|      method: 'POST',
115|      headers: {
116|        'Content-Type': 'application/json',
117|      },
118|      body: JSON.stringify({
119|        barberoId: id,
120|        activo: false
121|      })
122|    })
123|
124|    if (!response.ok) {
125|      const errorData = await response.json()
126|      throw new Error(errorData.error || 'Error al desactivar barbero')
127|    }
128|
129|    return await response.json()
130|  },
131|
132|  // Eliminar barbero PERMANENTEMENTE (solo para casos especiales)
133|  // ⚠️ ADVERTENCIA: Esto elimina todos los datos y NO se puede deshacer
134|  permanentlyDeleteBarbero: async (id: string) => {
135|    // Usa API route con service_role key para bypasear RLS
136|    const response = await fetch('/api/barberos/delete-permanent', {
137|      method: 'DELETE',
138|      headers: {
139|        'Content-Type': 'application/json',
140|      },
141|      body: JSON.stringify({
142|        barberoId: id
143|      })
144|    })
145|
146|    if (!response.ok) {
147|      const errorData = await response.json()
148|      throw new Error(errorData.error || 'Error al eliminar barbero permanentemente')
149|    }
150|
151|    return await response.json()
152|  },
153|
154|  // Servicios
155|  getServicios: async (activo?: boolean) => {
156|    let query = supabase.from('servicios').select('*')
157|
158|    if (activo !== undefined) {
159|      query = query.eq('activo', activo)
160|    }
161|
162|    const { data, error } = await query.order('nombre')
163|
164|    if (error) throw error
165|    return data as Servicio[]
166|  },
167|
168|  getServicio: async (id: string) => {
169|    const { data, error } = await supabase
170|      .from('servicios')
171|      .select('*')
172|      .eq('id', id)
173|      .single()
174|
175|    if (error) throw error
176|    return data as Servicio
177|  },
178|
179|  createServicio: async (servicio: Database['public']['Tables']['servicios']['Insert']) => {
180|    const { data, error } = await db
181|      .from('servicios')
182|      .insert([servicio])
183|      .select()
184|      .single()
185|
186|    if (error) throw error
187|    return data as Servicio
188|  },
189|
190|  updateServicio: async (id: string, updates: Database['public']['Tables']['servicios']['Update']) => {
191|    const { data, error } = await db
192|      .from('servicios')
193|      .update({ ...updates, updated_at: new Date().toISOString() })
194|      .eq('id', id)
195|      .select()
196|      .single()
197|
198|    if (error) throw error
199|    return data as Servicio
200|  },
201|
202|  deleteServicio: async (id: string) => {
203|    // Primero verificar si hay citas asociadas
204|    const { data: citas, error: citasError } = await supabase
205|      .from('citas')
206|      .select('id')
207|      .eq('servicio_id', id)
208|      .limit(1)
209|
210|    if (citasError) throw citasError
211|
212|    // Si hay citas asociadas, lanzar error descriptivo
213|    if (citas && citas.length > 0) {
214|      throw new Error(
215|        'No se puede eliminar este servicio porque tiene citas asociadas. ' +
216|        'Por favor, desactiva el servicio en lugar de eliminarlo, o elimina primero las citas asociadas.'
217|      )
218|    }
219|
220|    // Si no hay citas, proceder con la eliminación
221|    const { error } = await supabase
222|      .from('servicios')
223|      .delete()
224|      .eq('id', id)
225|
226|    if (error) throw error
227|  },
228|
229|  // Citas
230|  getCitas: async (filters?: {
231|    barbero_id?: string
232|    fecha?: string
233|    estado?: string
234|  }) => {
235|    let query = supabase
236|      .from('citas')
237|      .select(`
238|        *,
239|        barberos (nombre, apellido),
240|        servicios (nombre, precio, duracion_minutos)
241|      `)
242|
243|    if (filters?.barbero_id) {
244|      query = query.eq('barbero_id', filters.barbero_id)
245|    }
246|    if (filters?.fecha) {
247|      query = query.eq('fecha', filters.fecha)
248|    }
249|    if (filters?.estado) {
250|      query = query.eq('estado', filters.estado)
251|    }
252|
253|    const { data, error } = await query.order('fecha').order('hora')
254|
255|    if (error) throw error
256|    return data || []
257|  },
258|
259|  getCita: async (id: string) => {
260|    const { data, error } = await supabase
261|      .from('citas')
262|      .select(`
263|        *,
264|        barberos (nombre, apellido),
265|        servicios (nombre, precio, duracion_minutos)
266|      `)
267|      .eq('id', id)
268|      .single()
269|
270|    if (error) throw error
271|    return data
272|  },
273|
274|  createCita: async (cita: Database['public']['Tables']['citas']['Insert']) => {
275|    // VALIDACIÓN 1: Verificar disponibilidad antes de insertar
276|    const { data: existingCitas } = await supabase
277|      .from('citas')
278|      .select('id, cliente_nombre')
279|      .eq('barbero_id', cita.barbero_id ?? '')
280|      .eq('fecha', cita.fecha ?? '')
281|      .eq('hora', cita.hora ?? '')
282|      .in('estado', ['pendiente', 'confirmada'])
283|
284|    if (existingCitas && existingCitas.length > 0) {
285|      throw new Error('⚠️ Lo sentimos, este horario acaba de ser reservado por otro cliente. Por favor selecciona otro horario.')
286|    }
287|
288|    // VALIDACIÓN 2: Verificar que no sea una hora pasada
289|    const { getChileAhora } = await import('../src/lib/date-utils')
290|    const ahora = getChileAhora()
291|    const [hReserva, mReserva] = cita.hora.split(':').map(Number)
292|    const fechaHora = new Date(`${cita.fecha}T00:00:00`)
293|    fechaHora.setHours(hReserva, mReserva, 0, 0)
294|
295|    if (fechaHora <= ahora) {
296|      throw new Error('⚠️ No puedes reservar una cita en el pasado. Por favor selecciona otra fecha u hora.')
297|    }
298|
299|    // VALIDACIÓN 3: Intentar insertar con manejo de race conditions
300|    const { data, error } = await db
301|      .from('citas')
302|      .insert([cita])
303|      .select()
304|      .single()
305|
306|    if (error) {
307|      // Si es un error de constraint único (race condition), mensaje más claro
308|      if (error.code === '23505') {
309|        throw new Error('⚠️ Este horario fue reservado mientras completabas el formulario. Por favor selecciona otro horario.')
310|      }
311|      throw error
312|    }
313|
314|    return data as Cita
315|  },
316|
317|  updateCita: async (id: string, updates: Database['public']['Tables']['citas']['Update']) => {
318|    const { data, error } = await db
319|      .from('citas')
320|      .update({ ...updates, updated_at: new Date().toISOString() })
321|      .eq('id', id)
322|      .select()
323|      .single()
324|
325|    if (error) throw error
326|    return data as Cita
327|  },
328|
329|  deleteCita: async (id: string) => {
330|    const { error } = await supabase
331|      .from('citas')
332|      .delete()
333|      .eq('id', id)
334|
335|    if (error) throw error
336|  },
337|
338|  // Horarios disponibles
339|  getHorariosDisponibles: async (barbero_id: string, fecha: string, duracion_minutos: number = 30): Promise<{ hora: string, disponible: boolean, motivo?: string }[] | null> => {
340|    try {
341|      const { data, error } = await db
342|        .rpc('get_horarios_disponibles', {
343|          p_barbero_id: barbero_id,
344|          p_fecha: fecha,
345|          p_duracion_minutos: duracion_minutos
346|        })
347|
348|      if (error) {
349|        console.error('Error en getHorariosDisponibles:', error)
350|        throw error
351|      }
352|
353|      return (data as { hora: string, disponible: boolean, motivo?: string }[] | null) || []
354|    } catch (error) {
355|      console.error('Error calling get_horarios_disponibles:', error)
356|      // Si la función no existe aún, retornar null para usar horarios por defecto
357|      return null
358|    }
359|  },
360|
361|  // Horarios de atención (horarios_atencion)
362|  getHorariosAtencion: async (barbero_id?: string) => {
363|    let query = supabase
364|      .from('horarios_atencion')
365|      .select(`
366|        *,
367|        barberos (nombre, apellido)
368|      `)
369|
370|    if (barbero_id) {
371|      query = query.eq('barbero_id', barbero_id)
372|    }
373|
374|    const { data, error } = await query.order('dia_semana').order('hora_inicio')
375|
376|    if (error) throw error
377|    return data
378|  },
379|
380|  createHorarioAtencion: async (horario: Database['public']['Tables']['horarios_atencion']['Insert']) => {
381|    const { data, error } = await db
382|      .from('horarios_atencion')
383|      .insert([horario])
384|      .select()
385|      .single()
386|
387|    if (error) throw error
388|    return data
389|  },
390|
391|  updateHorarioAtencion: async (id: string, updates: Database['public']['Tables']['horarios_atencion']['Update']) => {
392|    const { data, error } = await db
393|      .from('horarios_atencion')
394|      .update(updates)
395|      .eq('id', id)
396|      .select()
397|      .single()
398|
399|    if (error) throw error
400|    return data
401|  },
402|
403|  deleteHorarioAtencion: async (id: string) => {
404|    const { error } = await supabase
405|      .from('horarios_atencion')
406|      .delete()
407|      .eq('id', id)
408|
409|    if (error) throw error
410|  },
411|
412|  // Horarios bloqueados (horarios_bloqueados)
413|  getHorariosBloqueados: async (barbero_id?: string) => {
414|    let query = supabase
415|      .from('horarios_bloqueados')
416|      .select(`
417|        *,
418|        barberos (nombre, apellido)
419|      `)
420|
421|    if (barbero_id) {
422|      query = query.eq('barbero_id', barbero_id)
423|    }
424|
425|    const { data, error } = await query.order('fecha_hora_inicio', { ascending: false })
426|
427|    if (error) throw error
428|    return data
429|  },
430|
431|  createHorarioBloqueado: async (bloqueo: Database['public']['Tables']['horarios_bloqueados']['Insert']) => {
432|    const { data, error } = await db
433|      .from('horarios_bloqueados')
434|      .insert([bloqueo])
435|      .select()
436|      .single()
437|
438|    if (error) throw error
439|    return data
440|  },
441|
442|  updateHorarioBloqueado: async (id: string, updates: Database['public']['Tables']['horarios_bloqueados']['Update']) => {
443|    const { data, error } = await db
444|      .from('horarios_bloqueados')
445|      .update(updates)
446|      .eq('id', id)
447|      .select()
448|      .single()
449|
450|    if (error) throw error
451|    return data
452|  },
453|
454|  deleteHorarioBloqueado: async (id: string) => {
455|    const { error } = await supabase
456|      .from('horarios_bloqueados')
457|      .delete()
458|      .eq('id', id)
459|
460|    if (error) throw error
461|  },
462|
463|  // DEPRECATED: Legacy functions for backward compatibility
464|  getHorariosTrabajo: async (barbero_id?: string) => {
465|    console.warn('⚠️ getHorariosTrabajo is deprecated. Use getHorariosAtencion instead.')
466|    return chamosSupabase.getHorariosAtencion(barbero_id)
467|  },
468|
469|  createHorarioTrabajo: async (horario: Database['public']['Tables']['horarios_atencion']['Insert']) => {
470|    console.warn('⚠️ createHorarioTrabajo is deprecated. Use createHorarioAtencion instead.')
471|    return chamosSupabase.createHorarioAtencion(horario)
472|  },
473|
474|  updateHorarioTrabajo: async (id: string, updates: Database['public']['Tables']['horarios_atencion']['Update']) => {
475|    console.warn('⚠️ updateHorarioTrabajo is deprecated. Use updateHorarioAtencion instead.')
476|    return chamosSupabase.updateHorarioAtencion(id, updates)
477|  },
478|
479|  deleteHorarioTrabajo: async (id: string) => {
480|    console.warn('⚠️ deleteHorarioTrabajo is deprecated. Use deleteHorarioAtencion instead.')
481|    return chamosSupabase.deleteHorarioAtencion(id)
482|  },
483|
484|  // Portfolio
485|  getPortfolio: async (barbero_id?: string) => {
486|    let query = supabase
487|      .from('barbero_portfolio')
488|      .select(`
489|        *,
490|        barberos (nombre, apellido)
491|      `)
492|
493|    if (barbero_id) {
494|      query = query.eq('barbero_id', barbero_id)
495|    }
496|
497|    const { data, error } = await query
498|      .eq('activo', true)
499|      .order('orden')
500|
501|    if (error) throw error
502|    return data
503|  },
504|
505|  createPortfolioItem: async (item: Database['public']['Tables']['barbero_portfolio']['Insert']) => {
506|    const { data, error } = await db
507|      .from('barbero_portfolio')
508|      .insert([item])
509|      .select()
510|      .single()
511|
512|    if (error) throw error
513|    return data as PortfolioItem
514|  },
515|
516|  updatePortfolioItem: async (id: string, updates: Database['public']['Tables']['barbero_portfolio']['Update']) => {
517|    const { data, error } = await db
518|      .from('barbero_portfolio')
519|      .update({ ...updates, updated_at: new Date().toISOString() })
520|      .eq('id', id)
521|      .select()
522|      .single()
523|
524|    if (error) throw error
525|    return data as PortfolioItem
526|  },
527|
528|  deletePortfolioItem: async (id: string) => {
529|    const { error } = await supabase
530|      .from('barbero_portfolio')
531|      .delete()
532|      .eq('id', id)
533|
534|    if (error) throw error
535|  },
536|
537|  // Usuarios admin
538|  getAdminUsers: async () => {
539|    const { data, error } = await supabase
540|      .from('admin_users')
541|      .select('id, email, nombre, rol, activo, created_at')
542|      .order('nombre')
543|
544|    if (error) throw error
545|    return data
546|  },
547|
548|  getAdminUser: async (email: string) => {
549|    const { data, error } = await supabase
550|      .from('admin_users')
551|      .select('*')
552|      .eq('email', email)
553|      .eq('activo', true)
554|      .single()
555|
556|    if (error) throw error
557|    return data as AdminUser
558|  },
559|
560|  createAdminUser: async (user: Database['public']['Tables']['admin_users']['Insert']) => {
561|    const { data, error } = await db
562|      .from('admin_users')
563|      .insert([user])
564|      .select('id, email, nombre, rol, activo, created_at')
565|      .single()
566|
567|    if (error) throw error
568|    return data
569|  },
570|
571|  updateAdminUser: async (id: string, updates: Database['public']['Tables']['admin_users']['Update']) => {
572|    const { data, error } = await db
573|      .from('admin_users')
574|      .update({ ...updates, updated_at: new Date().toISOString() })
575|      .eq('id', id)
576|      .select('id, email, nombre, rol, activo, created_at')
577|      .single()
578|
579|    if (error) throw error
580|    return data
581|  },
582|
583|  deleteAdminUser: async (id: string) => {
584|    const { error } = await supabase
585|      .from('admin_users')
586|      .delete()
587|      .eq('id', id)
588|
589|    if (error) throw error
590|  },
591|
592|  // Configuración del sitio (Multitenant Aware)
593|  getConfiguracion: async (clave?: string) => {
594|    if (clave) {
595|      const { data, error } = await supabase
596|        .from('sitio_configuracion')
597|        .select('*')
598|        .eq('clave', clave)
599|        .single()
600|      if (error) throw error
601|      return data
602|    }
603|
604|    const { data, error } = await supabase
605|      .from('sitio_configuracion')
606|      .select('*')
607|      .order('clave')
608|
609|    if (error) throw error
610|    return data
611|  },
612|
613|  updateConfiguracion: async (clave: string, valor: string) => {
614|    const { data: { user } } = await supabase.auth.getUser()
615|    if (!user) throw new Error('Usuario no autenticado')
616|
617|    const { data: adminUser } = await db
618|      .from('admin_users')
619|      .select('comercio_id')
620|      .eq('id', user.id)
621|      .single()
622|
623|    const comercio_id = adminUser?.comercio_id
624|
625|    const { data, error } = await db
626|      .from('sitio_configuracion')
627|      .upsert({ clave, valor, comercio_id, updated_at: new Date().toISOString() }, {
628|        onConflict: 'clave,comercio_id'
629|      })
630|      .select()
631|      .single()
632|
633|    if (error) throw error
634|    return data
635|  },
636|
637|  // Gestión de Horario General (Configuración de puntualidad)
638|  getHorarioGeneral: async () => {
639|    const { data: { user } } = await supabase.auth.getUser()
640|    if (!user) throw new Error('Usuario no autenticado')
641|
642|    const { data: adminUser } = await db
643|      .from('admin_users')
644|      .select('comercio_id')
645|      .eq('id', user.id)
646|      .single()
647|
648|    if (!adminUser?.comercio_id) throw new Error('Comercio no asociado al usuario')
649|
650|    const { data, error } = await db
651|      .from('configuracion_horarios')
652|      .select('*')
653|      .eq('comercio_id', adminUser.comercio_id)
654|      .eq('activa', true)
655|      .maybeSingle()
656|
657|    if (error) throw error
658|    return data
659|  },
660|
661|  updateHorarioGeneral: async (updates: { hora_entrada_puntual: string, hora_salida_minima?: string }) => {
662|    const { data: { user } } = await supabase.auth.getUser()
663|    if (!user) throw new Error('Usuario no autenticado')
664|
665|    const { data: adminUser } = await db
666|      .from('admin_users')
667|      .select('comercio_id')
668|      .eq('id', user.id)
669|      .single()
670|
671|    if (!adminUser?.comercio_id) throw new Error('Comercio no asociado al usuario')
672|
673|    const { data, error } = await db
674|      .from('configuracion_horarios')
675|      .upsert({
676|        nombre: 'Horario General',
677|        comercio_id: adminUser.comercio_id,
678|        hora_entrada_puntual: updates.hora_entrada_puntual,
679|        hora_salida_minima: updates.hora_salida_minima,
680|        activa: true,
681|        updated_at: new Date().toISOString()
682|      }, {
683|        onConflict: 'nombre,comercio_id'
684|      })
685|      .select()
686|      .single()
687|
688|    if (error) throw error
689|    return data
690|  },
691|
692|  // Storage - Subir imagen de barbero
693|  uploadBarberoFoto: async (file: File, barberoId: string) => {
694|    try {
695|      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
696|      if (!validTypes.includes(file.type)) {
697|        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
698|      }
699|
700|      const maxSize = 5 * 1024 * 1024 // 5MB
701|      if (file.size > maxSize) {
702|        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
703|      }
704|
705|      devLog('📤 [uploadBarberoFoto] Subiendo archivo:', file.name)
706|
707|      // Convertir a base64 para enviar por API route
708|      const base64 = await new Promise<string>((resolve, reject) => {
709|        const reader = new FileReader()
710|        reader.onload = () => {
711|          const result = reader.result as string
712|          const comma = result.indexOf(',')
713|          resolve(comma >= 0 ? result.slice(comma + 1) : result)
714|        }
715|        reader.onerror = reject
716|        reader.readAsDataURL(file)
717|      })
718|
719|      const response = await fetch('/api/upload/barbero-foto', {
720|        method: 'POST',
721|        headers: { 'Content-Type': 'application/json' },
722|        body: JSON.stringify({ barberoId, fileName: file.name, base64, contentType: file.type }),
723|        signal: AbortSignal.timeout(30000),
724|      })
725|
726|      if (!response.ok) {
727|        const err = await response.json().catch(() => ({ error: 'Error de conexión' }))
728|        throw new Error(err.error || 'Error al subir imagen')
729|      }
730|
731|      const result = await response.json()
732|      devLog('✅ [uploadBarberoFoto] Archivo subido:', result.path)
733|
734|      return {
735|        path: result.path,
736|        publicUrl: result.publicUrl,
737|      }
738|    } catch (error: any) {
739|      console.error('❌ [uploadBarberoFoto] Error:', error)
740|      throw error
741|    }
742|  },
743|
744|  // Storage - Eliminar imagen de barbero
745|  deleteBarberoFoto: async (filePath: string) => {
746|    try {
747|      devLog('🗑️ [deleteBarberoFoto] Eliminando archivo:', filePath)
748|
749|      const { error } = await supabase.storage
750|        .from('barberos-fotos')
751|        .remove([filePath])
752|
753|      if (error) {
754|        console.error('❌ [deleteBarberoFoto] Error eliminando:', error)
755|        throw error
756|      }
757|
758|      devLog('✅ [deleteBarberoFoto] Archivo eliminado')
759|    } catch (error: any) {
760|      console.error('❌ [deleteBarberoFoto] Error:', error)
761|      // No lanzar error si el archivo no existe o es timeout/red
762|      const msg = (error.message || error.error_description || '').toLowerCase()
763|      if (msg.includes('not found') || msg.includes('timeout') || msg.includes('timed out') || msg.includes('network') || msg.includes('fetch')) {
764|        devLog('⚠️ [deleteBarberoFoto] Error no crítico (timeout/red/not found), continuando...')
765|        return
766|      }
767|      throw error
768|    }
769|  },
770|
771|  // Storage - Subir imagen de servicio
772|  uploadServicioFoto: async (file: File, servicioId: string) => {
773|    try {
774|      // Validar tipo de archivo
775|      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
776|      if (!validTypes.includes(file.type)) {
777|        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
778|      }
779|
780|      // Validar tamaño (5MB máximo)
781|      const maxSize = 5 * 1024 * 1024 // 5MB
782|      if (file.size > maxSize) {
783|        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
784|      }
785|
786|      // Generar nombre único para el archivo
787|      const fileExt = file.name.split('.').pop()
788|      const fileName = `${servicioId}-${Date.now()}.${fileExt}`
789|      const filePath = `${fileName}`
790|
791|      devLog('📤 [uploadServicioFoto] Subiendo archivo:', fileName)
792|
793|      // Subir archivo a Supabase Storage
794|      const { data, error } = await supabase.storage
795|        .from('servicios-fotos')
796|        .upload(filePath, file, {
797|          cacheControl: '3600',
798|          upsert: false
799|        })
800|
801|      if (error) {
802|        console.error('❌ [uploadServicioFoto] Error subiendo:', error)
803|        throw error
804|      }
805|
806|      devLog('✅ [uploadServicioFoto] Archivo subido:', data.path)
807|
808|      // Obtener URL pública
809|      const { data: urlData } = supabase.storage
810|        .from('servicios-fotos')
811|        .getPublicUrl(data.path)
812|
813|      devLog('🔗 [uploadServicioFoto] URL pública:', urlData.publicUrl)
814|
815|      return {
816|        path: data.path,
817|        publicUrl: urlData.publicUrl
818|      }
819|    } catch (error: any) {
820|      console.error('❌ [uploadServicioFoto] Error:', error)
821|      throw error
822|    }
823|  },
824|
825|  // Storage - Eliminar imagen de servicio
826|  deleteServicioFoto: async (filePath: string) => {
827|    try {
828|      devLog('🗑️ [deleteServicioFoto] Eliminando archivo:', filePath)
829|
830|      const { error } = await supabase.storage
831|        .from('servicios-fotos')
832|        .remove([filePath])
833|
834|      if (error) {
835|        console.error('❌ [deleteServicioFoto] Error eliminando:', error)
836|        throw error
837|      }
838|
839|      devLog('✅ [deleteServicioFoto] Archivo eliminado')
840|    } catch (error: any) {
841|      console.error('❌ [deleteServicioFoto] Error:', error)
842|      // No lanzar error si el archivo no existe
843|      if (error.message?.includes('not found')) {
844|        devLog('⚠️ [deleteServicioFoto] Archivo no encontrado, continuando...')
845|        return
846|      }
847|      throw error
848|    }
849|  },
850|
851|  // Storage - Subir imagen de producto
852|  uploadProductoFoto: async (file: File, productoId: string) => {
853|    try {
854|      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
855|      if (!validTypes.includes(file.type)) {
856|        throw new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
857|      }
858|
859|      const maxSize = 5 * 1024 * 1024
860|      if (file.size > maxSize) {
861|        throw new Error('La imagen es muy grande. Tamaño máximo: 5MB')
862|      }
863|
864|      const fileExt = file.name.split('.').pop()
865|      const fileName = `${productoId}-${Date.now()}.${fileExt}`
866|      const filePath = `${fileName}`
867|
868|      devLog('📤 [uploadProductoFoto] Subiendo archivo:', fileName)
869|
870|      const { data, error } = await supabase.storage
871|        .from('productos-fotos')
872|        .upload(filePath, file, {
873|          cacheControl: '3600',
874|          upsert: false
875|        })
876|
877|      if (error) {
878|        console.error('❌ [uploadProductoFoto] Error subiendo:', error)
879|        throw error
880|      }
881|
882|      devLog('✅ [uploadProductoFoto] Archivo subido:', data.path)
883|
884|      const { data: urlData } = supabase.storage
885|        .from('productos-fotos')
886|        .getPublicUrl(data.path)
887|
888|      devLog('🔗 [uploadProductoFoto] URL pública:', urlData.publicUrl)
889|
890|      return {
891|        path: data.path,
892|        publicUrl: urlData.publicUrl
893|      }
894|    } catch (error: any) {
895|      console.error('❌ [uploadProductoFoto] Error:', error)
896|      throw error
897|    }
898|  },
899|
900|  // Storage - Eliminar imagen de producto
901|  deleteProductoFoto: async (filePath: string) => {
902|    try {
903|      devLog('🗑️ [deleteProductoFoto] Eliminando archivo:', filePath)
904|
905|      const { error } = await supabase.storage
906|        .from('productos-fotos')
907|        .remove([filePath])
908|
909|      if (error) {
910|        console.error('❌ [deleteProductoFoto] Error eliminando:', error)
911|        throw error
912|      }
913|
914|      devLog('✅ [deleteProductoFoto] Archivo eliminado')
915|    } catch (error: any) {
916|      console.error('❌ [deleteProductoFoto] Error:', error)
917|      if (error.message?.includes('not found')) {
918|        devLog('⚠️ [deleteProductoFoto] Archivo no encontrado, continuando...')
919|        return
920|      }
921|      throw error
922|    }
923|  },
924|
925|  // Storage - Subir foto de resultado de corte
926|  uploadCorteFoto: async (file: File, citaId: string) => {
927|    try {
928|      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
929|      if (!validTypes.includes(file.type)) {
930|        throw new Error('Solo se permiten imágenes (JPG, PNG, WEBP)')
931|      }
932|
933|      const fileExt = file.name.split('.').pop()
934|      const fileName = `${citaId}-${Date.now()}.${fileExt}`
935|      const filePath = `${fileName}`
936|
937|      const { data, error } = await supabase.storage
938|        .from('cortes')
939|        .upload(filePath, file)
940|
941|      if (error) throw error
942|
943|      const { data: urlData } = supabase.storage
944|        .from('cortes')
945|        .getPublicUrl(data.path)
946|
947|      return {
948|        path: data.path,
949|        publicUrl: urlData.publicUrl
950|      }
951|    } catch (error: any) {
952|      console.error('❌ [uploadCorteFoto] Error:', error)
953|      throw error
954|    }
955|  },
956|
957|  // Cierres de Caja
958|  getCierresCaja: async (limit: number = 30) => {
959|    const { data, error } = await supabase
960|      .from('cierres_caja')
961|      .select('*')
962|      .order('fecha_inicio', { ascending: false })
963|      .limit(limit)
964|
965|    if (error) throw error
966|    return data
967|  },
968|
969|  getCierreCajaPorRango: async (fechaInicio: string, fechaFin: string) => {
970|    const { data, error } = await supabase
971|      .from('cierres_caja')
972|      .select('*')
973|      .eq('fecha_inicio', fechaInicio)
974|      .eq('fecha_fin', fechaFin)
975|      .maybeSingle()
976|
977|    if (error) throw error
978|    return data
979|  },
980|
981|  crearCierreCaja: async (cierre: any) => {
982|    const { data, error } = await db
983|      .from('cierres_caja')
984|      .insert([cierre])
985|      .select()
986|      .single()
987|
988|    if (error) throw error
989|    return data
990|  },
991|
992|  updateCierreCaja: async (id: string, updates: any) => {
993|    const { data, error } = await db
994|      .from('cierres_caja')
995|      .update(updates)
996|      .eq('id', id)
997|      .select()
998|      .single()
999|
1000|    if (error) throw error
1001|    return data
1002|  },
1003|
1004|  // Extensiones para POS y Cierre de Caja
1005|  getCitasHoyPendientes: async () => {
1006|    const hoy = new Intl.DateTimeFormat('es-CL', {
1007|      timeZone: 'America/Santiago',
1008|      year: 'numeric',
1009|      month: '2-digit',
1010|      day: '2-digit',
1011|    }).formatToParts(new Date()).filter(p => p.type !== 'literal').reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {} as any);
1012|
1013|    const hoyStr = `${hoy.year}-${hoy.month}-${hoy.day}`;
1014|
1015|    const { data, error } = await supabase
1016|      .from('citas')
1017|      .select(`
1018|        *,
1019|        barberos (nombre, apellido),
1020|        servicios (nombre, precio, duracion_minutos)
1021|      `)
1022|      .eq('fecha', hoyStr)
1023|      .eq('estado_pago', 'pendiente')
1024|      .in('estado', ['confirmada', 'completada'])
1025|      .order('hora')
1026|
1027|    if (error) throw error
1028|    return data || []
1029|  },
1030|
1031|  getFacturasSinCierre: async (fechaInicio: string, fechaFin: string) => {
1032|    const { data, error } = await supabase
1033|      .from('facturas')
1034|      .select('*')
1035|      .gte('created_at', `${fechaInicio}T00:00:00`)
1036|      .lte('created_at', `${fechaFin}T23:59:59`)
1037|      .is('cierre_caja_id', null)
1038|      .eq('anulada', false)
1039|
1040|    if (error) throw error
1041|    return data || []
1042|  },
1043|
1044|  vincularFacturasACierre: async (facturaIds: string[], cierreCajaId: string) => {
1045|    const { data, error } = await db
1046|      .from('facturas')
1047|      .update({ cierre_caja_id: cierreCajaId })
1048|      .in('id', facturaIds)
1049|      .select()
1050|
1051|    if (error) throw error
1052|    return data
1053|  },
1054|
1055|  // =====================================================
1056|  // INVENTARIO - Productos y Movimientos
1057|  // =====================================================
1058|
1059|  getProductos: async (soloActivos: boolean = true) => {
1060|    let query = supabase.from('productos').select('*').order('nombre')
1061|    if (soloActivos) query = query.eq('activo', true)
1062|    const { data, error } = await query
1063|    if (error) throw error
1064|    return data || []
1065|  },
1066|
1067|  getProducto: async (id: string) => {
1068|    const { data, error } = await supabase
1069|      .from('productos')
1070|      .select('*')
1071|      .eq('id', id)
1072|      .single()
1073|    if (error) throw error
1074|    return data
1075|  },
1076|
1077|  createProducto: async (producto: any) => {
1078|    const { data, error } = await db
1079|      .from('productos')
1080|      .insert([producto])
1081|      .select()
1082|      .single()
1083|    if (error) throw error
1084|    return data
1085|  },
1086|
1087|  updateProducto: async (id: string, updates: any) => {
1088|    const { data, error } = await db
1089|      .from('productos')
1090|      .update(updates)
1091|      .eq('id', id)
1092|      .select()
1093|      .single()
1094|    if (error) throw error
1095|    return data
1096|  },
1097|
1098|  getProductosConStockBajo: async () => {
1099|    const { data, error } = await db
1100|      .from('productos')
1101|      .select('*')
1102|      .eq('activo', true)
1103|      .filter('stock_actual', 'lte', 'stock_minimo')
1104|      .order('stock_actual')
1105|    if (error) throw error
1106|    return data || []
1107|  },
1108|
1109|  getMovimientosInventario: async (productoId?: string, limit: number = 50) => {
1110|    let query = db
1111|      .from('inventario_movimientos')
1112|      .select('*, productos(nombre)')
1113|      .order('created_at', { ascending: false })
1114|      .limit(limit)
1115|    if (productoId) query = query.eq('producto_id', productoId)
1116|    const { data, error } = await query
1117|    if (error) throw error
1118|    return data || []
1119|  },
1120|
1121|  registrarMovimientoInventario: async (
1122|    productoId: string,
1123|    tipo: 'entrada' | 'salida' | 'ajuste',
1124|    cantidad: number,
1125|    motivo?: string,
1126|    referenciaId?: string,
1127|    createdBy?: string
1128|  ) => {
1129|    const { data: producto, error: fetchError } = await db
1130|      .from('productos')
1131|      .select('stock_actual')
1132|      .eq('id', productoId)
1133|      .single()
1134|
1135|    if (fetchError) throw fetchError
1136|
1137|    const stockAnterior = producto.stock_actual
1138|    let stockNuevo = stockAnterior
1139|
1140|    if (tipo === 'entrada') stockNuevo = stockAnterior + cantidad
1141|    else if (tipo === 'salida') stockNuevo = stockAnterior - cantidad
1142|    else stockNuevo = cantidad
1143|
1144|    const { error: movError } = await db
1145|      .from('inventario_movimientos')
1146|      .insert([{
1147|        producto_id: productoId,
1148|        tipo,
1149|        cantidad,
1150|        stock_anterior: stockAnterior,
1151|        stock_nuevo: stockNuevo,
1152|        motivo: motivo || null,
1153|        referencia_id: referenciaId || null,
1154|        created_by: createdBy || null,
1155|      }])
1156|
1157|    if (movError) throw movError
1158|
1159|    const { error: updateError } = await db
1160|      .from('productos')
1161|      .update({ stock_actual: stockNuevo })
1162|      .eq('id', productoId)
1163|
1164|    if (updateError) throw updateError
1165|
1166|    return { stockAnterior, stockNuevo }
1167|  }
1168|}
1169|