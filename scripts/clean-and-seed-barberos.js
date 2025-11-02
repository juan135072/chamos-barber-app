const https = require('https');

const supabaseUrl = 'https://supabase.chamosbarber.com';
const supabaseServiceKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0';

function supabaseRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, supabaseUrl);
    
    const options = {
      method: method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (data) {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
            }
          } else {
            resolve({ success: true, statusCode: res.statusCode });
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function cleanAndSeedBarberos() {
  console.log('🧹 LIMPIEZA Y SEED DE BARBEROS\n');

  try {
    // 1. CONTAR BARBEROS ACTUALES
    console.log('📊 Contando barberos actuales...');
    const currentBarberos = await supabaseRequest('GET', '/rest/v1/barberos?select=count');
    console.log(`   Barberos actuales: ${currentBarberos.length || 0}`);

    // 2. ELIMINAR TODOS LOS BARBEROS (obtener IDs primero)
    console.log('\n🗑️  Eliminando todos los barberos...');
    const allBarberos = await supabaseRequest('GET', '/rest/v1/barberos?select=id');
    
    if (allBarberos.length > 0) {
      for (const barbero of allBarberos) {
        await supabaseRequest('DELETE', `/rest/v1/barberos?id=eq.${barbero.id}`);
      }
      console.log(`   ✅ ${allBarberos.length} barberos eliminados`);
    } else {
      console.log('   ℹ️  No hay barberos para eliminar');
    }

    // 3. VERIFICAR QUE ESTÉN ELIMINADOS
    const afterDelete = await supabaseRequest('GET', '/rest/v1/barberos?select=count');
    console.log(`   Verificación: ${afterDelete.length || 0} barberos restantes`);

    // 4. INSERTAR 4 BARBEROS LIMPIOS
    console.log('\n📝 Insertando 4 barberos nuevos...');
    const barberosData = [
      {
        nombre: 'Carlos',
        apellido: 'Mendoza',
        email: 'carlos.mendoza@chamosbarber.com',
        telefono: '+56912345671',
        especialidad: 'Cortes modernos y degradados',
        experiencia_anos: 8,
        calificacion: 4.9,
        descripcion: 'Especialista en cortes modernos y estilos urbanos. Con más de 8 años de experiencia, Carlos se destaca por su precisión en degradados y cortes fade.',
        imagen_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
        instagram: '@carlos_barber_cl',
        activo: true,
        orden_display: 1
      },
      {
        nombre: 'Miguel',
        apellido: 'Torres',
        email: 'miguel.torres@chamosbarber.com',
        telefono: '+56912345672',
        especialidad: 'Barbas y perfilado',
        experiencia_anos: 6,
        calificacion: 4.8,
        descripcion: 'Experto en el arte del perfilado de barba y cuidado facial masculino. Miguel combina técnicas tradicionales con estilos contemporáneos.',
        imagen_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
        instagram: '@miguel_barba_pro',
        activo: true,
        orden_display: 2
      },
      {
        nombre: 'Diego',
        apellido: 'Ramírez',
        email: 'diego.ramirez@chamosbarber.com',
        telefono: '+56912345673',
        especialidad: 'Estilos clásicos y afeitado',
        experiencia_anos: 10,
        calificacion: 5.0,
        descripcion: 'Maestro barbero con una década de experiencia. Diego es reconocido por su dominio de técnicas clásicas de afeitado con navaja.',
        imagen_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
        instagram: '@diego_classic_barber',
        activo: true,
        orden_display: 3
      },
      {
        nombre: 'Andrés',
        apellido: 'Silva',
        email: 'andres.silva@chamosbarber.com',
        telefono: '+56912345674',
        especialidad: 'Cortes infantiles y familiares',
        experiencia_anos: 5,
        calificacion: 4.7,
        descripcion: 'Especializado en cortes para niños y familias. Andrés tiene una habilidad especial para trabajar con los más pequeños.',
        imagen_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',
        instagram: '@andres_family_cuts',
        activo: true,
        orden_display: 4
      }
    ];

    const barberos = await supabaseRequest('POST', '/rest/v1/barberos', barberosData);
    console.log(`   ✅ ${barberos.length} barberos insertados`);

    // 5. VERIFICAR RESULTADO FINAL
    console.log('\n🔍 Verificación final...');
    const finalBarberos = await supabaseRequest('GET', '/rest/v1/barberos?select=id,nombre,apellido,especialidad,orden_display&order=orden_display');
    
    console.log('\n📋 Barberos en la base de datos:');
    finalBarberos.forEach(b => {
      console.log(`   ${b.orden_display}. ${b.nombre} ${b.apellido} - ${b.especialidad}`);
    });

    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('✅ Visita: https://chamosbarber.com/equipo');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

cleanAndSeedBarberos();
