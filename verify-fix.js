
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function verify() {
    console.log('🧪 Starting final verification...');

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    try {
        const { data: s } = await supabase.from('servicios').select('id, nombre, precio').eq('activo', true).limit(1);
        const { data: b } = await supabase.from('barberos').select('id, nombre').eq('activo', true).limit(1);

        if (!s?.[0] || !b?.[0]) {
            console.error('❌ Could not find active services or barbers for testing');
            return;
        }

        const testCita = {
            servicio_id: s[0].id,
            barbero_id: b[0].id,
            fecha: '2026-12-31', // Future date
            hora: '10:00',
            cliente_nombre: 'VERIFICATION TEST',
            cliente_telefono: '+123456789',
            estado: 'pendiente',
            items: [{ servicio_id: s[0].id, nombre: s[0].nombre, precio: s[0].precio, cantidad: 1, subtotal: s[0].precio }],
            precio_final: s[0].precio,
            metodo_pago: 'efectivo'
        };

        console.log('📝 Attempting insert with ALL fields...');
        const { data: inserted, error: insertError } = await supabase
            .from('citas')
            .insert([testCita])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Verification FAILED:', insertError.message);
            console.error('Code:', insertError.code);
        } else {
            console.log('✅ Verification SUCCESSFUL! Entry ID:', inserted.id);

            // Cleanup
            await supabase.from('citas').delete().eq('id', inserted.id);
            console.log('🗑️ Test entry cleaned up.');
        }
    } catch (err) {
        console.error('❌ Unexpected error during verification:', err);
    }
}

verify();
