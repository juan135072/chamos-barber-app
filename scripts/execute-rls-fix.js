#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://supabase.chamosbarber.com';
const SERVICE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.m1TDVPf3oa9rsoEIXN7dnFar803Cp5l-6BM_1T89Vg0';

const queries = [
  // 1. Ver políticas actuales
  `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'admin_users';`,
  
  // 2. Eliminar todas las políticas
  `DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;`,
  `DROP POLICY IF EXISTS "admin_users_authenticated_select" ON admin_users;`,
  `DROP POLICY IF EXISTS "admin_users_select_own" ON admin_users;`,
  `DROP POLICY IF EXISTS "Users can read their own admin data" ON admin_users;`,
  `DROP POLICY IF EXISTS "Admin users can read their own data" ON admin_users;`,
  `DROP POLICY IF EXISTS "Enable read access for authenticated users" ON admin_users;`,
  
  // 3. Deshabilitar RLS
  `ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;`,
  
  // 4. Habilitar RLS y crear política simple
  `ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;`,
  `CREATE POLICY "admin_users_simple_select" ON admin_users FOR SELECT TO authenticated USING (id = auth.uid());`,
  
  // 5. Verificar políticas finales
  `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'admin_users';`
];

async function executeQuery(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
    
    const options = {
      hostname: 'supabase.chamosbarber.com',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}\n`);
        resolve(data);
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

console.log('=== Ejecutando FIX para RLS Recursion ===\n');

// Ya que no podemos ejecutar SQL directamente, vamos a usar un enfoque diferente
console.log('Por favor, ejecuta este SQL manualmente en Supabase Studio:');
console.log(fs.readFileSync('./scripts/fix-rls-recursion.sql', 'utf8'));
console.log('\n=== Accede a Supabase Studio en: ===');
console.log('URL: https://supabase.chamosbarber.com/');
console.log('Password: IGnWZHipT8IeSI7j');
console.log('\nLuego ve a SQL Editor y pega el contenido del archivo fix-rls-recursion.sql');
