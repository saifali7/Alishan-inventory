const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS - all Netlify domains allow
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'https://alishan-inventory.netlify.app',
      /\.netlify\.app$/,
      /\.onrender\.com$/
    ];
    
    if (!origin) return callback(null, true);
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

// ✅ SIMPLE IN-MEMORY STORAGE (No PostgreSQL needed)
const userStorage = new Map();

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'ALISHAN Backend',
    database: 'In-Memory Storage ✅',
    timestamp: new Date().toISOString(),
    users: userStorage.size,
    message: 'Working perfectly without database!'
  });
});

// ✅ Save inventory data
app.post('/api/inventory/save', (req, res) => {
  try {
    const { userId, inventoryData } = req.body;
    
    if (!userId || !inventoryData) {
      return res.status(400).json({
        success: false,
        error: 'userId and inventoryData are required'
      });
    }

    // Store in memory
    userStorage.set(userId, {
      inventoryData: inventoryData,
      savedAt: new Date().toISOString(),
      deviceInfo: req.headers['user-agent'] || 'Unknown'
    });

    res.json({ 
      success: true, 
      message: 'Data saved successfully ✅',
      savedAt: new Date().toISOString(),
      userCount: userStorage.size
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save data'
    });
  }
});

// ✅ Load inventory data
app.get('/api/inventory/load/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userStorage.has(userId)) {
      return res.json({ 
        success: true, 
        data: null,
        message: 'No data found for this user'
      });
    }

    const userData = userStorage.get(userId);

    res.json({ 
      success: true, 
      data: userData.inventoryData,
      lastUpdated: userData.savedAt,
      message: 'Data loaded successfully ✅'
    });
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load data'
    });
  }
});

// ✅ Get user's sync history
app.get('/api/inventory/history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userStorage.has(userId)) {
      return res.json({ 
        success: true, 
        history: [],
        total: 0
      });
    }

    const userData = userStorage.get(userId);
    
    res.json({ 
      success: true, 
      history: [{
        id: userId,
        updated_at: userData.savedAt,
        device_info: userData.deviceInfo
      }],
      total: 1
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load history'
    });
  }
});

// ✅ Database setup endpoint (for compatibility)
app.get('/api/setup-database', (req, res) => {
  res.json({
    success: true,
    message: 'In-memory storage ready ✅',
    timestamp: new Date().toISOString(),
    storageType: 'In-Memory (No PostgreSQL required)'
  });
});

// ✅ Get all users (for debugging)
app.get('/api/debug/users', (req, res) => {
  const users = Array.from(userStorage.entries()).map(([userId, data]) => ({
    userId,
    savedAt: data.savedAt,
    itemCount: data.inventoryData ? data.inventoryData.length : 0
  }));
  
  res.json({
    success: true,
    totalUsers: userStorage.size,
    users: users
  });
});

// ✅ Clear storage (for testing)
app.delete('/api/debug/clear', (req, res) => {
  const previousSize = userStorage.size;
  userStorage.clear();
  
  res.json({
    success: true,
    message: 'Storage cleared',
    previousUsers: previousSize,
    currentUsers: userStorage.size
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ALISHAN Backend is running! 🚀',
    endpoints: {
      health: '/api/health',
      save: '/api/inventory/save',
      load: '/api/inventory/load/:userId',
      history: '/api/inventory/history/:userId',
      setup: '/api/setup-database'
    },
    storage: 'In-Memory (No Database Required) ✅',
    timestamp: new Date().toISOString(),
    status: 'READY'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ALISHAN Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Storage: In-Memory (No PostgreSQL)`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Ready for frontend connections!`);
});