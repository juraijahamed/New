const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const port = 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Database Setup - Use absolute path to ensure consistency
const dbPath = path.join(__dirname, 'finance.db');
console.log('Database path:', dbPath);

// DEBUG: Keep process alive and log exits
process.on('exit', (code) => {
  console.log(`Server process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Heartbeat to keep event loop active
setInterval(() => {
  // console.log('Server Heartbeat: Still running...');
}, 5000);


// Database initialized log moved down after initialization


const db = new Database(dbPath);
console.log('Database initialized');

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    role TEXT DEFAULT 'staff'
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    amount REAL,
    category TEXT,
    date TEXT,
    receipt_url TEXT,
    remarks TEXT,
    status TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    agency TEXT,
    supplier TEXT,
    national TEXT,
    service TEXT,
    net_rate REAL,
    sales_rate REAL,
    profit REAL,
    passport_number TEXT,
    documents TEXT,
    remarks TEXT,
    status TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT,
    salary REAL,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS supplier_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    receipt_url TEXT,
    remarks TEXT,
    status TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS salary_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    staff_name TEXT,
    amount REAL NOT NULL,
    advance REAL DEFAULT 0,
    paid_month TEXT NOT NULL,
    date TEXT NOT NULL,
    receipt_url TEXT,
    remarks TEXT,
    status TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration to add status column if it doesn't exist (for existing tables)
try {
  const tables = ['expenses', 'sales', 'supplier_payments', 'salary_payments'];
  tables.forEach(table => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all();
    const hasStatus = columns.some(col => col.name === 'status');
    if (!hasStatus) {
      console.log(`Adding status column to ${table}...`);
      db.prepare(`ALTER TABLE ${table} ADD COLUMN status TEXT`).run();
    }
  });

  // Migration to add receipt_url to salary_payments if it doesn't exist
  const salaryColumns = db.prepare(`PRAGMA table_info(salary_payments)`).all();
  const hasReceiptUrl = salaryColumns.some(col => col.name === 'receipt_url');
  if (!hasReceiptUrl) {
    console.log('Adding receipt_url column to salary_payments...');
    db.prepare(`ALTER TABLE salary_payments ADD COLUMN receipt_url TEXT`).run();
  }
} catch (error) {
  console.error('Migration error:', error);
}

console.log('Schema initialized successfully');

// ============ ROUTES ============

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============ AUTH ============
app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const trimmedName = name.trim();
    let user = db.prepare('SELECT * FROM users WHERE name = ?').get(trimmedName);

    if (!user) {
      const info = db.prepare('INSERT INTO users (name) VALUES (?)').run(trimmedName);
      user = { id: info.lastInsertRowid, name: trimmedName, role: 'staff' };
    }

    res.json({ user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ EXPENSES ============
app.get('/api/expenses', (req, res) => {
  try {
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC').all();
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', (req, res) => {
  const { description, amount, category, date, receipt_url, remarks, status, user_id } = req.body;
  try {
    const stmt = db.prepare(
      'INSERT INTO expenses (description, amount, category, date, receipt_url, remarks, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const finalRemarks = (remarks && remarks.trim()) || null;
    const finalStatus = status || '';
    const info = stmt.run(description, amount, category, date, receipt_url || null, finalRemarks, finalStatus, user_id || null);
    res.json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const validFields = ['description', 'amount', 'category', 'date', 'receipt_url', 'remarks', 'status'];

  try {
    const fieldsToUpdate = Object.keys(updates)
      .filter(key => validFields.includes(key) && updates[key] !== undefined);

    if (fieldsToUpdate.length === 0) {
      return res.json({ id: Number(id), ...updates });
    }

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => {
      if (field === 'remarks') {
        return (updates[field] && updates[field].trim()) || null;
      }
      return updates[field];
    });
    values.push(id);

    const stmt = db.prepare(`UPDATE expenses SET ${setClause} WHERE id = ?`);
    stmt.run(...values);

    res.json({ id: Number(id), ...updates });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SALES ============
app.get('/api/sales', (req, res) => {
  try {
    const sales = db.prepare('SELECT * FROM sales ORDER BY date DESC').all();
    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', (req, res) => {
  const { date, agency, supplier, national, passport_number, service, net_rate, sales_rate, profit, documents, remarks, status, user_id } = req.body;
  try {
    const stmt = db.prepare(
      'INSERT INTO sales (date, agency, supplier, national, passport_number, service, net_rate, sales_rate, profit, documents, remarks, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const calculatedProfit = profit !== undefined ? profit : (sales_rate || 0) - (net_rate || 0);
    const info = stmt.run(date, agency, supplier, national, passport_number || null, service, net_rate, sales_rate, calculatedProfit, documents || null, (remarks && remarks.trim()) || null, status || '', user_id || null);
    res.json({ id: info.lastInsertRowid, ...req.body, profit: calculatedProfit });
  } catch (error) {
    console.error('Add sale error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sales/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const validFields = ['date', 'agency', 'supplier', 'national', 'passport_number', 'service', 'net_rate', 'sales_rate', 'profit', 'documents', 'remarks', 'status'];

  try {
    // specific calculations if rates are updated
    if (updates.sales_rate !== undefined || updates.net_rate !== undefined) {
      // This logic is tricky with partial updates. Ideally we fetch, calc, then update.
      // For now, let's assume if profit is passed, we use it, otherwise we calculate ONLY IF both rates are passed or we fetch first.
      // To stay safe and simple for this "status" update fix:
      // If profit is NOT in updates, and we have rate updates, we might have inconsistent profit if we don't have both rates.
      // However, the current frontend sends full object for edits, and only {status} for status change.
      // If {status} only, we skip this calculation.
    }

    // Recalculate profit if needed and not provided
    if (updates.profit === undefined && (updates.sales_rate !== undefined && updates.net_rate !== undefined)) {
      updates.profit = (updates.sales_rate || 0) - (updates.net_rate || 0);
    }

    const fieldsToUpdate = Object.keys(updates)
      .filter(key => validFields.includes(key) && updates[key] !== undefined);

    if (fieldsToUpdate.length === 0) {
      return res.json({ id: Number(id), ...updates });
    }

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => {
      if (field === 'remarks') {
        return (updates[field] && updates[field].trim()) || null;
      }
      return updates[field];
    });
    values.push(id);

    const stmt = db.prepare(`UPDATE sales SET ${setClause} WHERE id = ?`);
    stmt.run(...values);

    res.json({ id: Number(id), ...updates });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM sales WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ STAFF ============
app.get('/api/staff', (req, res) => {
  try {
    const staff = db.prepare('SELECT * FROM staff ORDER BY name').all();
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/staff', (req, res) => {
  const { name, position, salary, phone } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO staff (name, position, salary, phone) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, position || null, salary || 0, phone || null);
    res.json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    console.error('Add staff error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  const { name, position, salary, phone } = req.body;
  try {
    const stmt = db.prepare('UPDATE staff SET name = ?, position = ?, salary = ?, phone = ? WHERE id = ?');
    stmt.run(name, position || null, salary || 0, phone || null, id);
    res.json({ id: Number(id), ...req.body });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/staff/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM staff WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SUPPLIER PAYMENTS ============
app.get('/api/supplier-payments', (req, res) => {
  try {
    const payments = db.prepare('SELECT * FROM supplier_payments ORDER BY date DESC').all();
    res.json(payments);
  } catch (error) {
    console.error('Get supplier payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/supplier-payments', (req, res) => {
  const { supplier_name, amount, date, receipt_url, remarks, status, user_id } = req.body;
  try {
    const stmt = db.prepare(
      'INSERT INTO supplier_payments (supplier_name, amount, date, receipt_url, remarks, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(supplier_name, amount, date, receipt_url || null, (remarks && remarks.trim()) || null, status || '', user_id || null);
    res.json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    console.error('Add supplier payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/supplier-payments/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const validFields = ['supplier_name', 'amount', 'date', 'receipt_url', 'remarks', 'status'];

  try {
    const fieldsToUpdate = Object.keys(updates)
      .filter(key => validFields.includes(key) && updates[key] !== undefined);

    if (fieldsToUpdate.length === 0) {
      return res.json({ id: Number(id), ...updates });
    }

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => {
      if (field === 'remarks') {
        return (updates[field] && updates[field].trim()) || null;
      }
      return updates[field];
    });
    values.push(id);

    const stmt = db.prepare(`UPDATE supplier_payments SET ${setClause} WHERE id = ?`);
    stmt.run(...values);

    res.json({ id: Number(id), ...updates });
  } catch (error) {
    console.error('Update supplier payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/supplier-payments/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM supplier_payments WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete supplier payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SALARY PAYMENTS ============
app.get('/api/salary-payments', (req, res) => {
  try {
    const payments = db.prepare('SELECT * FROM salary_payments ORDER BY date DESC').all();
    res.json(payments);
  } catch (error) {
    console.error('Get salary payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/salary-payments', (req, res) => {
  const { staff_id, staff_name, amount, advance, paid_month, date, receipt_url, remarks, status, user_id } = req.body;
  try {
    const stmt = db.prepare(
      'INSERT INTO salary_payments (staff_id, staff_name, amount, advance, paid_month, date, receipt_url, remarks, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const info = stmt.run(staff_id, staff_name, amount, advance || 0, paid_month, date, receipt_url || null, (remarks && remarks.trim()) || null, status || '', user_id || null);
    res.json({ id: info.lastInsertRowid, ...req.body });
  } catch (error) {
    console.error('Add salary payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/salary-payments/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const validFields = ['staff_id', 'staff_name', 'amount', 'advance', 'paid_month', 'date', 'receipt_url', 'remarks', 'status'];

  try {
    const fieldsToUpdate = Object.keys(updates)
      .filter(key => validFields.includes(key) && updates[key] !== undefined);

    if (fieldsToUpdate.length === 0) {
      return res.json({ id: Number(id), ...updates });
    }

    const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
    const values = fieldsToUpdate.map(field => {
      if (field === 'remarks') {
        return (updates[field] && updates[field].trim()) || null;
      }
      return updates[field];
    });
    values.push(id);

    const stmt = db.prepare(`UPDATE salary_payments SET ${setClause} WHERE id = ?`);
    stmt.run(...values);

    res.json({ id: Number(id), ...updates });
  } catch (error) {
    console.error('Update salary payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/salary-payments/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM salary_payments WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete salary payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ FILE UPLOAD ============
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    console.log('Upload endpoint hit');
    console.log('Request file:', req.file);
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const response = { 
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/uploads/${req.file.filename}`
    };
    console.log('Upload successful:', response);
    res.json(response);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multiple file upload endpoint
app.post('/api/upload-multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${file.filename}`
    }));
    res.json({ files });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD STATS ============
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const salesData = db.prepare('SELECT SUM(sales_rate) as total, SUM(profit) as totalProfit, COUNT(*) as count FROM sales').get();
    const expensesData = db.prepare('SELECT SUM(amount) as total, COUNT(*) as count FROM expenses').get();

    const totalSales = salesData?.total || 0;
    const totalProfit = salesData?.totalProfit || 0;
    const salesCount = salesData?.count || 0;
    const totalExpenses = expensesData?.total || 0;
    const expensesCount = expensesData?.count || 0;
    const netProfit = totalProfit - totalExpenses;

    res.json({
      totalSales,
      totalExpenses,
      totalProfit,
      netProfit,
      salesCount,
      expensesCount
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Upload endpoint available at http://localhost:${port}/api/upload`);
  console.log(`Uploads directory: ${uploadsDir}`);
});
