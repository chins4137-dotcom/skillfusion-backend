
const mongoose = require('mongoose');
const Mentorship = require('./models/Mentorship');
const Session = require('./models/Session');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = "mongodb+srv://skillfusionwebapp_db_user:bmsceapp@cluster0.vyg8wvr.mongodb.net/skillfusion?retryWrites=true&w=majority";

async function seedSessions() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const m = await Mentorship.findOne({ status: 'accepted' });
    if (!m) {
      console.log('No active mentorship found to attach sessions to. Please accept a request first!');
      process.exit();
    }

    console.log(`Found mentorship for ${m.skill}. Creating demo logs...`);

    const sessions = [
      {
        mentorshipId: m._id,
        mentorId: m.mentorId,
        studentId: m.studentId,
        skill: m.skill,
        jitsiRoom: `SF-${m._id}`,
        startedAt: new Date(Date.now() - 172800000), // 2 days ago
        endedAt: new Date(Date.now() - 172800000 + 2700000), // 45 mins later
        duration: 2700,
        recordingAvailable: true,
        recordingLink: "https://mentorship-vault.skillfusion.com/recordings/demo-session-ref"
      },
      {
        mentorshipId: m._id,
        mentorId: m.mentorId,
        studentId: m.studentId,
        skill: m.skill,
        jitsiRoom: `SF-${m._id}`,
        startedAt: new Date(Date.now() - 86400000), // 1 day ago
        endedAt: new Date(Date.now() - 86400000 + 3600000), // 60 mins later
        duration: 3600,
        recordingAvailable: true,
        recordingLink: "https://mentorship-vault.skillfusion.com/recordings/demo-session-ref"
      },
      {
        mentorshipId: m._id,
        mentorId: m.mentorId,
        studentId: m.studentId,
        skill: m.skill,
        jitsiRoom: `SF-${m._id}`,
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
        endedAt: new Date(Date.now() - 1800000), // 30 mins later
        duration: 1800,
        recordingAvailable: true,
        recordingLink: "https://mentorship-vault.skillfusion.com/recordings/demo-session-ref"
      }
    ];

    await Session.insertMany(sessions);
    console.log('Successfully injected 3 demo recorded sessions!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedSessions();
