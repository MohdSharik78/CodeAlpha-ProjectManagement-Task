const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

async function projectAccess(id, userId) {
  const p = await Project.findById(id);
  if (!p) return null;
  if (!p.members.some(m => m.toString() === userId.toString())) return false;
  return p;
}

router.get('/project/:projectId', auth, async (req, res) => {
  const p = await projectAccess(req.params.projectId, req.user._id);
  if (!p) return res.status(403).json({ message: 'Project access denied' });
  const tasks = await Task.find({ project: p._id }).populate('assignedTo', 'name username').populate('createdBy', 'name username').sort({ createdAt: -1 });
  res.json(tasks);
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, project, assignedTo, status, priority, dueDate } = req.body;
    if (!title || !project) return res.status(400).json({ message: 'Title and project are required' });
    const p = await projectAccess(project, req.user._id);
    if (!p) return res.status(403).json({ message: 'Project access denied' });
    if (assignedTo && !p.members.some(m => m.toString() === assignedTo)) return res.status(400).json({ message: 'Assignee must be a project member' });
    const task = await Task.create({ title, description, project, assignedTo: assignedTo || null, createdBy: req.user._id, status: status || 'todo', priority: priority || 'medium', dueDate: dueDate || null });
    const full = await Task.findById(task._id).populate('assignedTo', 'name username').populate('createdBy', 'name username');
    if (assignedTo) {
      await Notification.create({ user: assignedTo, message: `You were assigned task "${title}"`, project, task: task._id });
    }
    req.app.get('io').to(`project:${project}`).emit('task-created', full);
    res.status(201).json(full);
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const p = await projectAccess(task.project, req.user._id);
    if (!p) return res.status(403).json({ message: 'Access denied' });
    const allowed = ['title','description','status','priority','dueDate','assignedTo'];
    allowed.forEach(k => { if (req.body[k] !== undefined) task[k] = req.body[k] === '' ? null : req.body[k]; });
    if (task.assignedTo && !p.members.some(m => m.toString() === task.assignedTo.toString())) return res.status(400).json({ message: 'Assignee must be a project member' });
    await task.save();
    const full = await Task.findById(task._id).populate('assignedTo', 'name username').populate('createdBy', 'name username');
    if (req.body.assignedTo) await Notification.create({ user: req.body.assignedTo, message: `You were assigned task "${task.title}"`, project: task.project, task: task._id });
    req.app.get('io').to(`project:${task.project}`).emit('task-updated', full);
    res.json(full);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', auth, async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  const p = await projectAccess(task.project, req.user._id);
  if (!p) return res.status(403).json({ message: 'Access denied' });
  await Task.findByIdAndDelete(task._id);
  req.app.get('io').to(`project:${task.project}`).emit('task-deleted', task._id.toString());
  res.json({ message: 'Task deleted' });
});

module.exports = router;
