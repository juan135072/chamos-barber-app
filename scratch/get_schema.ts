import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.chamosbarber.com';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NDg4ODI0MCwiZXhwIjo0OTIwNTYxODQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.cGGgN-wojxxeH_SAP7zAz1RjL04QXNm0vRXskYUbZ9I';

async function main() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/openapi+json'
      }
    });
    const data = await res.json();
    fs.writeFileSync('scratch/schema.json', JSON.stringify(data, null, 2));
    console.log('Schema saved to scratch/schema.json');
    console.log('Tables found:');
    if (data.definitions) {
      Object.keys(data.definitions).forEach(table => console.log('- ' + table));
    }
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

main();
