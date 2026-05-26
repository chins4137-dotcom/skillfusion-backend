// ============================================================
// SkillFusion — models/VaultItem.js
// ============================================================

const mongoose = require('mongoose');

const vaultItemSchema = new mongoose.Schema({
  mentorshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentorship', required: true },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:        { type: String, required: true, maxlength: 200 },
  type:         { type: String, enum: ['video', 'pdf', 'note', 'link'], default: 'link' },
  url:          { type: String, required: true },
  description:  { type: String, default: '', maxlength: 500 },
  uploadedAt:   { type: Date, default: Date.now },
});

vaultItemSchema.index({ mentorshipId: 1, uploadedAt: -1 });

module.exports = mongoose.model('VaultItem', vaultItemSchema);
