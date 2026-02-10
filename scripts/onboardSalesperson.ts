import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const [name, email, phone, channel, externalId] = process.argv.slice(2);
if (!name || !email || !channel || !externalId) {
  console.log('Usage: npm run seed:salesperson "Name" "email" "phone" "WHATSAPP" "+15551234567"');
  process.exit(1);
}

const pool = new Pool({ connectionString });

const run = async () => {
  const salespersonRes = await pool.query(
    'INSERT INTO salespeople (name, email, phone) VALUES ($1, $2, $3) RETURNING id',
    [name, email, phone ?? null]
  );
  const salespersonId = salespersonRes.rows[0].id;
  await pool.query(
    'INSERT INTO channel_bindings (salesperson_id, channel, external_id) VALUES ($1, $2, $3)',
    [salespersonId, channel, externalId]
  );
  console.log(`Salesperson created: ${salespersonId}`);
  await pool.end();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
