const router = require('express').Router();
const { getMessages, sendMessage, markRead, getUnreadCount, respondToSlot } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/unread',              protect, getUnreadCount);
router.get('/:mentorshipId',       protect, getMessages);
router.post('/:mentorshipId',      protect, sendMessage);
router.patch('/:mentorshipId/read',protect, markRead);
router.patch('/message/:messageId', protect, respondToSlot);

module.exports = router;
