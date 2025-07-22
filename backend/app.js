require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const templateRoutes = require('./routes/template');
const analysisRoutes = require('./routes/analysis');
const { syncDataTableSchema } = require('./utils/templateManager');

const app = express();

// Sync database schema on startup
syncDataTableSchema().then(() => {
  console.log('Database schema synchronized with template.xlsx');
}).catch(err => {
  console.error('Failed to synchronize database schema:', err);
  // Exit the process if schema sync fails, as it's a critical error
  process.exit(1);
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/upload', uploadRoutes);
app.use('/template', templateRoutes);
app.use('/analysis', analysisRoutes);

app.get('/', (req, res) => {
  res.send('Backend API is running.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
