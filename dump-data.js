
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: barberos } = await supabase.from('barberos').select('id, nombre, apellido').eq('activo', true);
    const { data: servicios } = await supabase.from('servicios').select('id, nombre, precio, duracion_minutos').eq('activo', true);

    console.log('--- BARBEROS ---');
    console.log(JSON.stringify(barberos, null, 2));
    console.log('--- SERVICIOS ---');
    console.log(JSON.stringify(servicios, null, 2));
}

main();
