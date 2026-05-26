// ============================================================
// SkillFusion — controllers/notificationController.js
// ============================================================

const Notification = require('../models/Notification');

// GET /api/notifications ──────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const notifs = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    const unread = notifs.filter(n => !n.read).length;
    res.json({ ok: true, notifications: notifs, unreadCount: unread });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/read ───────────────────────────
exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read ─────────────────────────
exports.markOneRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    
    notif.read = true;
    await notif.save();
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /api/notifications ───────────────────────────────
exports.clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
