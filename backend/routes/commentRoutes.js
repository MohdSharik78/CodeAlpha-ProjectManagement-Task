const express = require('express');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/task/:taskId', auth, async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  const p = await Project.findById(task.project);
  if (!p || !p.members.some(m => m.toString() === req.user._id.toString())) return res.status(403).json({ message: 'Access denied' });
  res.json(await Comment.find({ task: task._id }).populate('user', 'name username').sort({ createdAt: 1 }));
});

router.post('/', auth, async (req, res) => {
  try {
    const { task, text } = req.body;
    if (!task || !text?.trim()) return res.status(400).json({ message: 'Task and comment are required' });
    const t = await Task.findById(task);
    if (!t) return res.status(404).json({ message: 'Task not found' });
    const p = await Project.findById(t.project);
    if (!p || !p.members.some(m => m.toString() === req.user._id.toString())) return res.status(403).json({ message: 'Access denied' });
    const comment = await Comment.create({ task, user: req.user._id, text: text.trim() });
    const full = await Comment.findById(comment._id).populate('user', 'name username');
    const recipients = p.members.filter(m => m.toString() !== req.user._id.toString());
    if (recipients.length) await Notification.insertMany(recipients.map(user => ({ user, message: `${req.user.name} commented on "${t.title}"`, project: p._id, task: t._id })));
    req.app.get('io').to(`project:${p._id}`).emit('comment-added', { taskId: t._id.toString(), comment: full });
    res.status(201).json(full);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});
module.exports = router;
