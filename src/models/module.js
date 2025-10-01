const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'pdf', 'link', 'text'], required: true },
  url: { type: String },
  text: { type: String },
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
});

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'dislike'], required: true },
  createdAt: { type: Date, default: Date.now },
});

const ReleaseSchema = new mongoose.Schema({
  version: { type: String, required: true },
  releasedAt: { type: Date, default: Date.now },
  notes: { type: String },
});

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  description: { type: String },
  // Added fields for Courses UI/filters
  category: { type: String, index: true },
  role: { type: String, index: true },
  visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
  isArchived: { type: Boolean, default: false, index: true },

  assets: [AssetSchema],
  reactions: [ReactionSchema],
  releases: [ReleaseSchema],
  notifications: [NotificationSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ModuleSchema.index({ title: 1, category: 1, role: 1 });

module.exports = mongoose.model('Module', ModuleSchema);
