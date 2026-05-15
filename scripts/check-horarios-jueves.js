const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkHorarios() {
  console.log('🔍 Verificando horarios de atención...');

  // 1. Obtener todos los barberos
  const { data: barberos, error: errBarberos } = await supabase
    .from('barberos')
    .select('id, nombre, apellido')
    .eq('activo', true);

  if (errBarberos) {
    console.error('Error obteniendo barberos:', errBarberos);
    return;
  }

  console.log(`👨‍Hs Barberos encontrados: ${barberos.length}`);

  for (const barbero of barberos) {
    console.log(`\n💈 Revisando horarios para: ${barbero.nombre} ${barbero.apellido} (ID: ${barbero.id})`);

    // 2. Obtener horarios de atención para este barbero
    const { data: horarios, error: errHorarios } = await supabase
      .from('horarios_atencion')
      .select('*')
      .eq('barbero_id', barbero.id)
      .eq('activo', true);

    if (errHorarios) {
      console.error('Error obteniendo horarios:', errHorarios);
      continue;
    }

    if (horarios.length === 0) {
      console.log('   ⚠️ No tiene horarios activos configurados.');
    } else {
      console.log('   ✅ Horarios activos:');
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      
      // Ordenar por día
      horarios.sort((a, b) => a.dia_semana - b.dia_semana);

      horarios.forEach(h => {
        console.log(`      - ${dias[h.dia_semana]} (Día ${h.dia_semana}): ${h.hora_inicio} - ${h.hora_fin}`);
      });

      // Verificar específicamente Jueves (4)
      const jueves = horarios.find(h => h.dia_semana === 4);
      if (jueves) {
        console.log('      🎯 JUEVES ESTÁ CONFIGURADO Y ACTIVO.');
      } else {
        console.log('      ❌ JUEVES NO ESTÁ CONFIGURADO O ESTÁ INACTIVO.');
      }
    }
  }
}

checkHorarios();
