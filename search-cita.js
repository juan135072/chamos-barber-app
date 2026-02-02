
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function findCita() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    const phoneSearch = '984568747';
    console.log(`🔍 Searching for appointments with phone containing: ${phoneSearch}`);

    try {
        const { data: citas, error } = await supabase
            .from('citas')
            .select('*')
            .or(`cliente_telefono.ilike.%${phoneSearch}%,cliente_nombre.ilike.%Juan%`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Search error:', error.message);
            return;
        }

        if (citas.length === 0) {
            console.log('⚠️ No appointments found.');
        } else {
            console.log(`✅ Found ${citas.length} appointments:`);
            citas.forEach(c => {
                console.log(`- ID: ${c.id}, Status: ${c.estado}, Date: ${c.fecha} ${c.hora}, Name: ${c.cliente_nombre}, Phone: ${c.cliente_telefono}`);
            });
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

findCita();
