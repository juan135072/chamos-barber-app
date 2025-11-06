#!/usr/bin/env node

/**
 * Script para aplicar el fix de política RLS usando conexión directa a PostgreSQL
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

console.log('\n🔧 APLICANDO FIX DE POLÍTICA RLS - Conexión Directa PostgreSQL\n');
console.log('━'.repeat(60));

async function applyRLSFixPostgres() {
  const client = new Client({
    host: 'supabase.chamosbarber.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_STUDIO_PASSWORD || 'your_postgres_password',
    ssl: false // Cambiar a true si es necesario
  });

  try {
    console.log('\n1️⃣  Conectando a PostgreSQL...');
    console.log(`   Host: supabase.chamosbarber.com:5432`);
    console.log(`   Database: postgres`);
    
    await client.connect();
    console.log('✅ Conexión establecida');

    // 2. Verificar políticas actuales
    console.log('\n2️⃣  Verificando políticas RLS existentes...');
    
    const checkPolicies = await client.query(`
      SELECT policyname, cmd, roles
      FROM pg_policies 
      WHERE tablename = 'citas'
      ORDER BY policyname;
    `);
    
    console.log(`📋 Políticas encontradas: ${checkPolicies.rows.length}`);
    if (checkPolicies.rows.length > 0) {
      checkPolicies.rows.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd}) para roles: ${policy.roles}`);
      });
    }

    // 3. Verificar si ya existe la política que queremos crear
    const existingPolicy = checkPolicies.rows.find(
      p => p.policyname === 'allow_public_insert_citas'
    );

    if (existingPolicy) {
      console.log('\n⚠️  La política "allow_public_insert_citas" ya existe');
      console.log('   Saltando creación...');
    } else {
      // 4. Crear la política RLS
      console.log('\n3️⃣  Creando política RLS para INSERT público...');
      
      const createPolicySQL = `
        CREATE POLICY "allow_public_insert_citas"
        ON public.citas
        FOR INSERT
        TO anon, authenticated
        WITH CHECK (true);
      `;
      
      await client.query(createPolicySQL);
      console.log('✅ Política "allow_public_insert_citas" creada exitosamente');
    }

    // 5. Verificar políticas después de crear
    console.log('\n4️⃣  Verificando políticas después del cambio...');
    
    const finalPolicies = await client.query(`
      SELECT policyname, cmd, roles, with_check
      FROM pg_policies 
      WHERE tablename = 'citas'
      ORDER BY cmd, policyname;
    `);
    
    console.log(`📋 Políticas finales (${finalPolicies.rows.length}):`);
    finalPolicies.rows.forEach(policy => {
      console.log(`   ✅ ${policy.policyname}`);
      console.log(`      Operación: ${policy.cmd}`);
      console.log(`      Roles: ${policy.roles}`);
      if (policy.with_check) {
        console.log(`      WITH CHECK: ${policy.with_check}`);
      }
    });

    await client.end();
    
    console.log('\n✅ Fix aplicado exitosamente');
    return true;

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('connect')) {
      console.log('\n💡 SUGERENCIA:');
      console.log('   El error indica problema de conexión a PostgreSQL.');
      console.log('   Posibles causas:');
      console.log('   1. Puerto 5432 no está expuesto públicamente');
      console.log('   2. Firewall bloqueando la conexión');
      console.log('   3. Credenciales incorrectas');
      console.log('\n   SOLUCIÓN ALTERNATIVA:');
      console.log('   Ejecutar el SQL manualmente en Supabase SQL Editor:');
      console.log('   https://supabase.chamosbarber.com/project/default/sql');
    }
    
    try {
      await client.end();
    } catch (e) {
      // Ignorar error al cerrar
    }
    
    return false;
  }
}

applyRLSFixPostgres().then((success) => {
  if (success) {
    console.log('\n🎉 ¡Problema de reservas RESUELTO!');
    console.log('\n📝 Próximo paso: Probar el sistema de reservas');
    console.log('   Ejecutar: node scripts/test-crear-cita.js\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  No se pudo aplicar el fix automáticamente');
    console.log('📁 SQL manual disponible en: supabase/fix-rls-citas.sql\n');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
