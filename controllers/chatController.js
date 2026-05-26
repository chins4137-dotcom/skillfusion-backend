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
    const { message, messageType, slotDay, slotTime, slotStatus } = req.body;
    const { mentorshipId } = req.params;
    const senderId = req.user._id;

    if (!message?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    const m = await Mentorship.findById(mentorshipId);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    const isParticipant = String(m.mentorId) === String(senderId) || String(m.studentId) === String(senderId);
    if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });

    const receiverId = String(m.mentorId) === String(senderId) ? m.studentId : m.mentorId;

    const msg = await ChatMessage.create({ 
      mentorshipId, 
      senderId, 
      receiverId, 
      message: message.trim(),
      messageType: messageType || 'text',
      slotDay,
      slotTime,
      slotStatus
    });
    res.status(201).json({ ok: true, message: msg });
  } catch (err) { next(err); }
};

// PATCH /api/chat/message/:messageId ───────────────────────
exports.respondToSlot = async (req, res, next) => {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    const { messageId } = req.params;
    const userId = req.user._id;

    const msg = await ChatMessage.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const m = await Mentorship.findById(msg.mentorshipId);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    if (String(m.mentorId) !== String(userId)) {
      return res.status(403).json({ message: 'Only the mentor can respond to slot requests' });
    }

    if (msg.messageType !== 'slot_request') {
      return res.status(400).json({ message: 'Not a slot request message' });
    }

    if (msg.slotStatus !== 'pending') {
      return res.status(400).json({ message: 'Already responded to this slot request' });
    }

    const Session = require('../models/Session');

    if (action === 'accept') {
      msg.slotStatus = 'accepted';
      
      // Auto-schedule a new Live Session
      await Session.create({
        mentorshipId: m._id,
        mentorId: m.mentorId,
        studentId: m.studentId,
        skill: m.skill,
        jitsiRoom: `sf-${m._id}`,
        startedAt: new Date()
      });
    } else {
      msg.slotStatus = 'rejected';
    }

    await msg.save();

    // Notify the user via a system message in the chat
    await ChatMessage.create({
      mentorshipId: msg.mentorshipId,
      senderId: userId,
      receiverId: m.studentId,
      message: `📅 Demo Slot Request was ${action === 'accept' ? 'ACCEPTED' : 'REJECTED'} for ${msg.slotDay} at ${msg.slotTime}.`
    });

    res.json({ ok: true, message: msg });
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
