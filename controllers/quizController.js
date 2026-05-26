// ============================================================
// SkillFusion — controllers/quizController.js
// Proctored skill-verification quiz
// ============================================================

const { getQuestionsForSkill, scoreQuiz, SKILL_TO_CATEGORY } = require('../data/quizBank');
const QuizResult   = require('../models/QuizResult');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog     = require('../models/AuditLog');

const PASS_THRESHOLD = 80; // %
const getIP = (req) => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

// In-memory store of active quiz sessions (cleared on server restart)
// { userId_skill: { questions, startedAt } }
const activeSessions = new Map();

// GET /api/quiz/questions/:skill ──────────────────────────
// Returns questions WITHOUT answers (answers are server-side only)
exports.getQuestions = (req, res) => {
  const { skill } = req.params;
  if (!SKILL_TO_CATEGORY[skill]) {
    return res.status(400).json({ message: `Skill "${skill}" is not in the quiz bank` });
  }

  const questions = getQuestionsForSkill(skill);
  const sessionKey = `${req.user._id}_${skill}`;

  // Store server-side session with start time and questions (including _ans)
  activeSessions.set(sessionKey, { questions, startedAt: Date.now() });

  // Strip _ans before sending to client
  const clientQuestions = questions.map(({ id, q, opts }) => ({ id, q, opts }));

  res.json({ ok: true, skill, questions: clientQuestions, totalQuestions: clientQuestions.length });
};

// POST /api/quiz/submit ───────────────────────────────────
exports.submitQuiz = async (req, res, next) => {
  try {
    const { skill, answers, abandoned } = req.body;
    // answers: { "0": 1, "1": 3, ... }  questionIndex → selected option

    const sessionKey = `${req.user._id}_${skill}`;
    const session    = activeSessions.get(sessionKey);

    // If abandoned (tab-switch detected by frontend)
    if (abandoned) {
      activeSessions.delete(sessionKey);
      await QuizResult.create({
        userId: req.user._id, skill, score: 0,
        passed: false, abandoned: true,
        ip: getIP(req),
      });
      await AuditLog.create({ userId: req.user._id, action: 'quiz_fail', ip: getIP(req) });
      return res.json({ ok: true, score: 0, passed: false, abandoned: true });
    }

    if (!session) return res.status(400).json({ message: 'No active quiz session found. Please restart the quiz.' });

    // Check time limit (15 minutes)
    const elapsed = Date.now() - session.startedAt;
    if (elapsed > 15 * 60 * 1000 + 10000) { // +10s grace
      activeSessions.delete(sessionKey);
      await QuizResult.create({
        userId: req.user._id, skill, score: 0,
        passed: false, abandoned: true,
        ip: getIP(req),
      });
      return res.json({ ok: true, score: 0, passed: false, abandoned: true, reason: 'timeout' });
    }

    // Score the quiz using server-side questions (client can't cheat)
    const { score, correctQ, totalQ } = scoreQuiz(session.questions, answers || {});
    const passed   = score >= PASS_THRESHOLD;
    const timeTaken = Math.round(elapsed / 1000);

    activeSessions.delete(sessionKey);

    // Save result
    await QuizResult.create({
      userId: req.user._id, skill, score, passed,
      correctQ, totalQ, timeTaken, ip: getIP(req),
    });

    // Update user's verifiedSkills & role if passed
    if (passed) {
      const user = req.user;
      if (!user.verifiedSkills.includes(skill)) {
        user.verifiedSkills.push(skill);
      }
      // Promote to mentor role if not already
      if (!user.roles.includes('mentor')) {
        user.roles.push('mentor');
        user.role = 'mentor';
      }
      if (!user.skillsToTeach.includes(skill)) user.skillsToTeach.push(skill);

      // Certified Pro badge
      if (!user.badges.includes('certified_pro')) user.badges.push('certified_pro');

      // XP
      user.xp += 200;
      user.weeklyXP += 200;
      await user.save();

      await Notification.create({
        userId:  user._id,
        type:    'badge',
        message: `🛡️ You passed the ${skill} quiz! Skill verified — you can now mentor students.`,
      });
      await AuditLog.create({ userId: user._id, action: 'quiz_pass', ip: getIP(req) });
    } else {
      await AuditLog.create({ userId: req.user._id, action: 'quiz_fail', ip: getIP(req) });
    }

    res.json({ ok: true, score, passed, correctQ, totalQ, timeTaken, questions: session.questions });
  } catch (err) { next(err); }
};

// GET /api/quiz/results ───────────────────────────────────
exports.getMyResults = async (req, res, next) => {
  try {
    const results = await QuizResult.find({ userId: req.user._id }).sort({ date: -1 });
    res.json({ ok: true, results });
  } catch (err) { next(err); }
};
