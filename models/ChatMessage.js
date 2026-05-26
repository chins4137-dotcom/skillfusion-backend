// ============================================================
// SkillFusion — models/ChatMessage.js
// ============================================================

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  mentorshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentorship', required: true },
  senderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:      { type: String, required: true, maxlength: 2000 },
  read:         { type: Boolean, default: false },
  timestamp:    { type: Date, default: Date.now },
  
  // Custom properties for slot booking
  messageType:  { type: String, enum: ['text', 'slot_request'], default: 'text' },
  slotDay:      { type: String },
  slotTime:     { type: String },
  slotStatus:   { type: String, enum: ['pending', 'accepted', 'rejected', 'expired'] },
}, { timestamps: false });

chatMessageSchema.index({ mentorshipId: 1, timestamp: 1 });
chatMessageSchema.index({ receiverId: 1, read: 1 }); // for unread count

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
