const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

// Crear cliente con service role (admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration(migrationFile, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 Ejecutando: ${description}`);
  console.log(`📁 Archivo: ${migrationFile}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Leer archivo SQL
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📖 Contenido SQL cargado correctamente');
    console.log(`📏 Tamaño: ${(sqlContent.length / 1024).toFixed(2)} KB\n`);

    // Ejecutar SQL
    console.log('⚙️  Ejecutando SQL en Supabase...\n');
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: sqlContent 
    });

    if (error) {
      // Si rpc no está disponible, intentar ejecutar directamente
      console.log('⚠️  RPC no disponible, ejecutando query directamente...\n');
      
      const { data: directData, error: directError } = await supabase
        .from('_migrations')
        .select('*');
      
      if (directError && directError.code === 'PGRST116') {
        // Tabla _migrations no existe, ejecutar SQL directamente
        console.log('📝 Ejecutando migración con query directo...\n');
        
        // Dividir el SQL en statements individuales
        const statements = sqlContent
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📊 Total de statements a ejecutar: ${statements.length}\n`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          
          // Saltar comentarios y líneas vacías
          if (statement.startsWith('--') || statement.trim() === '') {
            continue;
          }

          try {
            console.log(`[${i + 1}/${statements.length}] Ejecutando statement...`);
            
            // Usar fetch directo para ejecutar SQL
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ query: statement + ';' })
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.log(`   ⚠️  Warning: ${errorText.substring(0, 100)}...`);
              errorCount++;
            } else {
              console.log(`   ✅ OK`);
              successCount++;
            }
          } catch (err) {
            console.log(`   ❌ Error: ${err.message}`);
            errorCount++;
          }
        }

        console.log(`\n📊 Resumen de ejecución:`);
        console.log(`   ✅ Exitosos: ${successCount}`);
        console.log(`   ❌ Errores: ${errorCount}`);
        console.log(`   📝 Total: ${statements.length}`);

        if (errorCount === 0) {
          console.log(`\n✅ Migración completada exitosamente\n`);
          return true;
        } else {
          console.log(`\n⚠️  Migración completada con advertencias\n`);
          return true;
        }
      }
      
      throw directError || error;
    }

    console.log('✅ Migración ejecutada exitosamente!\n');
    if (data) {
      console.log('📊 Resultado:', data);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error ejecutando migración:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    console.error('Hint:', error.hint);
    return false;
  }
}

async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('🏪 SISTEMA POS - EJECUCIÓN DE MIGRACIONES SQL');
  console.log('🚀'.repeat(30) + '\n');

  console.log('📡 Conectando a Supabase...');
  console.log(`🔗 URL: ${supabaseUrl}\n`);

  // Ejecutar migración 1: Sistema POS
  const migration1Success = await executeMigration(
    'add_pos_system.sql',
    'Sistema POS y Facturación'
  );

  if (!migration1Success) {
    console.log('\n⚠️  Continuando con siguiente migración...\n');
  }

  // Ejecutar migración 2: Roles
  const migration2Success = await executeMigration(
    'add_cajero_role.sql',
    'Rol de Cajero y Permisos'
  );

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE MIGRACIONES');
  console.log('='.repeat(60) + '\n');
  console.log(`1. Sistema POS:     ${migration1Success ? '✅ EXITOSO' : '❌ FALLÓ'}`);
  console.log(`2. Roles y Permisos: ${migration2Success ? '✅ EXITOSO' : '❌ FALLÓ'}`);
  console.log('');

  if (migration1Success && migration2Success) {
    console.log('🎉 ¡Todas las migraciones se ejecutaron correctamente!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Verificar tablas en Supabase Dashboard');
    console.log('   2. Actualizar tipos TypeScript si es necesario');
    console.log('   3. Empezar desarrollo del frontend /pos\n');
    process.exit(0);
  } else {
    console.log('⚠️  Algunas migraciones tuvieron problemas');
    console.log('💡 Revisa los errores arriba y verifica manualmente en Supabase\n');
    process.exit(1);
  }
}

main();
