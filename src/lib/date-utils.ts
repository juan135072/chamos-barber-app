/**
 * Utilidades para manejo de fechas centradas en la zona horaria de Chile (America/Santiago).
 * Esto evita el desfase de 3-4 horas al usar UTC (ISOString).
 */

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD ajustada a la hora de Chile.
 * Útil para filtrar en la base de datos y determinar "hoy".
 */
export const getChileHoy = (): string => {
    const ahora = new Date();
    const format = new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const [
        { value: day }, ,
        { value: month }, ,
        { value: year }
    ] = format.formatToParts(ahora);

    return `${year}-${month}-${day}`;
};

/**
 * Obtiene un objeto Date ajustado a la medianoche de Chile (inicio del día).
 * Útil para comparaciones gte/lte.
 */
export const getChileInicioDia = (fechaStr?: string): Date => {
    const fecha = fechaStr || getChileHoy();
    // Forzamos la interpretación como fecha local de Chile a las 00:00:00
    return new Date(`${fecha}T00:00:00-03:00`); // Nota: El offset puede variar entre -03 y -04
};

/**
 * Formatea una fecha ISO o Date a string legible para Chile.
 */
export const formatFechaChile = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
