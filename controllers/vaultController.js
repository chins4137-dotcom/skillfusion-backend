// ============================================================
// SkillFusion — controllers/vaultController.js
// ============================================================

const VaultItem  = require('../models/VaultItem');
const Mentorship = require('../models/Mentorship');

// GET /api/vault/:mentorshipId ────────────────────────────
exports.getVault = async (req, res, next) => {
  try {
    const items = await VaultItem.find({ mentorshipId: req.params.mentorshipId })
      .sort({ uploadedAt: -1 })
      .populate('uploadedBy', 'name avatar');
    res.json({ ok: true, vault: items });
  } catch (err) { next(err); }
};

// POST /api/vault/:mentorshipId ───────────────────────────
exports.addItem = async (req, res, next) => {
  try {
    const { title, type, url, description } = req.body;
    if (!title || !url) return res.status(400).json({ message: 'Title and URL are required' });

    const m = await Mentorship.findById(req.params.mentorshipId);
    if (!m) return res.status(404).json({ message: 'Mentorship not found' });

    // Only participants can add
    const isParticipant = String(m.mentorId) === String(req.user._id) || String(m.studentId) === String(req.user._id);
    if (!isParticipant) return res.status(403).json({ message: 'Not a participant of this mentorship' });

    const item = await VaultItem.create({
      mentorshipId: req.params.mentorshipId,
      uploadedBy:   req.user._id,
      title, type: type || 'link', url, description: description || '',
    });

    res.status(201).json({ ok: true, item });
  } catch (err) { next(err); }
};

// DELETE /api/vault/item/:itemId ──────────────────────────
exports.deleteItem = async (req, res, next) => {
  try {
    const item = await VaultItem.findById(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (String(item.uploadedBy) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorised to delete this item' });
    }
    await item.deleteOne();
    res.json({ ok: true, message: 'Item deleted' });
  } catch (err) { next(err); }
};
