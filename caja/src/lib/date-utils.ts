/**
 * Utilidades para manejo de fechas centradas en la zona horaria de Chile (America/Santiago).
 * Esto evita el desfase de 3-4 horas al usar UTC (ISOString).
 */

/**
 * Obtiene un objeto Date que representa el momento exacto en Santiago de Chile.
 */
export const getChileAhora = (): Date => {
    // Obtenemos el string formateado para Chile
    const santiagoStr = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
    return new Date(santiagoStr);
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD ajustada a la hora de Chile.
 */
export const getChileHoy = (): string => {
    const ahora = getChileAhora();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Obtiene un objeto Date ajustado a la medianoche de Chile (inicio del día).
 */
export const getChileInicioDia = (fechaStr?: string): Date => {
    const fecha = fechaStr || getChileHoy();
    // Interpretamos el string YYYY-MM-DD como medianoche en Chile
    // Usamos el formato local de Chile para evitar desfases de offset manuales
    const d = new Date(`${fecha}T00:00:00`);
    const santiagoStr = d.toLocaleString("en-US", { timeZone: "America/Santiago" });
    return new Date(santiagoStr);
};

/**
 * Formatea una fecha ISO o Date a string legible para Chile (ej: Lunes 18 de Enero).
 * Evita el bug de desfase de un día al procesar strings YYYY-MM-DD.
 */
export const formatFechaChile = (date: string | Date): string => {
    let d: Date;

    if (typeof date === 'string' && date.includes('-') && !date.includes('T')) {
        // Es un string YYYY-MM-DD. Le agregamos T12:00:00 para evitar que 
        // el offset de Chile (UTC-3) lo mueva al día anterior.
        d = new Date(`${date}T12:00:00`);
    } else {
        d = typeof date === 'string' ? new Date(date) : date;
    }

    return d.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
