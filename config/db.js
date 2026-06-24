// ============================================================
// SkillFusion — config/db.js  (MongoDB Atlas connection)
// ============================================================

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);
  } catch (err) {
    console.log(`⚠️ MongoDB Atlas connection failed: ${err.message}. Trying local fallback...`);
    try {
      const conn = await mongoose.connect('mongodb://localhost:27017/skillfusion', {
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 45000,
      });
      console.log(`✅ Local MongoDB connected fallback: ${conn.connection.host}`);
    } catch (localErr) {
      console.error(`❌ All MongoDB connections failed: ${localErr.message}`);
      process.exit(1);
    }
  }

  // Graceful teardown on process exit
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed (SIGINT)');
    process.exit(0);
  });
};

module.exports = connectDB;
