const router = require('express').Router();
const { getQuestions, submitQuiz, getMyResults } = require('../controllers/quizController');
const { protect } = require('../middleware/auth');

router.get('/questions/:skill', protect, getQuestions);
router.post('/submit',          protect, submitQuiz);
router.get('/results',          protect, getMyResults);

module.exports = router;
