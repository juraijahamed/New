require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

/**
 * Uses DATABASE_URL if provided; otherwise falls back to individual PG* vars.
 * - DATABASE_URL example: postgresql://user:pass@host:5432/dbname
 */
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'postgres',
    }
);

async function initSchema() {
  // Keep table/column names aligned with the current SQLite schema
  // so the client and routes don't need to change.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE,
      role TEXT DEFAULT 'staff'
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      description TEXT,
      amount DOUBLE PRECISION,
      category TEXT,
      date TEXT,
      receipt_url TEXT,
      remarks TEXT,
      status TEXT,
      user_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      date TEXT,
      agency TEXT,
      supplier TEXT,
      national TEXT,
      service TEXT,
      net_rate DOUBLE PRECISION,
      sales_rate DOUBLE PRECISION,
      profit DOUBLE PRECISION,
      passport_number TEXT,
      documents TEXT,
      remarks TEXT,
      status TEXT,
      user_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      position TEXT,
      salary DOUBLE PRECISION,
      phone TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id SERIAL PRIMARY KEY,
      supplier_name TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      date TEXT NOT NULL,
      receipt_url TEXT,
      remarks TEXT,
      status TEXT,
      user_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS salary_payments (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER NOT NULL,
      staff_name TEXT,
      amount DOUBLE PRECISION NOT NULL,
      advance DOUBLE PRECISION DEFAULT 0,
      paid_month TEXT NOT NULL,
      date TEXT NOT NULL,
      receipt_url TEXT,
      remarks TEXT,
      status TEXT,
      user_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dropdown_options (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(type, value)
    );
  `);

  // Add color and table_type columns if they don't exist (migration)
  try {
    const colorCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='dropdown_options' AND column_name='color'
    `);
    if (colorCheck.rows.length === 0) {
      await pool.query('ALTER TABLE dropdown_options ADD COLUMN color TEXT');
    }
  } catch (err) {
    console.error('Error checking/adding color column:', err);
  }

  try {
    const tableTypeCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='dropdown_options' AND column_name='table_type'
    `);
    if (tableTypeCheck.rows.length === 0) {
      await pool.query('ALTER TABLE dropdown_options ADD COLUMN table_type TEXT');
    }
  } catch (err) {
    console.error('Error checking/adding table_type column:', err);
  }

  // Update unique constraint to include table_type if needed
  try {
    // Check if the new constraint exists
    const constraintCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name='dropdown_options' AND constraint_name='dropdown_options_type_value_table_type_key'
    `);

    if (constraintCheck.rows.length === 0) {
      // Drop old unique constraint if it exists (might have different names)
      await pool.query(`
        ALTER TABLE dropdown_options 
        DROP CONSTRAINT IF EXISTS dropdown_options_type_value_key
      `);
      await pool.query(`
        ALTER TABLE dropdown_options 
        DROP CONSTRAINT IF EXISTS dropdown_options_type_value_table_type_key
      `);

      // Add new unique constraint with table_type
      await pool.query(`
        ALTER TABLE dropdown_options 
        ADD CONSTRAINT dropdown_options_type_value_table_type_key 
        UNIQUE(type, value, table_type)
      `);
    }
  } catch (err) {
    console.error('Error updating unique constraint:', err);
  }

  // Add created_by_user_id and updated_by_user_id columns to transaction tables
  const transactionTables = ['expenses', 'sales', 'supplier_payments', 'salary_payments'];
  for (const table of transactionTables) {
    try {
      // Check if created_by_user_id exists
      const createdByCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='${table}' AND column_name='created_by_user_id'
      `);
      if (createdByCheck.rows.length === 0) {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN created_by_user_id INTEGER`);
      }

      // Check if updated_by_user_id exists
      const updatedByCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='${table}' AND column_name='updated_by_user_id'
      `);
      if (updatedByCheck.rows.length === 0) {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN updated_by_user_id INTEGER`);
      }

      // Migrate existing user_id to created_by_user_id if created_by_user_id is null
      await pool.query(`
        UPDATE ${table} 
        SET created_by_user_id = user_id 
        WHERE created_by_user_id IS NULL AND user_id IS NOT NULL
      `);

      // Check if updated_at exists
      const updatedAtCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='${table}' AND column_name='updated_at'
      `);
      if (updatedAtCheck.rows.length === 0) {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()`);
        // Set updated_at to created_at for existing records
        await pool.query(`
          UPDATE ${table} 
          SET updated_at = created_at 
          WHERE updated_at IS NULL
        `);
      }
    } catch (err) {
      console.error(`Error adding created_by/updated_by columns to ${table}:`, err);
    }
  }

  // Cleanup: Remove existing duplicates before seeding
  try {
    await pool.query(`
      DELETE FROM dropdown_options a
      USING dropdown_options b
      WHERE a.id > b.id
        AND a.type = b.type
        AND a.value = b.value
        AND a.table_type IS NOT DISTINCT FROM b.table_type
    `);
  } catch (err) {
    console.error('Error during duplicate cleanup:', err);
  }

  // Initialize default dropdown values - insert each default if it doesn't exist
  async function seedOptions(type, values, tableType = null) {
    for (let i = 0; i < values.length; i++) {
      try {
        // Check if exists first because UNIQUE constraint doesn't prevent duplicates with NULL values
        const existing = await pool.query(
          'SELECT id FROM dropdown_options WHERE type = $1 AND value = $2 AND table_type IS NOT DISTINCT FROM $3',
          [type, values[i], tableType]
        );

        if (existing.rows.length === 0) {
          await pool.query(
            'INSERT INTO dropdown_options (type, value, display_order, table_type) VALUES ($1, $2, $3, $4)',
            [type, values[i], i, tableType]
          );
        }
      } catch (err) {
        console.error(`Error seeding ${type} "${values[i]}":`, err);
      }
    }
  }

  const defaultServices = [
    'Visa Services',
    'Ticketing',
    'Hotel Booking',
    'Tour Package',
    'Insurance',
  ];
  const defaultNationalities = [
    'Indian', 'Pakistani', 'Filipino', 'Bangladeshi', 'Egyptian',
    'British', 'American', 'Emirati', 'Saudi', 'Jordanian',
    'Lebanese', 'Syrian', 'Sudanese', 'Nepali', 'Sri Lankan', 'Chinese',
  ];
  const defaultCategories = [
    'Office Supplies',
    'Utilities',
    'Travel',
    'Marketing',
    'Software',
    'Equipment',
    'Rent',
  ];
  const defaultPositions = [
    'Manager',
    'Travel Agent',
    'Accountant',
    'IT Support',
    'HR',
    'Driver',
    'PRO',
  ];

  await seedOptions('service', defaultServices);
  await seedOptions('nationality', defaultNationalities);
  await seedOptions('category', defaultCategories);
  await seedOptions('position', defaultPositions);
}

module.exports = {
  pool,
  initSchema,
};

