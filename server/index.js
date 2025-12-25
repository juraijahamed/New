const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const http = require('http');
const { Server } = require('socket.io');
const { pool, initSchema } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins, including null/file:// (common in Electron)
      callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true, // Support for older clients if needed
  pingTimeout: 60000,
  pingInterval: 25000
});
const port = 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage engines
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

let s3Client = null;
let s3Storage = null;

if (process.env.USE_S3 === 'true' && process.env.S3_BUCKET_NAME) {
  try {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || process.env.aws_region || 'ap-southeast-2',
      // Max retries for better robustness
      maxAttempts: 3
    });

    s3Storage = multerS3({
      s3: s3Client,
      bucket: process.env.S3_BUCKET_NAME,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'uploads/' + uniqueSuffix + path.extname(file.originalname));
      }
    });
    console.log(`S3 Storage Engine initialized for bucket: ${process.env.S3_BUCKET_NAME}`);
  } catch (err) {
    console.error('Failed to initialize S3 storage engine:', err);
  }
}

// Initial upload instance (can be updated dynamically)
let currentUpload = multer({
  storage: s3Storage || diskStorage,
  limits: { fileSize: 20 * 1024 * 1024 } // Increased to 20MB
});

// Helper to switch storage mode dynamically
function setStorageMode(mode) {
  if (mode === 'local') {
    console.log('⚠️ SWITCHING TO LOCAL STORAGE FALLBACK');
    currentUpload = multer({
      storage: diskStorage,
      limits: { fileSize: 20 * 1024 * 1024 }
    });
  }
}

