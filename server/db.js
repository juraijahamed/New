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

  // Initialize default dropdown values - insert each default if it doesn't exist
  const defaultServices = [
    'Visa Services',
    'Ticketing',
    'Hotel Booking',
    'Tour Package',
    'Insurance',
  ];
  const defaultNationalities = [
    'Indian',
    'Pakistani',
    'Filipino',
    'Bangladeshi',
    'Egyptian',
    'British',
    'American',
    'Emirati',
    'Saudi',
    'Jordanian',
    'Lebanese',
    'Syrian',
    'Sudanese',
    'Nepali',
    'Sri Lankan',
    'Chinese',
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
  const defaultStatuses = [
    { value: 'pending', color: '#FF9800' },
    { value: 'credited', color: '#4CAF50' },
    { value: 'transferred', color: '#2196F3' },
    { value: 'canceled', color: '#F44336' },
    { value: 'cleared', color: '#FFD700' },
    { value: 'on-hold', color: '#795548' },
  ];

  // Insert services (ON CONFLICT ensures no duplicates)
  // Try with new constraint first, fallback to old constraint if needed
  for (let i = 0; i < defaultServices.length; i++) {
    try {
      await pool.query(
        'INSERT INTO dropdown_options (type, value, display_order, table_type) VALUES ($1, $2, $3, $4) ON CONFLICT (type, value, table_type) DO NOTHING',
        ['service', defaultServices[i], i, null]
      );
    } catch (err) {
      // Fallback to old constraint if new one doesn't exist
      await pool.query(
        'INSERT INTO dropdown_options (type, value, display_order) VALUES ($1, $2, $3) ON CONFLICT (type, value) DO NOTHING',
        ['service', defaultServices[i], i]
      );
    }
  }

  // Insert nationalities
  for (let i = 0; i < defaultNationalities.length; i++) {
    try {
      await pool.query(
        'INSERT INTO dropdown_options (type, value, display_order, table_type) VALUES ($1, $2, $3, $4) ON CONFLICT (type, value, table_type) DO NOTHING',
        ['nationality', defaultNationalities[i], i, null]
      );
    } catch (err) {
      await pool.query(
        'INSERT INTO dropdown_options (type, value, display_order) VALUES ($1, $2, $3) ON CONFLICT (type, value) DO NOTHING',
        ['nationality', defaultNationalities[i], i]
      );
    }
  }

  // Insert categories
  for (let i = 0; i < defaultCategories.length; i++) {
    try {
      await pool.query(
        'INSERT INTO dropdown_options (type, value, display_order, table_type) VALUES ($1, $2, $3, $4) ON CONFLICT (type, value, table_type) DO NOTHING',
        ['category', defaultCategories[i], i, null]
      );
    } catch (err) {
      await pool.query(
        'INSERT INTO dropdown_options (type, value, display_order) VALUES ($1, $2, $3) ON CONFLICT (type, value) DO NOTHING',
        ['category', defaultCategories[i], i]
      );
    }
  }

  // Insert default positions (will only insert if they don't exist)
  for (let i = 0; i < defaultPositions.length; i++) {
    try {
      await pool.query(
        'INSERT INTO dropdown_options (type, value, display_order, table_type) VALUES ($1, $2, $3, $4) ON CONFLICT (type, value, table_type) DO NOTHING',
        ['position', defaultPositions[i], i, null]
      );
    } catch (err) {
      await pool.query(
        'INSERT INTO dropdown_options (type, value, display_order) VALUES ($1, $2, $3) ON CONFLICT (type, value) DO NOTHING',
        ['position', defaultPositions[i], i]
      );
    }
  }

  // Skip status insertion - status options are no longer managed through dropdown options
  // (Status options use hardcoded defaults in the StatusSelect component)
}

module.exports = {
  pool,
  initSchema,
};

