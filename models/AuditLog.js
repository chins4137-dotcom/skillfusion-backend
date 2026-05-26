// ============================================================
// SkillFusion — models/AuditLog.js
// ============================================================

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:    { type: String, enum: ['login', 'logout', 'ban', 'unban', 'quiz_fail', 'quiz_pass'], required: true },
  ip:        { type: String },
  userAgent: { type: String },
  ts:        { type: Date, default: Date.now },
}, { capped: { size: 5242880, max: 5000 } }); // 5MB capped collection

auditLogSchema.index({ userId: 1, ts: -1 });
auditLogSchema.index({ action: 1, ts: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
