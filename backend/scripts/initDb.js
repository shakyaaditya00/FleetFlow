/**
 * Database initialization script - PostgreSQL schema for FleetFlow
 * Run: node scripts/initDb.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database schema created successfully.');
  await pool.end();
}

initDb().catch((err) => {
  console.error('Error initializing database:', err);
  process.exit(1);
});
