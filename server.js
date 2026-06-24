// ============================================================
// SkillFusion Backend — server.js (Entry Point)
// ============================================================

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const mongoose  = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Atlas connected`);

    // Auto-seed Admin account if it does not exist
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const existing = await User.findOne({ username: 'admin' });
    if (!existing) {
      const passwordHash = await bcrypt.hash('admin123', 12);
      await User.create({
        username:      'admin',
        email:         'admin@skillfusion.app',
        passwordHash,
        name:          'SF Admin',
        avatar:        '🛡️',
        role:          'admin',
        roles:         ['admin'],
        activeRole:    'admin',
        xp:            0,
        badges:        [],
        skillsToLearn: [],
        skillsToTeach: [],
        verifiedSkills:[],
        ratings:       [],
        averageRating: 0,
      });
      console.log('✅ Admin user auto-seeded on startup (username: admin / password: admin123)');
    }
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
  }
};
const errorHandler = require('./middleware/errorHandler');

// ── Connect to MongoDB Atlas ──────────────────────────────
connectDB();

const app = express();

const path = require('path');

// ── Core Middleware ───────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/admin', express.static(path.join(__dirname, 'public')));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Admin Web Route ───────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/mentorship',    require('./routes/mentorship'));
app.use('/api/quiz',          require('./routes/quiz'));
app.use('/api/sessions',      require('./routes/sessions'));
app.use('/api/vault',         require('./routes/vault'));
app.use('/api/chat',          require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/disputes',      require('./routes/disputes'));
app.use('/api/admin',         require('./routes/admin'));

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global error handler ──────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────
const PORT = process.env.PORT || 8082;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SkillFusion API running on port ${PORT}`);
  });
}

module.exports = app;
