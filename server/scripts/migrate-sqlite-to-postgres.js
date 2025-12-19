/**
 * One-time migration: copies data from SQLite finance.db into Postgres.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL="postgresql://postgres:pass@localhost:5432/hawk_finance"
 *   node scripts/migrate-sqlite-to-postgres.js
 *
 * Notes:
 * - This script TRUNCATES destination tables by default.
 * - It preserves the existing integer `id` values and fixes sequences after import.
 */

require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');
const { pool, initSchema } = require('../db');

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'finance.db');
const SHOULD_TRUNCATE = (process.env.MIGRATE_TRUNCATE || 'true').toLowerCase() !== 'false';

function toNullIfEmpty(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

async function truncateAll() {
  await pool.query('TRUNCATE TABLE salary_payments RESTART IDENTITY CASCADE');
  await pool.query('TRUNCATE TABLE supplier_payments RESTART IDENTITY CASCADE');
  await pool.query('TRUNCATE TABLE sales RESTART IDENTITY CASCADE');
  await pool.query('TRUNCATE TABLE expenses RESTART IDENTITY CASCADE');
  await pool.query('TRUNCATE TABLE staff RESTART IDENTITY CASCADE');
  await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
}

async function setSeq(tableName) {
  // Assumes serial column is `id` and sequence name follows Postgres default: <table>_id_seq
  await pool.query(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1, false)`,
    [tableName]
  );
}

async function insertRows(tableName, columns, rows) {
  if (rows.length === 0) return;
  const colList = columns.map((c) => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${tableName} (${colList}) VALUES (${placeholders})`;

  // Insert row-by-row to keep things simple and predictable.
  for (const row of rows) {
    const values = columns.map((c) => row[c]);
    await pool.query(sql, values);
  }
}

async function main() {
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    throw new Error('Set DATABASE_URL (recommended) or PGHOST/PGUSER/PGDATABASE env vars before running migration.');
  }

  console.log('SQLite path:', SQLITE_PATH);
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  await initSchema();
  if (SHOULD_TRUNCATE) {
    console.log('Truncating Postgres tables...');
    await truncateAll();
  } else {
    console.log('MIGRATE_TRUNCATE=false; will append (may cause duplicate ids).');
  }

  // Read from SQLite
  const users = sqlite.prepare('SELECT id, name, role FROM users').all();
  const staff = sqlite.prepare('SELECT id, name, position, salary, phone, created_at FROM staff').all();
  const expenses = sqlite
    .prepare('SELECT id, description, amount, category, date, receipt_url, remarks, status, user_id, created_at FROM expenses')
    .all();
  const sales = sqlite
    .prepare(
      'SELECT id, date, agency, supplier, national, service, net_rate, sales_rate, profit, passport_number, documents, remarks, status, user_id, created_at FROM sales'
    )
    .all();
  const supplierPayments = sqlite
    .prepare('SELECT id, supplier_name, amount, date, receipt_url, remarks, status, user_id, created_at FROM supplier_payments')
    .all();
  const salaryPayments = sqlite
    .prepare(
      'SELECT id, staff_id, staff_name, amount, advance, paid_month, date, receipt_url, remarks, status, user_id, created_at FROM salary_payments'
    )
    .all();

  // Normalize a few fields (trim empty strings → null)
  for (const row of [...expenses, ...sales, ...supplierPayments, ...salaryPayments]) {
    row.remarks = toNullIfEmpty(row.remarks);
    row.receipt_url = toNullIfEmpty(row.receipt_url);
  }
  for (const row of sales) {
    row.documents = toNullIfEmpty(row.documents);
    row.passport_number = toNullIfEmpty(row.passport_number);
  }

  console.log('Importing rows into Postgres...');
  await insertRows('users', ['id', 'name', 'role'], users);
  await insertRows('staff', ['id', 'name', 'position', 'salary', 'phone', 'created_at'], staff);
  await insertRows(
    'expenses',
    ['id', 'description', 'amount', 'category', 'date', 'receipt_url', 'remarks', 'status', 'user_id', 'created_at'],
    expenses
  );
  await insertRows(
    'sales',
    [
      'id',
      'date',
      'agency',
      'supplier',
      'national',
      'service',
      'net_rate',
      'sales_rate',
      'profit',
      'passport_number',
      'documents',
      'remarks',
      'status',
      'user_id',
      'created_at',
    ],
    sales
  );
  await insertRows(
    'supplier_payments',
    ['id', 'supplier_name', 'amount', 'date', 'receipt_url', 'remarks', 'status', 'user_id', 'created_at'],
    supplierPayments
  );
  await insertRows(
    'salary_payments',
    ['id', 'staff_id', 'staff_name', 'amount', 'advance', 'paid_month', 'date', 'receipt_url', 'remarks', 'status', 'user_id', 'created_at'],
    salaryPayments
  );

  console.log('Fixing sequences...');
  await setSeq('users');
  await setSeq('staff');
  await setSeq('expenses');
  await setSeq('sales');
  await setSeq('supplier_payments');
  await setSeq('salary_payments');

  console.log('Done.');
  sqlite.close();
  await pool.end();
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});

