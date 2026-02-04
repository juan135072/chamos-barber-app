
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
    try {
        console.log('--- ESTRUCTURA ADMIN_USERS ---');
        const { data: user, error: err } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', 'contacto@chamosbarber.com')
            .single();

        if (err) console.error(err);
        else {
            console.log('Usuario:', user);
            console.log('Tipo de ID:', typeof user.id);
        }

        console.log('\n--- VERIFICANDO RLS ACTIVO ---');
        // No podemos verificar RLS directamente con service_role, pero 
        // lo que sí podemos hacer es ver si hay claves para ese comercio
        const { data: claves, error: errC } = await supabase
            .from('claves_diarias')
            .select('*')
            .eq('comercio_id', user.comercio_id);

        console.log('Claves para el comercio:', claves?.length || 0);

    } catch (e) {
        console.error(e);
    }
}

debug();
