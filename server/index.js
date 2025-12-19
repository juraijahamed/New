const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool, initSchema } = require('./db');
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

async function start() {
  // Initialize DB schema in Postgres
  await initSchema();
  console.log('Postgres schema initialized successfully');

  // ============ ROUTES ============

  // Health Check
  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', time: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ status: 'error', error: error.message });
    }
  });

  // ============ AUTH ============
  app.post('/api/login', async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    try {
      const trimmedName = name.trim();
      const existing = await pool.query('SELECT * FROM users WHERE name = $1', [trimmedName]);
      let user = existing.rows[0];

      if (!user) {
        const inserted = await pool.query(
          'INSERT INTO users (name) VALUES ($1) RETURNING *',
          [trimmedName]
        );
        user = inserted.rows[0];
      }

      res.json({ user });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  });

// ============ EXPENSES ============
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { description, amount, category, date, receipt_url, remarks, status, user_id } = req.body;
  try {
    const finalRemarks = (remarks && remarks.trim()) || null;
    const finalStatus = status || '';
    const inserted = await pool.query(
      `INSERT INTO expenses (description, amount, category, date, receipt_url, remarks, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [description, amount, category, date, receipt_url || null, finalRemarks, finalStatus, user_id || null]
    );
    res.json(inserted.rows[0]);
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const validFields = ['description', 'amount', 'category', 'date', 'receipt_url', 'remarks', 'status'];

  try {
    const fieldsToUpdate = Object.keys(updates)
      .filter(key => validFields.includes(key) && updates[key] !== undefined);

    if (fieldsToUpdate.length === 0) {
      return res.json({ id: Number(id), ...updates });
    }

    const setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
    const values = fieldsToUpdate.map(field => {
      if (field === 'remarks') return (updates[field] && updates[field].trim()) || null;
      if (field === 'receipt_url') return updates[field] || null;
      return updates[field];
    });
    values.push(id);
    const updated = await pool.query(
      `UPDATE expenses SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(updated.rows[0] || { id: Number(id), ...updates });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SALES ============
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', async (req, res) => {
  const { date, agency, supplier, national, passport_number, service, net_rate, sales_rate, profit, documents, remarks, status, user_id } = req.body;
  try {
    const calculatedProfit = profit !== undefined ? profit : (sales_rate || 0) - (net_rate || 0);
    const inserted = await pool.query(
      `INSERT INTO sales (date, agency, supplier, national, passport_number, service, net_rate, sales_rate, profit, documents, remarks, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        date,
        agency,
        supplier,
        national,
        passport_number || null,
        service,
        net_rate,
        sales_rate,
        calculatedProfit,
        documents || null,
        (remarks && remarks.trim()) || null,
        status || '',
        user_id || null,
      ]
    );
    res.json(inserted.rows[0]);
  } catch (error) {
    console.error('Add sale error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/sales/:id', async (req, res) => {
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

    const setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
    const values = fieldsToUpdate.map(field => {
      if (field === 'remarks') return (updates[field] && updates[field].trim()) || null;
      if (field === 'documents') return updates[field] || null;
      if (field === 'passport_number') return updates[field] || null;
      return updates[field];
    });
    values.push(id);

    const updated = await pool.query(
      `UPDATE sales SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(updated.rows[0] || { id: Number(id), ...updates });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sales WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ STAFF ============
app.get('/api/staff', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM staff ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/staff', async (req, res) => {
  const { name, position, salary, phone } = req.body;
  try {
    const inserted = await pool.query(
      `INSERT INTO staff (name, position, salary, phone) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, position || null, salary || 0, phone || null]
    );
    res.json(inserted.rows[0]);
  } catch (error) {
    console.error('Add staff error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  const { name, position, salary, phone } = req.body;
  try {
    const updated = await pool.query(
      `UPDATE staff SET name = $1, position = $2, salary = $3, phone = $4 WHERE id = $5 RETURNING *`,
      [name, position || null, salary || 0, phone || null, id]
    );
    res.json(updated.rows[0] || { id: Number(id), ...req.body });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM staff WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SUPPLIER PAYMENTS ============
app.get('/api/supplier-payments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM supplier_payments ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get supplier payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/supplier-payments', async (req, res) => {
  const { supplier_name, amount, date, receipt_url, remarks, status, user_id } = req.body;
  try {
    const inserted = await pool.query(
      `INSERT INTO supplier_payments (supplier_name, amount, date, receipt_url, remarks, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [supplier_name, amount, date, receipt_url || null, (remarks && remarks.trim()) || null, status || '', user_id || null]
    );
    res.json(inserted.rows[0]);
  } catch (error) {
    console.error('Add supplier payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/supplier-payments/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const validFields = ['supplier_name', 'amount', 'date', 'receipt_url', 'remarks', 'status'];

  try {
    const fieldsToUpdate = Object.keys(updates)
      .filter(key => validFields.includes(key) && updates[key] !== undefined);

    if (fieldsToUpdate.length === 0) {
      return res.json({ id: Number(id), ...updates });
    }

    const setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
    const values = fieldsToUpdate.map(field => {
      if (field === 'remarks') return (updates[field] && updates[field].trim()) || null;
      if (field === 'receipt_url') return updates[field] || null;
      return updates[field];
    });
    values.push(id);

    const updated = await pool.query(
      `UPDATE supplier_payments SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(updated.rows[0] || { id: Number(id), ...updates });
  } catch (error) {
    console.error('Update supplier payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/supplier-payments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM supplier_payments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete supplier payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ SALARY PAYMENTS ============
app.get('/api/salary-payments', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM salary_payments ORDER BY date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get salary payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/salary-payments', async (req, res) => {
  const { staff_id, staff_name, amount, advance, paid_month, date, receipt_url, remarks, status, user_id } = req.body;
  try {
    const inserted = await pool.query(
      `INSERT INTO salary_payments (staff_id, staff_name, amount, advance, paid_month, date, receipt_url, remarks, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        staff_id,
        staff_name,
        amount,
        advance || 0,
        paid_month,
        date,
        receipt_url || null,
        (remarks && remarks.trim()) || null,
        status || '',
        user_id || null,
      ]
    );
    res.json(inserted.rows[0]);
  } catch (error) {
    console.error('Add salary payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/salary-payments/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const validFields = ['staff_id', 'staff_name', 'amount', 'advance', 'paid_month', 'date', 'receipt_url', 'remarks', 'status'];

  try {
    const fieldsToUpdate = Object.keys(updates)
      .filter(key => validFields.includes(key) && updates[key] !== undefined);

    if (fieldsToUpdate.length === 0) {
      return res.json({ id: Number(id), ...updates });
    }

    const setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
    const values = fieldsToUpdate.map(field => {
      if (field === 'remarks') return (updates[field] && updates[field].trim()) || null;
      if (field === 'receipt_url') return updates[field] || null;
      return updates[field];
    });
    values.push(id);

    const updated = await pool.query(
      `UPDATE salary_payments SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(updated.rows[0] || { id: Number(id), ...updates });
  } catch (error) {
    console.error('Update salary payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/salary-payments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM salary_payments WHERE id = $1', [id]);
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
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const salesData = (await pool.query('SELECT SUM(sales_rate) as total, SUM(profit) as "totalProfit", COUNT(*) as count FROM sales')).rows[0];
    const expensesData = (await pool.query('SELECT SUM(amount) as total, COUNT(*) as count FROM expenses')).rows[0];

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

// ============ DROPDOWN OPTIONS ============
app.get('/api/dropdown-options', async (req, res) => {
  try {
    const { type, table_type } = req.query;
    let query = 'SELECT * FROM dropdown_options WHERE 1=1';
    let params = [];
    let paramIndex = 1;
    
    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    if (table_type) {
      // When table_type is specified, STRICTLY return ONLY options for that specific table type
      // This ensures sales options don't appear in expenses, etc.
      query += ` AND table_type = $${paramIndex}`;
      params.push(table_type);
      paramIndex++;
    } else if (type === 'status') {
      // For status type without table_type specified, return options without table_type (legacy/fallback)
      // This is for backward compatibility only
      query += ` AND table_type IS NULL`;
    }
    
    query += ' ORDER BY type, table_type, display_order, value';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get dropdown options error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dropdown-options', async (req, res) => {
  const { type, value, display_order, color, table_type } = req.body;
  if (!type || !value) {
    return res.status(400).json({ error: 'Type and value are required' });
  }
  // For status type, table_type is required
  if (type === 'status' && !table_type) {
    return res.status(400).json({ error: 'table_type is required for status options' });
  }
  try {
    const inserted = await pool.query(
      `INSERT INTO dropdown_options (type, value, display_order, color, table_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (type, value, table_type) DO UPDATE SET display_order = $3, color = COALESCE(NULLIF($4, ''), dropdown_options.color)
       RETURNING *`,
      [type, value, display_order || 0, color || null, table_type || null]
    );
    res.json(inserted.rows[0]);
  } catch (error) {
    console.error('Add dropdown option error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/dropdown-options/:id', async (req, res) => {
  const { id } = req.params;
  const { value, display_order, color, table_type } = req.body;
  try {
    // Get the existing option to preserve table_type if not provided
    const existing = await pool.query('SELECT type, table_type FROM dropdown_options WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Dropdown option not found' });
    }
    
    // Preserve existing table_type if not provided in update, but allow explicit changes
    const finalTableType = table_type !== undefined ? table_type : existing.rows[0].table_type;
    
    // For status type, ensure table_type is set
    if (existing.rows[0].type === 'status' && !finalTableType) {
      return res.status(400).json({ error: 'table_type is required for status options' });
    }
    
    const updated = await pool.query(
      `UPDATE dropdown_options SET value = $1, display_order = $2, color = COALESCE(NULLIF($3, ''), dropdown_options.color), table_type = $4 WHERE id = $5 RETURNING *`,
      [value, display_order || 0, color || null, finalTableType, id]
    );
    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update dropdown option error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/dropdown-options/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM dropdown_options WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete dropdown option error:', error);
    res.status(500).json({ error: error.message });
  }
});

  // Start Server
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Upload endpoint available at http://localhost:${port}/api/upload`);
    console.log(`Uploads directory: ${uploadsDir}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
