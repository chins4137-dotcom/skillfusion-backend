// ============================================================
// SkillFusion — controllers/disputeController.js
// ============================================================

const Dispute     = require('../models/Dispute');
const Mentorship  = require('../models/Mentorship');
const Notification= require('../models/Notification');

// POST /api/disputes ──────────────────────────────────────
exports.fileDispute = async (req, res, next) => {
  try {
    const { mentorshipId, reason, description, sessionId } = req.body;
    if (!mentorshipId || !reason) return res.status(400).json({ message: 'mentorshipId and reason are required' });

    const m = await Mentorship.findById(mentorshipId);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    const isParticipant = String(m.mentorId) === String(req.user._id) || String(m.studentId) === String(req.user._id);
    if (!isParticipant) return res.status(403).json({ message: 'Not a participant of this mentorship' });

    const dispute = await Dispute.create({
      mentorshipId, 
      filedBy: req.user._id,
      skill:  m.skill,
      reason,
      description,
      sessionId
    });

    await Notification.create({
      userId:  m.mentorId,
      type:    'info',
      message: `⚠️ A dispute has been filed for the ${m.skill} mentorship. Admin will review shortly.`,
    });

    res.status(201).json({ ok: true, dispute });
  } catch (err) { next(err); }
};

// GET /api/disputes (admin) ───────────────────────────────
exports.getDisputes = async (req, res, next) => {
  try {
    const disputes = await Dispute.find().sort({ filedAt: -1 })
      .populate('filedBy', 'name username')
      .populate('mentorshipId', 'skill');
    res.json({ ok: true, disputes });
  } catch (err) { next(err); }
};

// PATCH /api/disputes/:id/resolve ─────────────────────────
exports.resolveDispute = async (req, res, next) => {
  try {
    const { resolution } = req.body;
    if (!resolution) return res.status(400).json({ message: 'Resolution note is required' });

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
