
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son necesarios.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log('--- Diagnóstico de Facturas ---');

    const { data: facturas, error } = await supabase
        .from('facturas')
        .select('id, total, comision_barbero, ingreso_casa, porcentaje_comision, barbero_id, created_at')
        .eq('anulada', false)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error al obtener facturas:', error);
        return;
    }

    let totalMismatches = 0;
    let totalPctMismatches = 0;

    facturas.forEach(f => {
        const sum = Number(f.comision_barbero) + Number(f.ingreso_casa);
        const diff = Math.abs(sum - Number(f.total));

        const expectedComision = Number(f.total) * Number(f.porcentaje_comision) / 100;
        const pctDiff = Math.abs(Number(f.comision_barbero) - expectedComision);

        if (diff > 0.01) {
            console.log(`[MISMATCH SUMA] ID: ${f.id} | Total: ${f.total} | Suma (C+I): ${sum} | Dif: ${diff.toFixed(2)}`);
            totalMismatches++;
        }

        if (pctDiff > 0.01) {
            const realPct = (Number(f.comision_barbero) / Number(f.total)) * 100;
            console.log(`[MISMATCH %] ID: ${f.id} | Total: ${f.total} | Comision: ${f.comision_barbero} | % Esperado: ${f.porcentaje_comision}% | % Real: ${realPct.toFixed(2)}%`);
            totalPctMismatches++;
        }
    });

    console.log('\n--- Resumen ---');
    console.log(`Total facturas revisadas: ${facturas.length}`);
    console.log(`Mismatches de suma (C+I != Total): ${totalMismatches}`);
    console.log(`Mismatches de porcentaje (Comision != Total * %): ${totalPctMismatches}`);
}

diagnose();
