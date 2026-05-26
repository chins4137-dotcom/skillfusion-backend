// ============================================================
// SkillFusion — config/seed.js
// Run once: node config/seed.js
// Seeds a default admin user into MongoDB Atlas
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas for seeding...\n');

    // Dynamically require after connection
    const User = require('../models/User');

    // ── Admin user ───────────────────────────────────────
    const existing = await User.findOne({ username: 'admin' });
    if (existing) {
      console.log('✅ Admin user already exists — skipping seed.');
    } else {
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
      console.log('✅ Admin user created (username: admin / password: admin123)');
    }

    // ── Demo mentor ──────────────────────────────────────
    const mentor = await User.findOne({ username: 'arjun_s' });
    if (!mentor) {
      const passwordHash = await bcrypt.hash('pass123', 12);
      await User.create({
        username:       'arjun_s',
        email:          'arjun@demo.com',
        passwordHash,
        name:           'Arjun Sharma',
        avatar:         '👨‍💻',
        role:           'mentor',
        roles:          ['mentor', 'student'],
        activeRole:     'mentor',
        xp:             3200,
        badges:         ['rising_star', 'skill_master', 'certified_pro'],
        skillsToLearn:  [],
        skillsToTeach:  ['JavaScript', 'React', 'Node.js'],
        verifiedSkills: ['JavaScript', 'React'],
        ratings:        [{ value: 5 }, { value: 4 }, { value: 5 }],
        averageRating:  4.7,
        bio:            'Full-stack dev with 5 years experience.',
      });
      console.log('✅ Demo mentor created (username: arjun_s / password: pass123)');
    }

    // ── Demo student ─────────────────────────────────────
    const student = await User.findOne({ username: 'meera_k' });
    if (!student) {
      const passwordHash = await bcrypt.hash('pass123', 12);
      await User.create({
        username:       'meera_k',
        email:          'meera@demo.com',
        passwordHash,
        name:           'Meera Krishnan',
        avatar:         '👩‍🎓',
        role:           'student',
        roles:          ['student'],
        activeRole:     'student',
        xp:             450,
        badges:         ['rising_star'],
        skillsToLearn:  ['JavaScript', 'React'],
        skillsToTeach:  [],
        verifiedSkills: [],
        ratings:        [],
        averageRating:  0,
      });
      console.log('✅ Demo student created (username: meera_k / password: pass123)');
    }

    console.log('\n🎉 Seeding complete!\n');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
