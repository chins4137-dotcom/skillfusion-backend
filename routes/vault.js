const router = require('express').Router();
const { getVault, addItem, deleteItem } = require('../controllers/vaultController');
const { protect } = require('../middleware/auth');

router.get('/:mentorshipId',      protect, getVault);
router.post('/:mentorshipId',     protect, addItem);
router.delete('/item/:itemId',    protect, deleteItem);

module.exports = router;
