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
  try {
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
        client TEXT,
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
        bus_supplier TEXT,
        visa_supplier TEXT,
        ticket_supplier TEXT,
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
        total_amount DOUBLE PRECISION,
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

  // Add new columns to sales table for conditional supplier fields
  try {
    const clientCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='sales' AND column_name='client'
    `);
    if (clientCheck.rows.length === 0) {
      await pool.query('ALTER TABLE sales ADD COLUMN client TEXT');
    }
    // Convert NULL to empty string for existing records
    await pool.query("UPDATE sales SET client = '' WHERE client IS NULL");

    const busSupplierCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='sales' AND column_name='bus_supplier'
    `);
    if (busSupplierCheck.rows.length === 0) {
      await pool.query('ALTER TABLE sales ADD COLUMN bus_supplier TEXT');
    }
    // Convert NULL to empty string for existing records
    await pool.query("UPDATE sales SET bus_supplier = '' WHERE bus_supplier IS NULL");

    const visaSupplierCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='sales' AND column_name='visa_supplier'
    `);
    if (visaSupplierCheck.rows.length === 0) {
      await pool.query('ALTER TABLE sales ADD COLUMN visa_supplier TEXT');
    }
    // Convert NULL to empty string for existing records
    await pool.query("UPDATE sales SET visa_supplier = '' WHERE visa_supplier IS NULL");

    const ticketSupplierCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='sales' AND column_name='ticket_supplier'
    `);
    if (ticketSupplierCheck.rows.length === 0) {
      await pool.query('ALTER TABLE sales ADD COLUMN ticket_supplier TEXT');
    }
    // Convert NULL to empty string for existing records
    await pool.query("UPDATE sales SET ticket_supplier = '' WHERE ticket_supplier IS NULL");
  } catch (err) {
    console.error('Error adding new sales columns:', err);
  }

  // Ensure total_amount column exists on salary_payments and backfill values
  try {
    const totalAmountCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='salary_payments' AND column_name='total_amount'
    `);
    if (totalAmountCheck.rows.length === 0) {
      await pool.query('ALTER TABLE salary_payments ADD COLUMN total_amount DOUBLE PRECISION');
      await pool.query(`
        UPDATE salary_payments 
        SET total_amount = COALESCE(amount, 0) - COALESCE(advance, 0)
        WHERE total_amount IS NULL
      `);
    } else {
      await pool.query(`
        UPDATE salary_payments 
        SET total_amount = COALESCE(amount, 0) - COALESCE(advance, 0)
        WHERE total_amount IS NULL
      `);
    }
  } catch (err) {
    console.error('Error ensuring total_amount on salary_payments:', err);
  }

  // Add supplier type columns to supplier_payments table (bus_supplier, visa_supplier, ticket_supplier)
  try {
    const busSupplierCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='supplier_payments' AND column_name='bus_supplier'
    `);
    if (busSupplierCheck.rows.length === 0) {
      await pool.query('ALTER TABLE supplier_payments ADD COLUMN bus_supplier TEXT');
      await pool.query('ALTER TABLE supplier_payments ADD COLUMN bus_amount DOUBLE PRECISION');
    }

    const visaSupplierCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='supplier_payments' AND column_name='visa_supplier'
    `);
    if (visaSupplierCheck.rows.length === 0) {
      await pool.query('ALTER TABLE supplier_payments ADD COLUMN visa_supplier TEXT');
      await pool.query('ALTER TABLE supplier_payments ADD COLUMN visa_amount DOUBLE PRECISION');
    }

    const ticketSupplierCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='supplier_payments' AND column_name='ticket_supplier'
    `);
    if (ticketSupplierCheck.rows.length === 0) {
      await pool.query('ALTER TABLE supplier_payments ADD COLUMN ticket_supplier TEXT');
      await pool.query('ALTER TABLE supplier_payments ADD COLUMN ticket_amount DOUBLE PRECISION');
    }
  } catch (err) {
    console.error('Error adding supplier type columns to supplier_payments:', err);
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
    'B2B',
    'A2A',
    'Visa Services',
    'Ticketing',
    'Hotel Booking',
    'Tour Package',
    'Insurance',
  ];
  const defaultNationalities = [
    'Indian', 'Pakistani', 'Filipino', 'Egyptian',
    'British', 'American', 'Emirati', 'Saudi',
    'Syrian', 'Chinese',
  ];
  const defaultCategories = [
    'Office Supplies',
    'Utilities',
    'Travel',
    'Marketing',
    'Equipment',
    'Rent',
  ];
  const defaultPositions = [
    'Manager',
    'Travel Agent',
    'Accountant',
    'HR',
    'Driver',
  ];

  await seedOptions('service', defaultServices);
  await seedOptions('nationality', defaultNationalities);
  await seedOptions('category', defaultCategories);
  await seedOptions('position', defaultPositions);

  // Explicit cleanup of deprecated options
  try {
    await pool.query(`
      DELETE FROM dropdown_options 
      WHERE type = 'nationality' 
        AND value IN ('Bangladeshi','Jordanian','Lebanese','Sudanese','Nepali','Sri Lankan')
    `);
    await pool.query(`
      DELETE FROM dropdown_options 
      WHERE type = 'category' 
        AND value = 'Software'
    `);
    await pool.query(`
      DELETE FROM dropdown_options 
      WHERE type = 'position' 
        AND value IN ('IT Support','PRO')
    `);
  } catch (err) {
    console.error('Error cleaning up deprecated dropdown options:', err);
  }
  } catch (error) {
    console.error('Error initializing database schema:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initSchema,
};

