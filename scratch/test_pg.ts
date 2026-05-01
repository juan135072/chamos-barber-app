import { Client } from 'pg';

const connectionString = 'postgres://postgres:p40XTbBvXvP6oqnjv6tmAf4h848XxuIr@api.chamosbarber.com:5432/postgres';

const client = new Client({
  connectionString,
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully!');
    const res = await client.query('SELECT NOW()');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.end();
  }
}

main();
