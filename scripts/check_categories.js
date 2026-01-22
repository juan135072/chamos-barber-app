// Este script es solo para referencia, la consulta real debe hacerse en Supabase Dashboard
console.log(`
Para verificar las categorías de los servicios, ejecuta en Supabase SQL Editor:

SELECT DISTINCT categoria FROM servicios ORDER BY categoria;

Esto mostrará todas las categorías únicas que están guardadas en la tabla servicios.
Si ves "Barba" (mayúscula) en vez de "barbas" (minúsculas), ese es el problema.
`);
