const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();
router.get('/', auth, async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30)));
router.patch('/:id/read', auth, async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) return res.status(404).json({ message: 'Notification not found' });
  res.json(n);
});
router.patch('/read-all', auth, async (req, res) => { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); res.json({ message: 'All notifications marked as read' }); });
module.exports = router;
