// ============================================================
// SkillFusion — controllers/chatController.js
// REST-based (polled) chat per mentorship
// ============================================================

const ChatMessage = require('../models/ChatMessage');
const Mentorship  = require('../models/Mentorship');

// GET /api/chat/:mentorshipId ─────────────────────────────
exports.getMessages = async (req, res, next) => {
  try {
    const { mentorshipId } = req.params;
    const userId = req.user._id;

    const m = await Mentorship.findById(mentorshipId);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    const isParticipant = String(m.mentorId) === String(userId) || String(m.studentId) === String(userId);
    if (!isParticipant && req.user.role !== 'admin') return res.status(403).json({ message: 'Not a participant' });

    const messages = await ChatMessage.find({ mentorshipId }).sort({ timestamp: 1 }).populate('senderId', 'name username');
    res.json({ ok: true, messages });
  } catch (err) { next(err); }
};

// POST /api/chat/:mentorshipId ────────────────────────────
exports.sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    const { mentorshipId } = req.params;
    const senderId = req.user._id;

    if (!message?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    const m = await Mentorship.findById(mentorshipId);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    const isParticipant = String(m.mentorId) === String(senderId) || String(m.studentId) === String(senderId);
    if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });

    const receiverId = String(m.mentorId) === String(senderId) ? m.studentId : m.mentorId;

    const msg = await ChatMessage.create({ mentorshipId, senderId, receiverId, message: message.trim() });
    res.status(201).json({ ok: true, message: msg });
  } catch (err) { next(err); }
};

// PATCH /api/chat/:mentorshipId/read ──────────────────────
exports.markRead = async (req, res, next) => {
  try {
    await ChatMessage.updateMany(
      { mentorshipId: req.params.mentorshipId, receiverId: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// GET unread count across all mentorships ─────────────────
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await ChatMessage.countDocuments({ receiverId: req.user._id, read: false });
    res.json({ ok: true, count });
  } catch (err) { next(err); }
};
