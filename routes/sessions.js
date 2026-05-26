const router = require('express').Router();
const { getSessions, startSession, stopSession, getRoom } = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

router.get('/room/:mentorshipId',  protect, getRoom);
router.get('/:mentorshipId',       protect, getSessions);
router.post('/start',              protect, startSession);
router.post('/:id/stop',           protect, stopSession);

module.exports = router;
