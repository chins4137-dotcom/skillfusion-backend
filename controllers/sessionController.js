// ============================================================
// SkillFusion — controllers/sessionController.js
// ============================================================

const Session     = require('../models/Session');
const Mentorship  = require('../models/Mentorship');

// Helper: derive a stable Jitsi room from mentorship ID
const jitsiRoom = (mentorshipId) => `sf-${mentorshipId}`;

// GET /api/sessions/room/:mentorshipId ────────────────────
exports.getRoom = async (req, res, next) => {
  try {
    res.json({ ok: true, room: jitsiRoom(req.params.mentorshipId) });
  } catch (err) { next(err); }
};

// GET /api/sessions/:mentorshipId ─────────────────────────
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ mentorshipId: req.params.mentorshipId })
      .sort({ startedAt: -1 });
    res.json({ ok: true, sessions });
  } catch (err) { next(err); }
};

// POST /api/sessions/start ──────────────────────────────────
exports.startSession = async (req, res, next) => {
  try {
    const { mentorshipId } = req.body;
    const m = await Mentorship.findById(mentorshipId);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    const session = await Session.create({
      mentorshipId,
      mentorId:  m.mentorId,
      studentId: m.studentId,
      skill:     m.skill,
      jitsiRoom: jitsiRoom(mentorshipId),
      startedAt: new Date(),
    });

    // Mark mentorship as active
    m.activeSession = true;
    m.sessionStartedAt = session.startedAt;
    await m.save();

    res.status(201).json({ ok: true, session });
  } catch (err) { next(err); }
};

// POST /api/sessions/:id/stop ──────────────────────────────
exports.stopSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    if (!session.endedAt) {
      session.endedAt = new Date();
      session.duration = Math.max(0, Math.round((session.endedAt - session.startedAt) / 1000));
      
      // Add a realistic mock recording link
      session.recordingAvailable = true;
      session.recordingLink = `https://vjs.zencdn.net/v/oceans.mp4`;
      
      // Calculate XP gained (e.g. 1XP per min, min 15XP)
      const xp = Math.max(15, Math.round(session.duration / 60));
      session.xpGained = xp;
      
      await session.save();

      // Update mentorship
      await Mentorship.findByIdAndUpdate(session.mentorshipId, { 
        $inc: { sessionCount: 1 },
        $set: { activeSession: false }
      });
      
      // Award XP to participants
      const User = require('../models/User');
      await User.findByIdAndUpdate(session.mentorId, { $inc: { xp: xp, weeklyXP: xp } });
      await User.findByIdAndUpdate(session.studentId, { $inc: { xp: xp, weeklyXP: xp } });
    }

    res.json({ ok: true, session });
  } catch (err) { next(err); }
};
