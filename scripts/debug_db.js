
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debug() {
    try {
        console.log('--- VERIFICANDO RLS ---');
        // Usamos una consulta al catálogo de Postgres vía RPC si es posible
        const { data: rlsInfo, error: rlsErr } = await supabase.rpc('check_rls_debug');
        if (rlsErr) {
            console.log('RPC check_rls_debug no existe. Intentando deducir...');
        } else {
            console.log(rlsInfo);
        }
        const adminId = '4ce7e112-12a7-4909-b922-59fa1fdafc0b';
        const comercioId = '777d45e2-8b9a-4c2d-9a3b-123456789abc';
        const fechaActual = '2026-02-03';

        console.log('--- BUSCANDO CLAVE EXISTENTE (COMO API) ---');
        const { data: claveExistente, error: buscarError } = await supabase
            .from('claves_diarias')
            .select('*')
            .eq('fecha', fechaActual)
            .eq('activa', true)
            .eq('comercio_id', comercioId)
            .maybeSingle();

        if (buscarError) {
            console.error('❌ ERROR AL BUSCAR:', buscarError);
        } else {
            console.log('🔍 CLAVE ENCONTRADA:', claveExistente);
        }

        if (!claveExistente) {
            console.log('\n--- INTENTANDO INSERCIÓN (COMO API) ---');
            const { data: result, error: insertError } = await supabase
                .from('claves_diarias')
                .insert({
                    clave: 'DEBUG-' + Math.floor(Math.random() * 1000),
                    fecha: fechaActual,
                    activa: true,
                    creada_por: adminId,
                    comercio_id: comercioId
                })
                .select()
                .single();

            if (insertError) {
                console.error('❌ ERROR AL INSERTAR:', insertError);
            } else {
                console.log('✅ INSERCIÓN EXITOSA:', result);
            }
        }

    } catch (e) {
        console.error('CRASH EN SCRIPT:', e);
    }
}

debug();
