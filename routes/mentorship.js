const router = require('express').Router();
const c = require('../controllers/mentorshipController');
const { protect } = require('../middleware/auth');

router.get('/',                 protect, c.getMyMentorships);
router.get('/:id',              protect, c.getMentorshipById);
router.post('/request',         protect, c.requestMentorship);
router.post('/:id/respond',     protect, c.respondMentorship);
router.post('/:id/decision',    protect, c.studentDecision);
router.patch('/:id/progress',   protect, c.updateProgress);
router.post('/:id/complete',    protect, c.completeMentorship);
router.delete('/:id/cancel',    protect, c.cancelMentorship);
router.post('/:id/rate',        protect, c.rateMentor);
router.post('/:id/grade',       protect, c.gradeMentorship);
router.post('/:id/notify-start', protect, c.notifySessionStart);
router.post('/:id/end-session',  protect, c.endSession);
router.post('/:id/heartbeat',    protect, c.sessionHeartbeat);

module.exports = router;
