// ============================================================
// SkillFusion — models/QuizResult.js
// ============================================================

const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill:     { type: String, required: true },
  score:     { type: Number, required: true, min: 0, max: 100 }, // percentage
  passed:    { type: Boolean, required: true },
  abandoned: { type: Boolean, default: false }, // tab-switch detected
  totalQ:    { type: Number, default: 15 },
  correctQ:  { type: Number, default: 0 },
  timeTaken: { type: Number, default: 0 }, // seconds
  ip:        { type: String },
  date:      { type: Date, default: Date.now },
});

quizResultSchema.index({ userId: 1, date: -1 });
quizResultSchema.index({ skill: 1, passed: 1 });

module.exports = mongoose.model('QuizResult', quizResultSchema);
