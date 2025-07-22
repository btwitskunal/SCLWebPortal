require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');

const uploadRoutes = require('./routes/upload');
const analysisRoutes = require('./routes/analysis');
const templateRoutes = require('./routes/template');
const { syncDataTableSchema } = require('./utils/templateManager');

const app = express();

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Sync database schema on startup
syncDataTableSchema().then(() => {
  console.log('Database schema synchronized with template.xlsx');
}).catch(err => {
  console.error('Failed to synchronize database schema:', err);
  process.exit(1);
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bypass authentication: just allow all requests
app.use((req, res, next) => {
  // Simulate a logged-in user for testing
  req.user = { id: 1, name: 'Test User', email: 'test@example.com' };
  next();
});

// Routes (no auth required)
app.use('/upload', uploadRoutes);
app.use('/analysis', analysisRoutes);
app.use('/template', templateRoutes);

app.get('/', (req, res) => {
  res.send('Test server running. Authentication is bypassed.');
});

const PORT = process.env.TEST_PORT || 4000;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});