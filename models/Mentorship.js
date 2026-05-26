// ============================================================
// SkillFusion — models/Mentorship.js
// ============================================================

const mongoose = require('mongoose');

const mentorshipSchema = new mongoose.Schema({
  mentorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill:     { type: String, required: true },

  // Status flow: pending → accepted → completed | rejected | cancelled | expired
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled', 'expired'],
    default: 'pending',
  },

  // Phase within an accepted mentorship: request → demo → enrolled → expired
  phase: {
    type: String,
    enum: ['request', 'demo', 'enrolled', 'expired'],
    default: 'request',
  },

  // Student's initial request message
  message: { type: String, default: '' },

  // Progress (0–100), set by mentor via slider
  progress: { type: Number, default: 0, min: 0, max: 100 },

  // Graduation test (mentor grades student)
  graduationGrade: { type: String, enum: ['Pass', 'Merit', 'Distinction', null], default: null },
  graduationScore: { type: Number, default: null },

  // Rating (student rates mentor 1–5 after completion)
  rating: { type: Number, min: 1, max: 5, default: null },

  // Timestamps
  startedAt:   { type: Date },             // when mentor accepted
  expiresAt:   { type: Date },             // startedAt + 8 weeks
  completedAt: { type: Date },

  // Session count (auto-incremented when Jitsi logs a session)
  sessionCount: { type: Number, default: 0 },
  activeSession: { type: Boolean, default: false },
  sessionStartedAt: { type: Date },
  sessionLastHeartbeat: { type: Date },

}, { timestamps: true });

// ── Compound index: one student per skill per mentor ─────
mentorshipSchema.index({ mentorId: 1, skill: 1, status: 1 });
mentorshipSchema.index({ studentId: 1 });

module.exports = mongoose.model('Mentorship', mentorshipSchema);
