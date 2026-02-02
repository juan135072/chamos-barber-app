
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function findAiCitas() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    const today = new Date().toISOString().split('T')[0];
    console.log(`🔍 Searching for AI appointments created today (${today})...`);

    try {
        const { data: citas, error } = await supabase
            .from('citas')
            .select('*')
            .ilike('notas', '%RESERVA WHATSAPP/IA%')
            .gte('created_at', today)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Search error:', error.message);
            return;
        }

        if (citas.length === 0) {
            console.log('⚠️ No AI appointments found for today.');
        } else {
            console.log(`✅ Found ${citas.length} AI appointments:`);
            citas.forEach(c => {
                console.log(`- CreatedAt: ${c.created_at}, ID: ${c.id}, Status: ${c.estado}, Date: ${c.fecha} ${c.hora}, Name: ${c.cliente_nombre}, Phone: ${c.cliente_telefono}`);
            });
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

findAiCitas();
