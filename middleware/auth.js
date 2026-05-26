// ============================================================
// SkillFusion — middleware/auth.js
// JWT verification + role-based access control
// ============================================================

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── protect: verify JWT Bearer token ─────────────────────
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorised — token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user (without passwordHash) to request
    req.user = await User.findById(decoded.id).select('-passwordHash');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    if (req.user.banned) return res.status(403).json({ message: 'Account suspended' });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }
};

// ── adminOnly: must be logged in AND role === 'admin' ─────
const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorised' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// ── mentorOnly: activeRole must be mentor ─────────────────
const mentorOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorised' });
  if ((req.user.activeRole || req.user.role) !== 'mentor') {
    return res.status(403).json({ message: 'Mentor role required' });
  }
  next();
};

module.exports = { protect, adminOnly, mentorOnly };
