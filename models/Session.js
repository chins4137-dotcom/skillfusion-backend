// ============================================================
// SkillFusion — models/Session.js  (Jitsi classroom logs)
// ============================================================

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  mentorshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentorship', required: true },
  mentorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill:        { type: String, required: true },

  // Jitsi room — derived from mentorshipId for determinism
  jitsiRoom: { type: String },

  // Timing
  startedAt: { type: Date, default: Date.now },
  endedAt:   { type: Date },
  duration:  { type: Number, default: 0 }, // seconds

  // Recording metadata (mocked / future integration)
  recordingAvailable: { type: Boolean, default: false },
  recordingLink:      { type: String, default: null },

  // Reward tracking
  xpGained: { type: Number, default: 0 },

}, { timestamps: true });

sessionSchema.index({ mentorshipId: 1 });
sessionSchema.index({ mentorId: 1 });
sessionSchema.index({ studentId: 1 });
sessionSchema.index({ startedAt: -1 }); // for admin global archive

module.exports = mongoose.model('Session', sessionSchema);
