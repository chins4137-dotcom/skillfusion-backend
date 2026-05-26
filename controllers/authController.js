// ============================================================
// SkillFusion — controllers/authController.js
// ============================================================

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

// ── Helper: issue JWT ─────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY || '8h' });

// ── Helper: get request IP ───────────────────────────────
const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '0.0.0.0';

// POST /api/auth/register ─────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, name, role, skillsToLearn, skillsToTeach, avatar, bio } = req.body;

    if (!username || !email || !password || !name || !role) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      const field = existing.username === username ? 'Username' : 'Email';
      return res.status(409).json({ message: `${field} is already taken` });
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      username, email, passwordHash, name,
      avatar:        avatar  || (role === 'mentor' ? '👨‍🏫' : '👨‍🎓'),
      bio:           bio     || '',
      role,
      roles:         [role],
      activeRole:    role,
      skillsToLearn: skillsToLearn || [],
      skillsToTeach: skillsToTeach || [],
      lastLoginIP:   getIP(req),
      lastLoginAt:   new Date(),
    });

    // Welcome notification
    await Notification.create({
      userId:  user._id,
      type:    'info',
      message: `🎉 Welcome to SkillFusion, ${name}! Start exploring mentors or take a skill quiz to get verified.`,
    });

    await AuditLog.create({ userId: user._id, action: 'login', ip: getIP(req), userAgent: req.headers['user-agent'] });

    const token = signToken(user._id);
    res.status(201).json({ ok: true, token, user: user.toPublic() });

  } catch (err) { next(err); }
};

// POST /api/auth/login ────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required' });

    // Select passwordHash explicitly (it's excluded by default)
    const user = await User.findOne({ username }).select('+passwordHash');
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid username or password' });
    if (user.banned) return res.status(403).json({ ok: false, message: 'Your account has been suspended. Contact support.' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ ok: false, message: 'Invalid username or password' });

    // Update last-login tracking
    user.lastLoginIP  = getIP(req);
    user.lastLoginAt  = new Date();
    await user.save();

    await AuditLog.create({ userId: user._id, action: 'login', ip: getIP(req), userAgent: req.headers['user-agent'] });

    const token = signToken(user._id);
    res.json({ ok: true, token, user: user.toPublic() });

  } catch (err) { next(err); }
};

// GET /api/auth/me ────────────────────────────────────────
exports.getMe = async (req, res) => {
  res.json({ ok: true, user: req.user.toPublic() });
};

// POST /api/auth/toggle-role ──────────────────────────────
exports.toggleRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = req.user;

    if (!user.roles.includes(role)) {
      return res.status(400).json({ message: `You don't have the ${role} role` });
    }
    user.activeRole = role;
    await user.save();

    res.json({ ok: true, user: user.toPublic() });
  } catch (err) { next(err); }
};

// POST /api/auth/add-role ─────────────────────────────────
// Called after a student first passes a quiz (auto-promotes to dual-role)
exports.addRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = req.user;

    if (!['student', 'mentor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!user.roles.includes(role)) {
      user.roles.push(role);
      if (role === 'mentor') user.role = 'mentor'; // promote primary role
      await user.save();
    }
    res.json({ ok: true, user: user.toPublic() });
  } catch (err) { next(err); }
};
