// ============================================================
// SkillFusion — controllers/mentorshipController.js
// ============================================================

const Mentorship   = require('../models/Mentorship');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const Session      = require('../models/Session');

const XP_ENROLLED    = 30;
const XP_COMPLETED_STUDENT = 100;
const XP_COMPLETED_MENTOR  = 150;
const XP_DISTINCTION = 200;
const XP_MERIT       = 100;
const EIGHT_WEEKS_MS = 56 * 24 * 60 * 60 * 1000;

// Helper: push XP to a user and check badges
async function awardXP(userId, amount) {
  const user = await User.findById(userId);
  if (!user) return;
  user.xp       += amount;
  user.weeklyXP += amount;
  // Badge checks
  if (user.xp >= 50  && !user.badges.includes('rising_star'))  user.badges.push('rising_star');
  if (user.xp >= 1000 && !user.badges.includes('skill_master')) user.badges.push('skill_master');
  await user.save();
}

// GET /api/mentorship ─────────────────────────────────────
exports.getMyMentorships = async (req, res, next) => {
  try {
    const userId = req.user._id;
    // Allow explicit role override via ?as=student or ?as=mentor
    const asRole = req.query.as || req.user.activeRole || req.user.role;
    const query  = asRole === 'mentor' ? { mentorId: userId } : { studentId: userId };
    const list   = await Mentorship.find(query).sort({ createdAt: -1 })
      .populate('mentorId',  'name avatar username xp verifiedSkills averageRating')
      .populate('studentId', 'name avatar username xp');
    res.json({ ok: true, mentorships: list });
  } catch (err) { next(err); }
};

// GET /api/mentorship/:id ─────────────────────────────────
exports.getMentorshipById = async (req, res, next) => {
  try {
    const m = await Mentorship.findById(req.params.id)
      .populate('mentorId',  'name avatar username xp verifiedSkills averageRating')
      .populate('studentId', 'name avatar username xp');
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    // AUTO-CHECK: If session is active but heartbeat is > 45s old, end it automatically
    if (m.activeSession && m.sessionLastHeartbeat && (Date.now() - new Date(m.sessionLastHeartbeat) > 45000)) {
      console.log(`[Auto-End] Session for mentorship ${m._id} timed out.`);
      m.activeSession = false;
      m.sessionCount += 1;
      await m.save();
      // Finalize session log — find by missing endedAt (no status field exists)
      const latestSession = await Session.findOne({ mentorshipId: m._id, endedAt: null }).sort({ startedAt: -1 });
      if (latestSession) {
        latestSession.endedAt  = m.sessionLastHeartbeat || new Date();
        const start = m.sessionStartedAt ? new Date(m.sessionStartedAt) : null;
        const end   = latestSession.endedAt;
        latestSession.duration          = start && end ? Math.max(0, Math.round((end - start) / 1000)) : 0;
        latestSession.recordingAvailable = true;
        latestSession.recordingLink     = `https://www.youtube.com/results?search_query=${encodeURIComponent(latestSession.skill + ' tutorial')}`;
        latestSession.xpGained          = Math.max(15, Math.round(latestSession.duration / 60));
        await latestSession.save();
      }
    }

    res.json({ ok: true, mentorship: m });
  } catch (err) { next(err); }
};

