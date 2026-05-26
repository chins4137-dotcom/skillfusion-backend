const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get('/dashboard',        c.getDashboard);
router.get('/users',            c.getUsers);
router.post('/users/:id/ban',   c.banUser);
router.post('/users/:id/unban', c.unbanUser);
router.get('/audits',           c.getAuditLogs);
router.get('/sessions',         c.getAllSessions);
router.get('/disputes',         c.getDisputes);
router.patch('/disputes/:id',   c.resolveDispute);

module.exports = router;
