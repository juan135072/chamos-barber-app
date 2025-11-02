const https = require('https');

const supabaseUrl = 'https://supabase.chamosbarber.com';
const supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTI2Nzc4MCwiZXhwIjo0OTE2OTQxMzgwLCJyb2xlIjoiYW5vbiJ9.cE6BYGcPB6HC4vacIQB-Zabf4EKfVJ7x7ViZ4CIASJA';

function testAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'supabase.chamosbarber.com',
      path: '/rest/v1/barberos?select=*&activo=eq.true&order=orden_display',
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`\n📡 Status Code: ${res.statusCode}`);
        console.log(`📋 Headers:`, JSON.stringify(res.headers, null, 2));
        console.log(`\n📦 Response Body:`);
        
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            console.log(`✅ Se obtuvieron ${parsed.length} barberos:`);
            parsed.forEach(b => {
              console.log(`   - ${b.nombre} ${b.apellido} (${b.especialidad})`);
            });
          } else {
            console.log('❌ Respuesta no es un array:', JSON.stringify(parsed, null, 2));
          }
        } catch (e) {
          console.log('❌ Error parseando JSON:', data);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error de conexión:', error.message);
      reject(error);
    });

    req.end();
  });
}

console.log('🧪 PRUEBA DE API DE BARBEROS');
console.log('============================\n');
console.log(`🔗 URL: ${supabaseUrl}`);
console.log(`🔑 Usando ANON Key (como el frontend)\n`);

testAPI().catch(console.error);
