const router = require('express').Router();
const { getPublicProfile, updateProfile, getMentors, getLeaderboard, getWeeklyLeaderboard, getSkillLeaderboard } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/mentors',                  protect, getMentors);
router.get('/leaderboard',              protect, getLeaderboard);
router.get('/leaderboard/weekly',       protect, getWeeklyLeaderboard);
router.get('/leaderboard/skill/:skill', protect, getSkillLeaderboard);
router.get('/public/:id',               protect, getPublicProfile);
router.patch('/profile',                protect, updateProfile);

module.exports = router;
