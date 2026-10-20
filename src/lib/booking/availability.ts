export interface Slot {
  hora: string
  disponible: boolean
  motivo?: string
}

/**
 * Asks the database for a barber's slots with the same rules as the booking
 * calendar: business hours per weekday, breaks, dated blocks, existing
 * bookings and the tenant timezone. Returns null when the database could not
 * answer, so callers never treat an outage as "no availability".
 */
export async function fetchSlots(db: any, barberoId: string, fecha: string, duracionMinutos: number): Promise<Slot[] | null> {
  const { data, error } = await db.rpc('get_horarios_disponibles', {
    p_barbero_id: barberoId,
    p_fecha: fecha,
    p_duracion_minutos: duracionMinutos,
  })
  if (error || !Array.isArray(data)) return null
  return data as Slot[]
}

export function isSlotAvailable(slots: Slot[], hora: string): boolean {
  return slots.some(slot => slot.hora === hora && slot.disponible === true)
}

export function availableHours(slots: Slot[]): string[] {
  return slots.filter(slot => slot.disponible === true).map(slot => slot.hora)
}
