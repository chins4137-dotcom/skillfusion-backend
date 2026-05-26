// ============================================================
// SkillFusion — controllers/userController.js
// ============================================================

const User = require('../models/User');
const Mentorship = require('../models/Mentorship');


// GET /api/users/public/:id ───────────────────────────────
exports.getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ok: true, user: user.toPublic() });
  } catch (err) { next(err); }
};

// PATCH /api/users/profile ────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, avatar, skillsToLearn, skillsToTeach } = req.body;
    const user = req.user;

    if (name)           user.name          = name.trim();
    if (bio !== undefined) user.bio         = bio.trim();
    if (avatar)         user.avatar        = avatar;

    // Check skillsToLearn changes (for students)
    if (skillsToLearn) {
      const oldSkills = user.skillsToLearn || [];
      const removedSkills = oldSkills.filter(s => !skillsToLearn.includes(s));
      if (removedSkills.length > 0) {
        // Query if there is an active/pending mentorship for the student for any of these removed skills
        const active = await Mentorship.findOne({
          studentId: user._id,
          skill: { $in: removedSkills },
          status: { $in: ['pending', 'accepted'] }
        });
        if (active) {
          return res.status(400).json({ message: `Cannot remove skill '${active.skill}' because you have a pending or active mentorship for it.` });
        }
      }
      user.skillsToLearn = skillsToLearn;
    }

    // Check skillsToTeach changes (for mentors)
    if (skillsToTeach) {
      // 1. Check if any skill is removed
      const oldSkills = user.skillsToTeach || [];
      const removedSkills = oldSkills.filter(s => !skillsToTeach.includes(s));
      if (removedSkills.length > 0) {
        // Query if there is an active/pending mentorship for the mentor for any of these removed skills
        const active = await Mentorship.findOne({
          mentorId: user._id,
          skill: { $in: removedSkills },
          status: { $in: ['pending', 'accepted'] }
        });
        if (active) {
          return res.status(400).json({ message: `Cannot remove skill '${active.skill}' because you have a pending or active mentorship for it.` });
        }
      }

      // 2. Check if any skill is added and not verified
      const addedSkills = skillsToTeach.filter(s => !oldSkills.includes(s));
      const unverified = addedSkills.filter(s => !(user.verifiedSkills || []).includes(s));
      if (unverified.length > 0) {
        return res.status(400).json({ message: `To teach ${unverified.join(', ')}, you must first pass the verification quiz for those skills.` });
      }

      user.skillsToTeach = skillsToTeach;
    }

    await user.save();
    res.json({ ok: true, user: user.toPublic() });
  } catch (err) { next(err); }
};

// GET /api/users/mentors ──────────────────────────────────
exports.getMentors = async (req, res, next) => {
  try {
    const { skill, search } = req.query;
    const query = { role: { $in: ['mentor', 'admin'] }, banned: false };
    if (skill)  query.skillsToTeach = skill;
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [{ name: re }, { username: re }, { skillsToTeach: re }];
    }

    const mentors = await User.find(query)
      .select('-passwordHash -email -lastLoginIP')
      .sort({ averageRating: -1, xp: -1 });

    res.json({ ok: true, mentors });
  } catch (err) { next(err); }
};

// GET /api/users/leaderboard ──────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const users   = await User.find({ banned: false }).sort({ xp: -1 }).select('-passwordHash -email -lastLoginIP');
    const myIndex = users.findIndex(u => String(u._id) === String(req.user._id));
    const myRank  = myIndex + 1;
    const top10   = users.slice(0, 10);

    // Percentile
    const percentile = users.length > 1
      ? Math.round(((users.length - myRank) / (users.length - 1)) * 100)
      : 100;

    // Rivalry
    const above = myIndex > 0 ? {
      id:     users[myIndex - 1]._id,
      name:   users[myIndex - 1].name,
      avatar: users[myIndex - 1].avatar,
      xp:     users[myIndex - 1].xp,
      xpDiff: users[myIndex - 1].xp - req.user.xp,
    } : null;
    const below = myIndex < users.length - 1 ? {
      id:     users[myIndex + 1]._id,
      name:   users[myIndex + 1].name,
      avatar: users[myIndex + 1].avatar,
      xp:     users[myIndex + 1].xp,
      xpDiff: req.user.xp - users[myIndex + 1].xp,
    } : null;

    res.json({ ok: true, leaderboard: top10, myRank, percentile, rivalry: { above, below }, totalUsers: users.length });
  } catch (err) { next(err); }
};

// GET /api/users/leaderboard/weekly ───────────────────────
exports.getWeeklyLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find({ banned: false }).sort({ weeklyXP: -1 }).limit(10).select('-passwordHash -email');
    res.json({ ok: true, leaderboard: users });
  } catch (err) { next(err); }
};

// GET /api/users/leaderboard/skill/:skill ─────────────────
exports.getSkillLeaderboard = async (req, res, next) => {
  try {
    const { skill } = req.params;
    const users = await User.find({ verifiedSkills: skill, banned: false })
      .sort({ xp: -1 }).limit(10)
      .select('-passwordHash -email');
    res.json({ ok: true, skill, leaderboard: users });
  } catch (err) { next(err); }
};
