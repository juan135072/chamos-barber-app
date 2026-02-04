/**
 * Utilidades para manejo de fechas centradas en la zona horaria de Chile (America/Santiago).
 * Esto evita el desfase de 3-4 horas al usar UTC (ISOString).
 */

/**
 * Obtiene un objeto Date que representa el momento exacto en la zona horaria especificada.
 */
export const getDynamicAhora = (timeZone: string = 'America/Santiago'): Date => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const p: any = {};
    parts.forEach(part => p[part.type] = part.value);

    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
};

// Mantener compatibilidad con Chile para no romper código existente de inmediato
export const getChileAhora = () => getDynamicAhora('America/Santiago');

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD ajustada a la zona horaria.
 */
export const getDynamicHoy = (timeZone: string = 'America/Santiago'): string => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const parts = formatter.formatToParts(new Date());
    const p: any = {};
    parts.forEach(part => p[part.type] = part.value);

    return `${p.year}-${p.month}-${p.day}`;
};

export const getChileHoy = () => getDynamicHoy('America/Santiago');

/**
 * Obtiene la hora actual en formato HH:mm ajustada a la zona horaria.
 */
export const getDynamicHora = (timeZone: string = 'America/Santiago'): string => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(new Date());
    const p: any = {};
    parts.forEach(part => p[part.type] = part.value);

    return `${p.hour}:${p.minute}`;
};

/**
 * Formatea una fecha a string legible según la zona horaria.
 */
export const formatFechaDynamic = (date: string | Date, timeZone: string = 'America/Santiago'): string => {
    let d: Date;

    if (typeof date === 'string' && date.includes('-') && !date.includes('T')) {
        // Es un string YYYY-MM-DD. Usamos T12:00:00 para evitar cambios de fecha inesperados
        d = new Date(`${date}T12:00:00`);
    } else {
        d = typeof date === 'string' ? new Date(date) : date;
    }

    return d.toLocaleDateString('es-CL', {
        timeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

export const formatFechaChile = (date: string | Date) => formatFechaDynamic(date, 'America/Santiago');