// POST /api/mentorship/request ────────────────────────────
exports.requestMentorship = async (req, res, next) => {
  try {
    const { mentorId, skill, message } = req.body;
    const studentId = req.user._id;

    if (!mentorId || !skill) return res.status(400).json({ message: 'mentorId and skill are required' });
    if (String(mentorId) === String(studentId)) {
      return res.status(400).json({ message: 'You cannot request mentorship from yourself' });
    }

    const currentRole = req.user.activeRole || req.user.role;
    if (currentRole === 'mentor') {
      return res.status(400).json({ message: 'Please switch to Student View to request mentorship' });
    }

    const mentor = await User.findById(mentorId);
    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
    if (!mentor.skillsToTeach.includes(skill)) {
      return res.status(400).json({ message: `${mentor.name} does not teach ${skill}` });
    }

    // Enforce: one active student per skill per mentor
    const blocking = await Mentorship.findOne({
      mentorId, skill,
      status: { $in: ['pending', 'accepted'] },
    });
    if (blocking) {
      return res.status(409).json({ message: 'This mentor is already occupied for this skill' });
    }

    // Student can't have duplicate pending/accepted for same skill+mentor
    const duplicate = await Mentorship.findOne({
      mentorId, studentId, skill,
      status: { $in: ['pending', 'accepted'] },
    });
    if (duplicate) return res.status(409).json({ message: 'You already have an active request for this skill with this mentor' });

    const m = await Mentorship.create({ mentorId, studentId, skill, message: message || '' });

    await Notification.create({
      userId:  mentorId,
      type:    'request',
      message: `📩 ${req.user.name} requested mentorship for ${skill}`,
    });

    res.status(201).json({ ok: true, mentorship: m });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/respond ────────────────────────
exports.respondMentorship = async (req, res, next) => {
  try {
    const action = req.body.action || req.body.status; // Support both 'action' and 'status' payloads
    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    if (String(m.mentorId) !== String(req.user._id)) return res.status(403).json({ message: 'Not your mentorship' });
    if (m.status !== 'pending') return res.status(400).json({ message: 'Already responded to this request' });

    if (action === 'accept') {
      m.status    = 'accepted';
      m.phase     = 'demo';
      m.startedAt = new Date();
      m.expiresAt = new Date(Date.now() + EIGHT_WEEKS_MS);
      await Notification.create({
        userId:  m.studentId,
        type:    'accept',
        message: `🎉 ${req.user.name} accepted your ${m.skill} mentorship request! Book your demo session.`,
      });
    } else {
      m.status = 'rejected';
      await Notification.create({
        userId:  m.studentId,
        type:    'reject',
        message: `❌ ${req.user.name} is currently at full capacity for ${m.skill} and couldn't accept your request at this time, but highly encourages you to explore other outstanding ${m.skill} mentors!`,
      });
    }

    await m.save();
    res.json({ ok: true, mentorship: m });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/decision ───────────────────────
// Student decides to continue (enroll) or abort after demo
exports.studentDecision = async (req, res, next) => {
  try {
    const { action, weeks } = req.body; // 'continue' | 'abort', weeks: 4|8|12
    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    if (String(m.studentId) !== String(req.user._id)) return res.status(403).json({ message: 'Not your mentorship' });
    if (m.phase !== 'demo') return res.status(400).json({ message: 'Demo phase not active' });

    if (action === 'continue') {
      const numWeeks = parseInt(weeks, 10) || 8;
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      
      m.phase = 'enrolled';
      m.expiresAt = new Date(Date.now() + (numWeeks * msPerWeek));
      
      await awardXP(req.user._id, XP_ENROLLED);
      await Notification.create({
        userId:  m.mentorId,
        type:    'info',
        message: `🔒 ${req.user.name} enrolled for ${numWeeks} weeks in ${m.skill}. Progress is now locked!`,
      });
    } else {
      m.status = 'cancelled';
      await Notification.create({
        userId:  m.mentorId,
        type:    'info',
        message: `${req.user.name} raised a dispute/cancelled ${m.skill} after the demo.`,
      });
    }

    await m.save();
    res.json({ ok: true, mentorship: m });
  } catch (err) { next(err); }
};

// PATCH /api/mentorship/:id/progress ──────────────────────
exports.updateProgress = async (req, res, next) => {
  try {
    const { progress } = req.body;
    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    if (String(m.mentorId) !== String(req.user._id)) return res.status(403).json({ message: 'Not your mentorship' });

    m.progress = Math.min(100, Math.max(0, parseInt(progress, 10)));
    await m.save();
    res.json({ ok: true, mentorship: m });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/complete ───────────────────────
exports.completeMentorship = async (req, res, next) => {
  try {
    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    if (m.status !== 'accepted') return res.status(400).json({ message: 'Mentorship not active' });

    const isMentor  = String(m.mentorId)  === String(req.user._id);
    const isStudent = String(m.studentId) === String(req.user._id);
    if (!isMentor && !isStudent) return res.status(403).json({ message: 'Not a participant' });

    m.status      = 'completed';
    m.completedAt = new Date();
    await m.save();

    // Award XP
    await awardXP(m.studentId, XP_COMPLETED_STUDENT);
    await awardXP(m.mentorId,  XP_COMPLETED_MENTOR);

    // Update mentor's completedMentorships counter
    await User.findByIdAndUpdate(m.mentorId, { $inc: { completedMentorships: 1 } });

    // Badge: Mentor Star (5 completions)
    const mentor = await User.findById(m.mentorId);
    if ((mentor.completedMentorships) >= 5 && !mentor.badges.includes('mentor_star')) {
      mentor.badges.push('mentor_star');
      await mentor.save();
    }

    await Notification.create({ userId: m.studentId, type: 'info', message: `🎓 ${m.skill} mentorship completed! +${XP_COMPLETED_STUDENT} XP earned.` });
    await Notification.create({ userId: m.mentorId,  type: 'info', message: `🎓 ${m.skill} course completed! +${XP_COMPLETED_MENTOR} XP earned.` });

    res.json({ ok: true, mentorship: m });
  } catch (err) { next(err); }
};

// DELETE /api/mentorship/:id/cancel ───────────────────────
exports.cancelMentorship = async (req, res, next) => {
  try {
    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    const isMentor  = String(m.mentorId)  === String(req.user._id);
    const isStudent = String(m.studentId) === String(req.user._id);
    if (!isMentor && !isStudent) return res.status(403).json({ message: 'Not a participant' });

    // Once enrolled, cancellation is LOCKED
    if (m.phase === 'enrolled') return res.status(403).json({ message: 'Cannot cancel — course is locked after enrollment.' });

    m.status = 'cancelled';
    await m.save();
    res.json({ ok: true, mentorship: m });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/rate ───────────────────────────
exports.rateMentor = async (req, res, next) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5' });

    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    if (String(m.studentId) !== String(req.user._id)) return res.status(403).json({ message: 'Only the student can rate' });
    if (m.status !== 'completed') return res.status(400).json({ message: 'Mentorship not completed yet' });
    if (m.rating) return res.status(409).json({ message: 'Already rated' });

    m.rating = rating;
    await m.save();

    // Update mentor's averages
    const mentor = await User.findById(m.mentorId);
    mentor.ratings.push({ value: rating, mentorshipId: m._id });
    mentor.recalcRating();
    // Top Rated badge: ≥4.5 avg with 5+ reviews
    if (mentor.averageRating >= 4.5 && mentor.ratings.length >= 5 && !mentor.badges.includes('top_rated')) {
      mentor.badges.push('top_rated');
    }
    await mentor.save();

    res.json({ ok: true, mentorship: m });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/grade ──────────────────────────
exports.gradeMentorship = async (req, res, next) => {
  try {
    const { score } = req.body;
    const numScore  = parseInt(score, 10);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) return res.status(400).json({ message: 'Score must be 0–100' });

    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    if (String(m.mentorId) !== String(req.user._id)) return res.status(403).json({ message: 'Only mentor can grade' });

    const grade = numScore >= 80 ? 'Distinction' : numScore >= 60 ? 'Merit' : 'Pass';
    m.graduationGrade = grade;
    m.graduationScore = numScore;
    await m.save();

    // XP bonus for Distinction / Merit
    const bonus = grade === 'Distinction' ? XP_DISTINCTION : grade === 'Merit' ? XP_MERIT : 0;
    if (bonus) {
      await awardXP(m.studentId, bonus);
      await awardXP(m.mentorId,  bonus);
      await Notification.create({
        userId:  m.studentId,
        type:    'badge',
        message: `🥇 You achieved ${grade} in ${m.skill}! +${bonus} XP bonus!`,
      });
    }

    res.json({ ok: true, mentorship: m, grade, bonus });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/notify-start ──────────────────
exports.notifySessionStart = async (req, res, next) => {
  try {
    const m = await Mentorship.findById(req.params.id).populate('mentorId', 'name');
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    // Save values BEFORE m.save() clears the populated mentorId
    const mentorId  = m.mentorId._id || m.mentorId;
    const studentId = m.studentId;
    const skill     = m.skill;

    m.activeSession = true;
    m.sessionStartedAt = new Date();
    m.sessionLastHeartbeat = new Date();
    await m.save();

    // AUTO-RECORD: Create the session log entry immediately
    await Session.create({
      mentorshipId: m._id,
      mentorId,
      studentId,
      skill,
      startedAt:    new Date(),
    });

    await Notification.create({
      userId:  m.studentId,
      type:    'info',
      message: `🎥 Live Session Started! ${m.mentorId.name} is waiting for you. Session is being automatically recorded.`,
    });

    res.json({ ok: true, message: 'Session started and recording' });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/end-session ──────────────────
exports.endSession = async (req, res, next) => {
  try {
    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    if (String(m.mentorId) !== String(req.user._id)) return res.status(403).json({ message: 'Only the mentor can end a session' });

    if (!m.activeSession) return res.status(400).json({ message: 'No active session found' });

    const durationSeconds = Math.max(0, Math.round((new Date() - m.sessionStartedAt) / 1000));
    const xp = Math.max(15, Math.round(durationSeconds / 60));

    // Finalize the live session log — find the one without an endedAt
    const latestSession = await Session.findOne({ mentorshipId: m._id, endedAt: null }).sort({ startedAt: -1 });
    if (latestSession) {
      latestSession.endedAt           = new Date();
      latestSession.duration          = durationSeconds;
      latestSession.recordingAvailable = true;
      latestSession.recordingLink     = `https://www.youtube.com/results?search_query=${encodeURIComponent(latestSession.skill + ' tutorial')}`;
      latestSession.xpGained          = xp;
      await latestSession.save();
    }

    // Award XP to both participants
    const User = require('../models/User');
    await User.findByIdAndUpdate(m.mentorId,  { $inc: { xp: xp, weeklyXP: xp } });
    await User.findByIdAndUpdate(m.studentId, { $inc: { xp: xp, weeklyXP: xp } });

    m.activeSession = false;
    m.sessionCount += 1;
    await m.save();

    res.json({ ok: true, message: 'Session ended and recording saved' });
  } catch (err) { next(err); }
};

// POST /api/mentorship/:id/heartbeat ──────────────────
exports.sessionHeartbeat = async (req, res, next) => {
  try {
    const m = await Mentorship.findById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });
    if (String(m.mentorId) !== String(req.user._id)) return res.status(403).json({ message: 'Only mentor sends heartbeats' });

    if (m.activeSession) {
      m.sessionLastHeartbeat = new Date();
      await m.save();
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
};
