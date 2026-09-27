const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
