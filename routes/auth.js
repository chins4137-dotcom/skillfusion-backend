const router = require('express').Router();
const { register, login, getMe, toggleRole, addRole } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register',    register);
router.post('/login',       login);
router.get('/me',           protect, getMe);
router.post('/toggle-role', protect, toggleRole);
router.post('/add-role',    protect, addRole);

module.exports = router;
