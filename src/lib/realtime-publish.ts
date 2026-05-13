/**
 * Helpers para publicar eventos realtime cuando una cita cambia.
 *
 * InsForge realtime es pub/sub estilo Socket.io — no captura cambios de DB
 * automáticamente como Supabase. Cada writer (API route o componente cliente)
 * debe llamar `publishCitaChange()` después de un INSERT/UPDATE/DELETE para
 * que las pantallas suscritas (useCitasRealtime, CitasSection) lo reciban.
 *
 * Convención de canales:
 *   citas:barbero:<barbero_uuid>     — el barbero ve sus propias citas
 *   citas:comercio:<comercio_uuid>   — el admin ve todas las del comercio
 *
 * Cualquier writer publica al MISMO evento llamado 'change' en ambos canales.
 * Los listeners reciben el payload con la cita afectada + eventType.
 *
 * Nota: este helper acepta cualquier client estilo Supabase (browser o SSR);
 * lee la instancia InsForge subyacente vía `_insforge`.
 */

export type CitaChangeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

export interface CitaChangePayload {
    eventType: CitaChangeEventType
    new?: Record<string, any> | null
    old?: Record<string, any> | null
    /** ID rapido sin tener que mirar new/old */
    cita_id: string
    /** Para que el suscriptor decida si lo afecta sin llamar la DB */
    barbero_id: string | null
    comercio_id: string | null
}

/**
 * Publica un cambio de cita en los canales `barbero` y `comercio`.
 * Errores se loggean pero NO se propagan — la operación principal (insert/
 * update) ya tuvo éxito; un fallo de notificación no debe romperla.
 */
export async function publishCitaChange(
    client: any,
    eventType: CitaChangeEventType,
    cita: { id: string; barbero_id: string | null; comercio_id: string | null; [k: string]: any },
    oldRow?: Record<string, any> | null
): Promise<void> {
    const insforge = client?._insforge
    if (!insforge?.realtime) {
        console.warn('[realtime] client has no _insforge.realtime — skipping publish')
        return
    }

    const payload: CitaChangePayload = {
        eventType,
        new: eventType === 'DELETE' ? null : cita,
        old: oldRow ?? null,
        cita_id: cita.id,
        barbero_id: cita.barbero_id ?? oldRow?.barbero_id ?? null,
        comercio_id: cita.comercio_id ?? oldRow?.comercio_id ?? null,
    }

    const channels: string[] = []
    if (payload.barbero_id) channels.push(`citas:barbero:${payload.barbero_id}`)
    if (payload.comercio_id) channels.push(`citas:comercio:${payload.comercio_id}`)
    if (channels.length === 0) return

    await Promise.allSettled(
        channels.map((ch) =>
            insforge.realtime.publish(ch, 'change', payload).catch((err: unknown) => {
                console.warn(`[realtime] publish to ${ch} failed:`, err)
            })
        )
    )
}
