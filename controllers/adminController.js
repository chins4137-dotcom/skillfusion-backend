// ============================================================
// SkillFusion — controllers/adminController.js
// ============================================================

const User        = require('../models/User');
const Mentorship  = require('../models/Mentorship');
const Session     = require('../models/Session');
const Dispute     = require('../models/Dispute');
const QuizResult  = require('../models/QuizResult');
const AuditLog    = require('../models/AuditLog');
const Notification= require('../models/Notification');

// GET /api/admin/dashboard ────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [users, mentorships, disputes, sessions, quizResults] = await Promise.all([
      User.find({ role: { $ne: 'admin' } }).select('-passwordHash'),
      Mentorship.find(),
      Dispute.find().sort({ filedAt: -1 }),
      Session.find().sort({ startedAt: -1 }).limit(50),
      QuizResult.find().sort({ date: -1 }).limit(50),
    ]);

    // DAU: count unique logins per day for last 7 days
    const now = new Date();
    const dauChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const start   = new Date(dateStr + 'T00:00:00.000Z');
      const end     = new Date(dateStr + 'T23:59:59.999Z');
      const count   = await AuditLog.countDocuments({ action: 'login', ts: { $gte: start, $lte: end } });
      dauChart.push({ date: dateStr, count });
    }

    // Skill demand heatmap
    const skillDemand = {};
    mentorships.forEach(m => { skillDemand[m.skill] = (skillDemand[m.skill] || 0) + 1; });

    // Enrollment funnel
    const funnel = {
      requests:  mentorships.length,
      demo:      mentorships.filter(m => m.phase === 'demo').length,
      enrolled:  mentorships.filter(m => m.phase === 'enrolled').length,
      completed: mentorships.filter(m => m.status === 'completed').length,
    };

    // Attach lastLoginIP to each user from AuditLog
    const auditRecords = await AuditLog.find({ action: 'login' }).sort({ ts: -1 });
    const ipMap = {};
    auditRecords.forEach(a => {
      const uid = String(a.userId);
      if (!ipMap[uid]) ipMap[uid] = { ip: a.ip, ts: a.ts };
    });

    const usersWithIP = users.map(u => ({
      ...u.toObject(),
      lastLoginIP: ipMap[String(u._id)]?.ip || u.lastLoginIP || null,
      lastLoginAt: ipMap[String(u._id)]?.ts  || u.lastLoginAt || null,
    }));

    res.json({ ok: true, users: usersWithIP, mentorships, disputes, sessionLogs: sessions, quizResults, dauChart, skillDemand, funnel });
  } catch (err) { next(err); }
};

// GET /api/admin/users ────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    // Admin view includes email (but never passwordHash)
    const users = await User.find({ role: { $ne: 'admin' } }).select('-passwordHash');
    res.json({ ok: true, users });
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/ban ───────────────────────────
exports.banUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot ban an admin' });

    user.banned  = true;
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    await user.save();

    await AuditLog.create({ userId: user._id, action: 'ban', ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
    await Notification.create({ userId: user._id, type: 'info', message: '🚫 Your account has been suspended by the admin.' });

    res.json({ ok: true, message: 'User banned' });
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/unban ─────────────────────────
exports.unbanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.banned  = false;
    user.bannedAt = undefined;
    await user.save();

    await AuditLog.create({ userId: user._id, action: 'unban', ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
    await Notification.create({ userId: user._id, type: 'info', message: '✅ Your account suspension has been lifted.' });

    res.json({ ok: true, message: 'User unbanned' });
  } catch (err) { next(err); }
};

// GET /api/admin/audits ───────────────────────────────────
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const query = userId ? { userId } : {};
    const logs  = await AuditLog.find(query).sort({ ts: -1 }).limit(200);
    res.json({ ok: true, logs });
  } catch (err) { next(err); }
};

// GET /api/admin/sessions ─────────────────────────────────
exports.getAllSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find()
      .sort({ startedAt: -1 })
      .limit(100)
      .populate('mentorId',  'name avatar')
      .populate('studentId', 'name avatar')
      .populate('mentorshipId', 'skill');
    res.json({ ok: true, sessions });
  } catch (err) { next(err); }
};

// GET /api/admin/disputes ─────────────────────────────────
exports.getDisputes = async (req, res, next) => {
  try {
    const disputes = await Dispute.find().sort({ filedAt: -1 })
      .populate('filedBy',     'name username')
      .populate('mentorshipId','skill mentorId studentId');
    res.json({ ok: true, disputes });
  } catch (err) { next(err); }
};

// PATCH /api/admin/disputes/:id ───────────────────────────
exports.resolveDispute = async (req, res, next) => {
  try {
    const { resolution } = req.body;
    if (!resolution) return res.status(400).json({ message: 'Resolution note required' });

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    if (dispute.status === 'resolved') return res.status(400).json({ message: 'Already resolved' });

    dispute.status     = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    res.json({ ok: true, dispute });
  } catch (err) { next(err); }
};
