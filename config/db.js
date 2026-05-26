// ============================================================
// SkillFusion — config/db.js  (MongoDB Atlas connection)
// ============================================================

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options suppress deprecation warnings in Mongoose 7+
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Atlas connected: ${conn.connection.host}`);

    // Graceful teardown on process exit
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed (SIGINT)');
      process.exit(0);
    });

  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    console.error('   → Check MONGO_URI in your .env file');
    process.exit(1);
  }
};

module.exports = connectDB;
