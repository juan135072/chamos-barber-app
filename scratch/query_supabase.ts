import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.chamosbarber.com';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NDg4ODI0MCwiZXhwIjo0OTIwNTYxODQwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.cGGgN-wojxxeH_SAP7zAz1RjL04QXNm0vRXskYUbZ9I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.error('Please provide a command: rpc, select, insert, update, delete');
    process.exit(1);
  }

  try {
    if (command === 'select') {
      const table = args[1];
      const limit = parseInt(args[2]) || 10;
      const { data, error } = await supabase.from(table).select('*').limit(limit);
      if (error) throw error;
      console.log(JSON.stringify(data, null, 2));
    } else if (command === 'rpc') {
      const fn = args[1];
      const params = args[2] ? JSON.parse(args[2]) : {};
      const { data, error } = await supabase.rpc(fn, params);
      if (error) throw error;
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('Command not fully implemented in this script yet. Use select <table_name> [limit]');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
