const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('sitio_configuracion')
        .upsert(
            { clave: 'sitio_moneda', valor: 'CLP', descripcion: 'Moneda del sistema (e.g., USD, CLP, MXN)' },
            { onConflict: 'clave' }
        );

    if (error) {
        console.error('Error insertando moneda:', error);
    } else {
        console.log('Inserción de sitio_moneda correcta:', data);
    }
}

run();
