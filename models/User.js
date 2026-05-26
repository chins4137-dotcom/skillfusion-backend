// ============================================================
// SkillFusion — models/User.js
// ============================================================

const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  value:        { type: Number, min: 1, max: 5, required: true },
  mentorshipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentorship' },
  givenAt:      { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  // Identity
  username:     { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
  email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false }, // never returned by default
  name:         { type: String, required: true, trim: true },
  avatar:       { type: String, default: '🧑' },
  bio:          { type: String, default: '', maxlength: 300 },

  // Role system (dual-role: student + mentor)
  role:         { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
  roles:        [{ type: String, enum: ['student', 'mentor', 'admin'] }],
  activeRole:   { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },

  // Skills
  skillsToLearn:  [{ type: String }],
  skillsToTeach:  [{ type: String }],
  verifiedSkills: [{ type: String }], // passed proctored quiz

  // Gamification
  xp:                   { type: Number, default: 0 },
  weeklyXP:             { type: Number, default: 0 },
  weeklyWins:           { type: Number, default: 0 },
  badges:               [{ type: String }],
  completedMentorships: { type: Number, default: 0 },

  // Mentor ratings
  ratings:       [ratingSchema],
  averageRating: { type: Number, default: 0 },

  // Admin controls
  banned:    { type: Boolean, default: false },
  bannedAt:  { type: Date },
  bannedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Security / tracking
  lastLoginIP: { type: String },
  lastLoginAt: { type: Date },

  joinedAt:  { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON:  { virtuals: true },
  toObject: { virtuals: true },
});

// ── Indexes ──────────────────────────────────────────────
userSchema.index({ xp: -1 });                // leaderboard sort
userSchema.index({ weeklyXP: -1 });          // weekly leaderboard
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

// ── Helper: recalculate averageRating ────────────────────
userSchema.methods.recalcRating = function () {
  if (!this.ratings.length) { this.averageRating = 0; return; }
  const sum = this.ratings.reduce((acc, r) => acc + r.value, 0);
  this.averageRating = Math.round((sum / this.ratings.length) * 10) / 10;
};

// ── Helper: safe public view (no email, no passwordHash) ─
userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.email;
  delete obj.lastLoginIP;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
