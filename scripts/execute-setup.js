#!/usr/bin/env node

/**
 * Script para ejecutar el setup completo del sistema de roles
 * Ejecuta SQL y crea usuarios usando Supabase Admin API
 */

const https = require('https');

const SUPABASE_URL = 'https://supabase.chamosbarber.com';
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0';

console.log('════════════════════════════════════════════════════════════════');
console.log('  🚀 SETUP AUTOMÁTICO - SISTEMA DE ROLES');
console.log('════════════════════════════════════════════════════════════════\n');

// ============================================
// PASO 1: Crear usuarios en Supabase Auth
// ============================================

const barberos = [
  { email: 'carlos@chamosbarber.com', name: 'Carlos Ramírez' },
  { email: 'miguel@chamosbarber.com', name: 'Miguel Torres' },
  { email: 'luis@chamosbarber.com', name: 'Luis Mendoza' },
  { email: 'jorge@chamosbarber.com', name: 'Jorge Silva' }
];

const PASSWORD = 'Temporal123!';

async function createUser(email, name) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: name
      }
    });

    const options = {
      hostname: 'supabase.chamosbarber.com',
      port: 443,
      path: '/auth/v1/admin/users',
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.id) {
            console.log(`✅ Usuario creado: ${email}`);
            resolve(response);
          } else if (body.includes('already') || body.includes('exists')) {
            console.log(`⚠️  Usuario ya existe: ${email}`);
            resolve({ email, exists: true });
          } else {
            console.log(`⚠️  Respuesta para ${email}:`, body);
            resolve(response);
          }
        } catch (error) {
          console.error(`❌ Error parseando respuesta para ${email}:`, error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Error creando usuario ${email}:`, error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  👥 PASO 1: Creando usuarios en Supabase Auth');
  console.log('════════════════════════════════════════════════════════════════\n');

  for (const barbero of barberos) {
    try {
      await createUser(barbero.email, barbero.name);
      // Esperar 1 segundo entre creaciones para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error con ${barbero.email}:`, error.message);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  ✅ PROCESO COMPLETADO');
  console.log('════════════════════════════════════════════════════════════════\n');

  console.log('📝 CREDENCIALES CREADAS:\n');
  console.log('✂️  BARBEROS:');
  barberos.forEach(b => {
    console.log(`   ${b.name}: ${b.email} / ${PASSWORD}`);
  });

  console.log('\n⚠️  PRÓXIMOS PASOS:');
  console.log('1. Ve a Supabase Studio: https://supabase.chamosbarber.com');
  console.log('2. Navega a: SQL Editor');
  console.log('3. Ejecuta el contenido de: scripts/setup-roles-system.sql');
  console.log('4. Ejecuta el contenido de: scripts/associate-barberos-users.sql');
  console.log('5. ¡Listo! Prueba con: carlos@chamosbarber.com / Temporal123!\n');
}

main().catch(console.error);
