/**
 * SkillFusion - Atlas Seeder
 * Adds sample mentor and student accounts to the database.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/db');

const seedUsers = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing sample users...');
    // Only delete users that we are about to create to avoid wiping user's real data
    const sampleUsernames = [
      'sarah_dev', 'alex_pro', 'maria_ux', 'klaus_sec', 'jane_biz',
      'john_student', 'lisa_learn', 'kevin_new'
    ];
    await User.deleteMany({ username: { $in: sampleUsernames } });

    const salt = await bcrypt.genSalt(12);
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const users = [
      // Mentors
      {
        username: 'sarah_dev',
        email: 'sarah@skillfusion.com',
        passwordHash,
        name: 'Sarah Chen',
        avatar: '👩‍💻',
        bio: 'Senior Full Stack Engineer @ TechGiant. Expert in React, Node.js and Cloud Architecture.',
        role: 'mentor',
        roles: ['mentor', 'student'],
        activeRole: 'mentor',
        skillsToTeach: ['React', 'Node.js', 'JavaScript', 'TypeScript', 'Cloud Computing'],
        verifiedSkills: ['React', 'Node.js', 'Cloud Computing'],
        xp: 2500,
        averageRating: 4.9
      },
      {
        username: 'alex_pro',
        email: 'alex@skillfusion.com',
        passwordHash,
        name: 'Alex Rivera',
        avatar: '👨‍🏫',
        bio: 'Blockchain Architect and System Programmer. Specialist in Go, Rust, and Solidity.',
        role: 'mentor',
        roles: ['mentor', 'student'],
        activeRole: 'mentor',
        skillsToTeach: ['Blockchain', 'Solidity', 'Python', 'Go', 'Rust'],
        verifiedSkills: ['Blockchain', 'Python', 'Go', 'Rust'],
        xp: 3200,
        averageRating: 4.8
      },
      {
        username: 'maria_ux',
        email: 'maria@skillfusion.com',
        passwordHash,
        name: 'Maria Santos',
        avatar: '🎨',
        bio: 'Lead Product Designer & PM. Crafting immersive AR/VR experiences.',
        role: 'mentor',
        roles: ['mentor', 'student'],
        activeRole: 'mentor',
        skillsToTeach: ['UI/UX Design', 'Figma', 'AR/VR', 'Product Management'],
        verifiedSkills: ['UI/UX Design', 'Product Management'],
        xp: 1800,
        averageRating: 5.0
      },

      // Students
      {
        username: 'john_student',
        email: 'john@gmail.com',
        passwordHash,
        name: 'John Doe',
        avatar: '👨‍🎓',
        bio: 'Computer Science student looking to master web development.',
        role: 'student',
        roles: ['student'],
        activeRole: 'student',
        skillsToLearn: ['React', 'Node.js'],
        xp: 450
      },
      {
        username: 'lisa_learn',
        email: 'lisa@outlook.com',
        passwordHash,
        name: 'Lisa Wong',
        avatar: '👩‍🎓',
        bio: 'Marketing professional transitioning into UI/UX design.',
        role: 'student',
        roles: ['student'],
        activeRole: 'student',
        skillsToLearn: ['UI/UX Design', 'Figma'],
        xp: 120
      },
      {
        username: 'kevin_new',
        email: 'kevin@yahoo.com',
        passwordHash,
        name: 'Kevin Smith',
        avatar: '🧑‍🎓',
        bio: 'Aspiring blockchain developer.',
        role: 'student',
        roles: ['student'],
        activeRole: 'student',
        skillsToLearn: ['Blockchain', 'Solidity'],
        xp: 50
      },
      {
        username: 'klaus_sec',
        email: 'klaus@skillfusion.com',
        passwordHash,
        name: 'Klaus Weber',
        avatar: '🛡️',
        bio: 'Embedded Systems Engineer & Ethical Hacker. Specialist in hardware security.',
        role: 'mentor',
        roles: ['mentor', 'student'],
        activeRole: 'mentor',
        skillsToTeach: ['Embedded Systems', 'Ethical Hacking', 'C++', 'Cybersecurity'],
        verifiedSkills: ['Embedded Systems', 'Ethical Hacking'],
        xp: 2100,
        averageRating: 4.7
      },
      {
        username: 'jane_biz',
        email: 'jane@skillfusion.com',
        passwordHash,
        name: 'Jane Miller',
        avatar: '📈',
        bio: 'Agile Coach and Digital Marketing Strategist. Helping startups scale.',
        role: 'mentor',
        roles: ['mentor', 'student'],
        activeRole: 'mentor',
        skillsToTeach: ['Digital Marketing', 'Agile/Scrum', 'Content Strategy', 'Product Management'],
        verifiedSkills: ['Digital Marketing', 'Agile/Scrum'],
        xp: 1500,
        averageRating: 4.6
      }
    ];

    console.log('🌱 Seeding users...');
    await User.insertMany(users);

    console.log('✅ Seeding complete!');
    console.log('-----------------------------------');
    console.log('Default Password for all: password123');
    console.log('Mentors: sarah_dev, alex_pro, maria_ux');
    console.log('Students: john_student, lisa_learn, kevin_new');
    console.log('-----------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seedUsers();