// Middleware
app.use(cors({
  origin: true, // Allow any origin
  credentials: true
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

async function start() {
  // Initialize DB schema in Postgres
  await initSchema();
  console.log('Postgres schema initialized successfully');

  // Log Storage Mode & Verify S3
  if (process.env.USE_S3 === 'true' && process.env.S3_BUCKET_NAME) {
    const { HeadBucketCommand } = require('@aws-sdk/client-s3');
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME }));
      console.log(`✅ Storage Mode: S3 (Bucket: ${process.env.S3_BUCKET_NAME}) is accessible`);
    } catch (err) {
      console.error(`❌ S3 Bucket Error (${process.env.S3_BUCKET_NAME}):`, err.name);
      console.log('Falling back to local storage for this session...');
      setStorageMode('local');
    }
  } else {
    console.log('Storage Mode: Local Disk (Warning: Files are ephemeral in App Runner)');
  }

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

  // Proxy to serve files from local disk or S3
  app.get('/api/uploads/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      console.log(`[Proxy] Request for file: ${filename}`);

      const localPath = path.join(uploadsDir, filename);

      // 1. Try Local Disk First
      if (fs.existsSync(localPath)) {
        console.log(`[Proxy] Serving local file: ${localPath}`);
        return res.sendFile(localPath);
      }

      // 2. Try S3 if enabled
      if (process.env.USE_S3 === 'true' && s3Client) {
        try {
          // Reconstruct S3 Key (ensure it has the 'uploads/' prefix)
          const key = filename.startsWith('uploads/') ? filename : `uploads/${filename}`;
          console.log(`[Proxy] Fetching from S3: ${process.env.S3_BUCKET_NAME} / ${key}`);

          const data = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
          }));

          // Set appropriate headers
          if (data.ContentType) {
            res.setHeader('Content-Type', data.ContentType);
          } else {
            // Fallback content types based on extension
            const ext = path.extname(filename).toLowerCase();
            const types = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
            if (types[ext]) res.setHeader('Content-Type', types[ext]);
          }

          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cache-Control', 'public, max-age=31536000');

          // AWS SDK v3 Body is a stream in Node.js
          data.Body.on('error', (err) => {
            console.error('[Proxy] Stream Error:', err);
            if (!res.headersSent) res.status(500).send('Stream error');
          });

          data.Body.pipe(res);
        } catch (err) {
          console.error(`[Proxy] S3 Error for ${filename}:`, err.message);
          res.status(404).json({ error: 'File not found on S3' });
        }
      } else {
        console.log(`[Proxy] File not found and S3 disabled: ${filename}`);
        res.status(404).json({ error: 'File not found' });
      }
    } catch (err) {
      console.error('[Proxy] Global Error:', err);
      res.status(500).json({ error: 'Internal proxy error' });
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
      const result = await pool.query(`
      SELECT 
        e.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM expenses e
      LEFT JOIN users u1 ON e.created_by_user_id = u1.id
      LEFT JOIN users u2 ON e.updated_by_user_id = u2.id
      ORDER BY COALESCE(e.updated_at, e.created_at) DESC, e.date DESC
    `);
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
        `INSERT INTO expenses (description, amount, category, date, receipt_url, remarks, status, user_id, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
        [description, amount, category, date, receipt_url || null, finalRemarks, finalStatus, user_id || null, user_id || null]
      );
      // Fetch with user names
      const withNames = await pool.query(`
      SELECT 
        e.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM expenses e
      LEFT JOIN users u1 ON e.created_by_user_id = u1.id
      LEFT JOIN users u2 ON e.updated_by_user_id = u2.id
      WHERE e.id = $1
    `, [inserted.rows[0].id]);
      const newExpense = withNames.rows[0];
      // Broadcast to all connected clients
      io.emit('expense:created', newExpense);
      res.json(newExpense);
    } catch (error) {
      console.error('Add expense error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { user_id, ...updateFields } = updates;
    const validFields = ['description', 'amount', 'category', 'date', 'receipt_url', 'remarks', 'status'];

    try {
      const fieldsToUpdate = Object.keys(updateFields)
        .filter(key => validFields.includes(key) && updateFields[key] !== undefined);

      if (fieldsToUpdate.length === 0 && !user_id) {
        return res.json({ id: Number(id), ...updates });
      }

      let setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
      const values = fieldsToUpdate.map(field => {
        if (field === 'remarks') return (updateFields[field] && updateFields[field].trim()) || null;
        if (field === 'receipt_url') return updateFields[field] || null;
        return updateFields[field];
      });

      // Add updated_by_user_id and updated_at if user_id is provided or if any field is being updated
      if (user_id) {
        if (setClause) setClause += ', ';
        setClause += `updated_by_user_id = $${values.length + 1}`;
        values.push(user_id);
      }
      // Always update updated_at when any field is updated
      if (setClause) setClause += ', ';
      setClause += `updated_at = NOW()`;

      values.push(id);
      const updated = await pool.query(
        `UPDATE expenses SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
      );

      // Fetch with user names
      const withNames = await pool.query(`
      SELECT 
        e.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM expenses e
      LEFT JOIN users u1 ON e.created_by_user_id = u1.id
      LEFT JOIN users u2 ON e.updated_by_user_id = u2.id
      WHERE e.id = $1
    `, [id]);
      const updatedExpense = withNames.rows[0] || updated.rows[0] || { id: Number(id), ...updates };
      // Broadcast to all connected clients
      io.emit('expense:updated', updatedExpense);
      res.json(updatedExpense);
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
      // Broadcast to all connected clients
      io.emit('expense:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ SALES ============
  app.get('/api/sales', async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT 
        s.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM sales s
      LEFT JOIN users u1 ON s.created_by_user_id = u1.id
      LEFT JOIN users u2 ON s.updated_by_user_id = u2.id
      ORDER BY COALESCE(s.updated_at, s.created_at) DESC, s.date DESC
    `);
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
        `INSERT INTO sales (date, agency, supplier, national, passport_number, service, net_rate, sales_rate, profit, documents, remarks, status, user_id, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
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
          user_id || null,
        ]
      );
      // Fetch with user names
      const withNames = await pool.query(`
      SELECT 
        s.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM sales s
      LEFT JOIN users u1 ON s.created_by_user_id = u1.id
      LEFT JOIN users u2 ON s.updated_by_user_id = u2.id
      WHERE s.id = $1
    `, [inserted.rows[0].id]);
      const newSale = withNames.rows[0];
      // Broadcast to all connected clients
      io.emit('sale:created', newSale);
      res.json(newSale);
    } catch (error) {
      console.error('Add sale error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/sales/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { user_id, ...updateFields } = updates;
    const validFields = ['date', 'agency', 'supplier', 'national', 'passport_number', 'service', 'net_rate', 'sales_rate', 'profit', 'documents', 'remarks', 'status'];

    try {
      // specific calculations if rates are updated
      if (updateFields.sales_rate !== undefined || updateFields.net_rate !== undefined) {
        // This logic is tricky with partial updates. Ideally we fetch, calc, then update.
        // For now, let's assume if profit is passed, we use it, otherwise we calculate ONLY IF both rates are passed or we fetch first.
        // To stay safe and simple for this "status" update fix:
        // If profit is NOT in updates, and we have rate updates, we might have inconsistent profit if we don't have both rates.
        // However, the current frontend sends full object for edits, and only {status} for status change.
        // If {status} only, we skip this calculation.
      }

      // Recalculate profit if needed and not provided
      if (updateFields.profit === undefined && (updateFields.sales_rate !== undefined && updateFields.net_rate !== undefined)) {
        updateFields.profit = (updateFields.sales_rate || 0) - (updateFields.net_rate || 0);
      }

      const fieldsToUpdate = Object.keys(updateFields)
        .filter(key => validFields.includes(key) && updateFields[key] !== undefined);

      if (fieldsToUpdate.length === 0 && !user_id) {
        return res.json({ id: Number(id), ...updates });
      }

      let setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
      const values = fieldsToUpdate.map(field => {
        if (field === 'remarks') return (updateFields[field] && updateFields[field].trim()) || null;
        if (field === 'documents') return updateFields[field] || null;
        if (field === 'passport_number') return updateFields[field] || null;
        return updateFields[field];
      });

      // Add updated_by_user_id and updated_at if user_id is provided or if any field is being updated
      if (user_id) {
        if (setClause) setClause += ', ';
        setClause += `updated_by_user_id = $${values.length + 1}`;
        values.push(user_id);
      }
      // Always update updated_at when any field is updated
      if (setClause) setClause += ', ';
      setClause += `updated_at = NOW()`;

      values.push(id);

      const updated = await pool.query(
        `UPDATE sales SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
      );

      // Fetch with user names
      const withNames = await pool.query(`
      SELECT 
        s.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM sales s
      LEFT JOIN users u1 ON s.created_by_user_id = u1.id
      LEFT JOIN users u2 ON s.updated_by_user_id = u2.id
      WHERE s.id = $1
    `, [id]);
      const updatedSale = withNames.rows[0] || updated.rows[0] || { id: Number(id), ...updates };
      // Broadcast to all connected clients
      io.emit('sale:updated', updatedSale);
      res.json(updatedSale);
    } catch (error) {
      console.error('Update sale error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/sales/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM sales WHERE id = $1', [id]);
      // Broadcast to all connected clients
      io.emit('sale:deleted', { id: Number(id) });
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
      const result = await pool.query(`
      SELECT 
        sp.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM supplier_payments sp
      LEFT JOIN users u1 ON sp.created_by_user_id = u1.id
      LEFT JOIN users u2 ON sp.updated_by_user_id = u2.id
      ORDER BY COALESCE(sp.updated_at, sp.created_at) DESC, sp.date DESC
    `);
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
        `INSERT INTO supplier_payments (supplier_name, amount, date, receipt_url, remarks, status, user_id, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
        [supplier_name, amount, date, receipt_url || null, (remarks && remarks.trim()) || null, status || '', user_id || null, user_id || null]
      );
      // Fetch with user names
      const withNames = await pool.query(`
      SELECT 
        sp.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM supplier_payments sp
      LEFT JOIN users u1 ON sp.created_by_user_id = u1.id
      LEFT JOIN users u2 ON sp.updated_by_user_id = u2.id
      WHERE sp.id = $1
    `, [inserted.rows[0].id]);
      const newPayment = withNames.rows[0];
      // Broadcast to all connected clients
      io.emit('supplier_payment:created', newPayment);
      res.json(newPayment);
    } catch (error) {
      console.error('Add supplier payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/supplier-payments/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { user_id, ...updateFields } = updates;
    const validFields = ['supplier_name', 'amount', 'date', 'receipt_url', 'remarks', 'status'];

    try {
      const fieldsToUpdate = Object.keys(updateFields)
        .filter(key => validFields.includes(key) && updateFields[key] !== undefined);

      if (fieldsToUpdate.length === 0 && !user_id) {
        return res.json({ id: Number(id), ...updates });
      }

      let setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
      const values = fieldsToUpdate.map(field => {
        if (field === 'remarks') return (updateFields[field] && updateFields[field].trim()) || null;
        if (field === 'receipt_url') return updateFields[field] || null;
        return updateFields[field];
      });

      // Add updated_by_user_id and updated_at if user_id is provided or if any field is being updated
      if (user_id) {
        if (setClause) setClause += ', ';
        setClause += `updated_by_user_id = $${values.length + 1}`;
        values.push(user_id);
      }
      // Always update updated_at when any field is updated
      if (setClause) setClause += ', ';
      setClause += `updated_at = NOW()`;

      values.push(id);

      const updated = await pool.query(
        `UPDATE supplier_payments SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
      );

      // Fetch with user names
      const withNames = await pool.query(`
      SELECT 
        sp.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM supplier_payments sp
      LEFT JOIN users u1 ON sp.created_by_user_id = u1.id
      LEFT JOIN users u2 ON sp.updated_by_user_id = u2.id
      WHERE sp.id = $1
    `, [id]);
      const updatedPayment = withNames.rows[0] || updated.rows[0] || { id: Number(id), ...updates };
      // Broadcast to all connected clients
      io.emit('supplier_payment:updated', updatedPayment);
      res.json(updatedPayment);
    } catch (error) {
      console.error('Update supplier payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/supplier-payments/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM supplier_payments WHERE id = $1', [id]);
      // Broadcast to all connected clients
      io.emit('supplier_payment:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete supplier payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ SALARY PAYMENTS ============
  app.get('/api/salary-payments', async (req, res) => {
    try {
      const result = await pool.query(`
      SELECT 
        sp.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM salary_payments sp
      LEFT JOIN users u1 ON sp.created_by_user_id = u1.id
      LEFT JOIN users u2 ON sp.updated_by_user_id = u2.id
      ORDER BY COALESCE(sp.updated_at, sp.created_at) DESC, sp.date DESC
    `);
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
        `INSERT INTO salary_payments (staff_id, staff_name, amount, advance, paid_month, date, receipt_url, remarks, status, user_id, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
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
          user_id || null,
        ]
      );
      // Fetch with user names
      const withNames = await pool.query(`
      SELECT 
        sp.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM salary_payments sp
      LEFT JOIN users u1 ON sp.created_by_user_id = u1.id
      LEFT JOIN users u2 ON sp.updated_by_user_id = u2.id
      WHERE sp.id = $1
    `, [inserted.rows[0].id]);
      const newPayment = withNames.rows[0];
      // Broadcast to all connected clients
      io.emit('salary_payment:created', newPayment);
      res.json(newPayment);
    } catch (error) {
      console.error('Add salary payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/salary-payments/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const { user_id, ...updateFields } = updates;
    const validFields = ['staff_id', 'staff_name', 'amount', 'advance', 'paid_month', 'date', 'receipt_url', 'remarks', 'status'];

    try {
      const fieldsToUpdate = Object.keys(updateFields)
        .filter(key => validFields.includes(key) && updateFields[key] !== undefined);

      if (fieldsToUpdate.length === 0 && !user_id) {
        return res.json({ id: Number(id), ...updates });
      }

      let setClause = fieldsToUpdate.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
      const values = fieldsToUpdate.map(field => {
        if (field === 'remarks') return (updateFields[field] && updateFields[field].trim()) || null;
        if (field === 'receipt_url') return updateFields[field] || null;
        return updateFields[field];
      });

      // Add updated_by_user_id and updated_at if user_id is provided or if any field is being updated
      if (user_id) {
        if (setClause) setClause += ', ';
        setClause += `updated_by_user_id = $${values.length + 1}`;
        values.push(user_id);
      }
      // Always update updated_at when any field is updated
      if (setClause) setClause += ', ';
      setClause += `updated_at = NOW()`;

      values.push(id);

      const updated = await pool.query(
        `UPDATE salary_payments SET ${setClause} WHERE id = $${values.length} RETURNING *`,
        values
      );

      // Fetch with user names
      const withNames = await pool.query(`
      SELECT 
        sp.*,
        u1.name as created_by,
        u2.name as updated_by
      FROM salary_payments sp
      LEFT JOIN users u1 ON sp.created_by_user_id = u1.id
      LEFT JOIN users u2 ON sp.updated_by_user_id = u2.id
      WHERE sp.id = $1
    `, [id]);
      const updatedPayment = withNames.rows[0] || updated.rows[0] || { id: Number(id), ...updates };
      // Broadcast to all connected clients
      io.emit('salary_payment:updated', updatedPayment);
      res.json(updatedPayment);
    } catch (error) {
      console.error('Update salary payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/salary-payments/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM salary_payments WHERE id = $1', [id]);
      // Broadcast to all connected clients
      io.emit('salary_payment:deleted', { id: Number(id) });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete salary payment error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/upload', (req, res, next) => {
    currentUpload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Upload Error:', err);
        // If S3 fails, try to fall back to local disk for the NEXT request
        if (err.name === 'NoSuchBucket' || err.code === 'NoSuchBucket') {
          setStorageMode('local');
        }
        return res.status(500).json({
          error: 'Upload Failed',
          message: err.message,
          code: err.code || err.name
        });
      }
      next();
    });
  }, (req, res) => {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Upload endpoint hit');
        console.log('Request file:', req.file);
      }
      if (!req.file) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('No file in request');
        }
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const response = {
        filename: req.file.key || req.file.filename,
        originalName: req.file.originalname,
        path: `/api/uploads/${req.file.key ? req.file.key.replace('uploads/', '') : req.file.filename}`
      };
      console.log('Upload successful:', response);
      res.json(response);
    } catch (error) {
      console.error('File upload process error:', error);
      res.status(500).json({ error: 'Process error: ' + error.message });
    }
  });

  // Physical file deletion endpoint
  app.post('/api/upload/delete', async (req, res) => {
    try {
      const { filePath } = req.body;
      if (!filePath) return res.status(400).json({ error: 'No file path provided' });

      console.log('Attempting to physically delete file:', filePath);

      // 1. Handle S3 deletion (Supports both full S3 URLs and proxied paths)
      const isS3 = (filePath.startsWith('http') && filePath.includes('s3.amazonaws.com')) ||
        (process.env.USE_S3 === 'true' && filePath.includes('/api/uploads/'));

      if (isS3) {
        try {
          let key = '';
          if (filePath.startsWith('http')) {
            const url = new URL(filePath);
            key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
          } else {
            // Proxied path like /api/uploads/filename
            const filename = filePath.split('/').pop();
            key = `uploads/${filename}`;
          }

          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
          }));
          console.log('✅ S3 File physically deleted:', key);
        } catch (err) {
          console.error('❌ S3 Delete Error:', err.message);
        }
      }

      // 2. Handle Local deletion (Check even if S3 was attempted, for safety)
      const fileName = filePath.split('/').pop();
      const fullPath = path.join(uploadsDir, fileName);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
          console.log('✅ Local File physically deleted:', fullPath);
        } catch (err) {
          console.error('❌ Local Delete Error:', err.message);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('General Delete API error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Multiple file upload endpoint
  app.post('/api/upload-multiple', currentUpload.array('files', 10), (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      const files = req.files.map(file => ({
        filename: file.key || file.filename,
        originalName: file.originalname,
        path: `/api/uploads/${file.key ? file.key.replace('uploads/', '') : file.filename}`
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
      const salaryData = (await pool.query('SELECT SUM(amount) as total, COUNT(*) as count FROM salary_payments')).rows[0];

      const totalSales = salesData?.total || 0;
      const totalProfit = salesData?.totalProfit || 0;
      const salesCount = salesData?.count || 0;
      const totalExpenses = (Number(expensesData?.total) || 0) + (Number(salaryData?.total) || 0);
      const expensesCount = (Number(expensesData?.count) || 0) + (Number(salaryData?.count) || 0);
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

  // Socket.IO Connection Handler
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('error', (error) => {
      console.error('Socket error for client', socket.id, ':', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });
  });

  // Global Error Handler for Express
  app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
    });
  });

  // Start Server with Socket.IO
  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Socket.IO server ready`);
    console.log(`Upload endpoint available at http://localhost:${port}/api/upload`);
    console.log(`Uploads directory: ${uploadsDir}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
