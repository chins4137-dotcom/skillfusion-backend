// ============================================================
// SkillFusion — models/Dispute.js
// ============================================================

const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  mentorshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentorship', required: true },
  filedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill:        { type: String },
  reason:       { type: String, required: true },
  description:  { type: String, maxlength: 2000 },
  sessionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  status:       { type: String, enum: ['open', 'resolved'], default: 'open' },
  resolution:   { type: String, default: null },
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:   { type: Date },
  filedAt:      { type: Date, default: Date.now },
});

disputeSchema.index({ status: 1, filedAt: -1 });

module.exports = mongoose.model('Dispute', disputeSchema);
