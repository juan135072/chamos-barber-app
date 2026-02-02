
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

async function listRecent() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    console.log(`🔍 Listing last 10 appointments...`);

    try {
        const { data: citas, error } = await supabase
            .from('citas')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('❌ Search error:', error.message);
            return;
        }

        citas.forEach(c => {
            console.log(`- CreatedAt: ${c.created_at}, ID: ${c.id}, Status: ${c.estado}, Date: ${c.fecha} ${c.hora}, Name: ${c.cliente_nombre}, Phone: ${c.cliente_telefono}`);
        });
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

listRecent();
