/**
 * Seed default users - Run after initDb.js
 * Default: admin@fleetflow.com / admin123
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/fleetflow',
});

async function seed() {
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    ['admin@fleetflow.com', hash, 'Admin', 'manager']
  );
  console.log('Seed completed. Login: admin@fleetflow.com / admin123');
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
