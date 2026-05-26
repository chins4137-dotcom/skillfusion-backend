const router = require('express').Router();
const { fileDispute, getDisputes, resolveDispute } = require('../controllers/disputeController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/',          protect, fileDispute);
router.get('/',           protect, adminOnly, getDisputes);
router.patch('/:id/resolve', protect, adminOnly, resolveDispute);

module.exports = router;
