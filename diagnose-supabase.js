
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function diagnose() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    try {
        const { data: s } = await supabase.from('servicios').select('id').limit(1);
        const { data: b } = await supabase.from('barberos').select('id').limit(1);

        const testCita = {
            servicio_id: s[0].id,
            barbero_id: b[0].id,
            fecha: '2025-01-01',
            hora: '00:00',
            cliente_nombre: 'DIAGNOSTIC TEST',
            cliente_telefono: '+000000000',
            estado: 'pendiente',
            foto_resultado_url: 'test.jpg',
            notas_tecnicas: 'test'
        };

        const { error: insertError } = await supabase.from('citas').insert([testCita]).select().single();

        if (insertError) {
            console.log(`❌ Additional columns test failed: ${insertError.message} (${insertError.code})`);
        } else {
            console.log('✅ Additional columns exist!');
            await supabase.from('citas').delete().eq('cliente_nombre', 'DIAGNOSTIC TEST');
        }
    } catch (err) { console.error(err); }
}
diagnose();
