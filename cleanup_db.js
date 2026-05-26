
const mongoose = require('mongoose');
const Session = require('./models/Session');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function cleanup() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const result = await Session.updateMany(
      { recordingLink: { $regex: /youtube\.com|vimeo\.com|mentorship-vault/ } },
      { $set: { recordingLink: 'https://vjs.zencdn.net/v/oceans.mp4' } }
    );

    console.log(`Updated ${result.modifiedCount} sessions with correct recording links.`);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
