#!/usr/bin/env node

/**
 * Abre Supabase Studio en el navegador por defecto
 */

const { exec } = require('child_process');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const STUDIO_URL = `${SUPABASE_URL}/`;
const PASSWORD = process.env.SUPABASE_STUDIO_PASSWORD;

console.log('\n🎨 Abriendo Supabase Studio...');
console.log('='.repeat(60));
console.log(`🔗 URL: ${STUDIO_URL}`);
console.log(`🔑 Password: ${PASSWORD}`);
console.log('='.repeat(60));
console.log('\n💡 Tip: Puedes acceder a:');
console.log('  📊 Table Editor - Ver y editar tablas');
console.log('  🔍 SQL Editor - Ejecutar queries SQL');
console.log('  📈 Database - Ver schema y relaciones');
console.log('  🔐 Authentication - Gestionar usuarios');
console.log('  🗄️ Storage - Gestionar archivos\n');

// Intentar abrir en el navegador
const openCommand = process.platform === 'darwin' ? 'open' : 
                   process.platform === 'win32' ? 'start' : 'xdg-open';

exec(`${openCommand} ${STUDIO_URL}`, (error) => {
  if (error) {
    console.log('⚠️ No se pudo abrir automáticamente el navegador');
    console.log(`📋 Copia esta URL manualmente: ${STUDIO_URL}\n`);
  } else {
    console.log('✅ Studio abierto en el navegador\n');
  }
});
