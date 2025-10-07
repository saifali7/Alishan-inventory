const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection - Render automatically provides DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'https://yourusername.github.io',
      'https://alishan-inventory.netlify.app',
      'https://alishaninventory.netlify.app',
      /\.netlify\.app$/,
      /\.onrender\.com$/
    ];
    
    if (allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') return origin === pattern;
      if (pattern instanceof RegExp) return pattern.test(origin);
      return false;
    })) {
      return callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ✅ Database setup endpoint
app.get('/api/setup-database', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_data (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        inventory_data JSONB NOT NULL,
        device_info TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_id ON inventory_data(user_id);
      CREATE INDEX IF NOT EXISTS idx_updated_at ON inventory_data(updated_at);
    `);
    
    res.json({ 
      success: true, 
      message: 'Database setup completed successfully',
      table: 'inventory_data'
    });
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ✅ Save inventory data
app.post('/api/inventory/save', async (req, res) => {
  try {
    const { userId, inventoryData } = req.body;
    
    if (!userId || !inventoryData) {
      return res.status(400).json({
        success: false,
        error: 'userId and inventoryData are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO inventory_data (user_id, inventory_data, device_info) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         inventory_data = $2, 
         device_info = $3, 
         updated_at = NOW() 
       RETURNING id, user_id, updated_at`,
      [userId, inventoryData, req.headers['user-agent'] || 'Unknown']
    );

    res.json({ 
      success: true, 
      message: 'Data saved successfully',
      record: result.rows[0],
      savedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save data to database'
    });
  }
});

// ✅ Load inventory data
app.get('/api/inventory/load/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT inventory_data, updated_at 
       FROM inventory_data 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        success: true, 
        data: null,
        message: 'No data found for this user'
      });
    }

    res.json({ 
      success: true, 
      data: result.rows[0].inventory_data,
      lastUpdated: result.rows[0].updated_at,
      message: 'Data loaded successfully'
    });
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load data from database'
    });
  }
});

// ✅ Get user's sync history
app.get('/api/inventory/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT id, updated_at, device_info 
       FROM inventory_data 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 10`,
      [userId]
    );

    res.json({ 
      success: true, 
      history: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load history'
    });
  }
});

// ✅ Health check with database status
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW() as time, version() as version');
    
    res.json({
      status: 'OK',
      service: 'ALISHAN Backend',
      database: 'PostgreSQL',
      timestamp: new Date().toISOString(),
      databaseConnected: true,
      dbTime: dbResult.rows[0].time,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      service: 'ALISHAN Backend',
      database: 'PostgreSQL - DISCONNECTED',
      timestamp: new Date().toISOString(),
      databaseConnected: false,
      error: error.message
    });
  }
});

// ✅ Deprecated Google Config (for backward compatibility)
app.get('/api/google-config', (req, res) => {
  res.json({
    success: false,
    message: 'Google Drive is deprecated. Please use cloud storage.',
    alternative: 'Use /api/inventory/save for data storage',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ALISHAN Inventory Backend is running!',
    endpoints: {
      health: '/api/health',
      setup: '/api/setup-database',
      save: '/api/inventory/save',
      load: '/api/inventory/load/:userId',
      history: '/api/inventory/history/:userId'
    },
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ALISHAN Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: PostgreSQL`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
});