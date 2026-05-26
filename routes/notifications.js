const router = require('express').Router();
const { getNotifications, markAllRead, markOneRead, clearAll } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/',         protect, getNotifications);
router.patch('/read',   protect, markAllRead);
router.patch('/:id/read', protect, markOneRead);
router.delete('/',      protect, clearAll);

module.exports = router;
