const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

function isMember(project, id) { return project.members.some(m => m._id?.toString() === id || m.toString() === id); }

router.get('/', auth, async (req, res) => {
  const projects = await Project.find({ members: req.user._id }).populate('owner', 'name username').populate('members', 'name username email').sort({ createdAt: -1 });
  res.json(projects);
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name is required' });
    const project = await Project.create({ name, description, owner: req.user._id, members: [req.user._id] });
    const full = await Project.findById(project._id).populate('owner', 'name username').populate('members', 'name username email');
    res.status(201).json(full);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid project id' });
  const project = await Project.findById(req.params.id).populate('owner', 'name username').populate('members', 'name username email');
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!isMember(project, req.user._id.toString())) return res.status(403).json({ message: 'Access denied' });
  res.json(project);
});

router.post('/:id/members', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only project owner can add members' });
    const user = await User.findOne({ username: (req.body.username || '').toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!isMember(project, user._id.toString())) project.members.push(user._id);
    await project.save();
    await Notification.create({ user: user._id, message: `You were added to project "${project.name}"`, project: project._id });
    req.app.get('io').to(`project:${project._id}`).emit('notification', { message: `${user.name} joined the project` });
    const full = await Project.findById(project._id).populate('owner', 'name username').populate('members', 'name username email');
    res.json(full);
  } catch (e) { res.status(500).json({ message: 'Server error' }); }
});

router.delete('/:id', auth, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (project.owner.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only owner can delete the project' });
  await Task.deleteMany({ project: project._id });
  await Project.findByIdAndDelete(project._id);
  res.json({ message: 'Project deleted' });
});

module.exports = router;
