
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente para evitar fallos de inyección
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditRoudit() {
    console.log('--- Buscando a Roudit Barreto ---');
    const { data: barberos } = await supabase.from('barberos').select('id, nombre, porcentaje_comision');
    const roudit = barberos.find(b => b.nombre.includes('ROUDIT'));

    if (!roudit) {
        console.log('No se encontró a Roudit');
        return;
    }

    console.log(`Auditoría para ${roudit.nombre} (ID: ${roudit.id})`);
    console.log(`Porcentaje configurado actualmente: ${roudit.porcentaje_comision}%`);

    const { data: facturas, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('barbero_id', roudit.id)
        .eq('anulada', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    let sumVentas = 0;
    let sumComision = 0;
    let countShort = 0;

    facturas.forEach(f => {
        const totalVenta = Number(f.comision_barbero) + Number(f.ingreso_casa);
        sumVentas += totalVenta;
        sumComision += Number(f.comision_barbero);

        const expected = totalVenta * 0.7; // Asumiendo 70%
        const diff = expected - Number(f.comision_barbero);

        if (Math.abs(diff) > 0.01) {
            console.log(`[Diferencia] ID: ${f.id} | Fecha: ${f.created_at} | Venta: ${totalVenta} | Comision: ${f.comision_barbero} | Esperado(70%): ${expected} | Faltó: ${diff}`);
            countShort++;
        }
    });

    console.log('\n--- Resumen Roudit ---');
    console.log(`Total Ventas: ${sumVentas}`);
    console.log(`Total Comision: ${sumComision}`);
    console.log(`Registros con diferencia: ${countShort}`);
}

auditRoudit();
