const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'generating', 'completed', 'failed'],
    default: 'draft'
  },
  prompt: {
    text: String,
    style: String,
    tone: String
  },
  assets: [{
    type: String, // URL or file path
    assetType: String, // 'image', 'video', 'audio', 'text'
    uploadedAt: { type: Date, default: Date.now }
  }],
  settings: {
    aspectRatio: { type: String, default: '9:16' }, // 9:16, 16:9, 1:1
    resolution: { type: String, default: '720p' }, // 720p, 1080p
    duration: { type: Number, default: 15 }, // seconds
    fps: { type: Number, default: 24 },
    generateAudio: { type: Boolean, default: true },
    audioStyle: String, // background music style
    voiceStyle: String
  },
  videoUrl: String,
  thumbnailUrl: String,
  processingTime: Number, // in seconds
  creditsUsed: { type: Number, default: 0 },
  aiProvider: { type: String, enum: ['runway', 'stability', 'openai', 'custom'], default: 'runway' },
  metadata: {
    width: Number,
    height: Number,
    fileSize: Number,
    codec: String
  },
  visibility: {
    type: String,
    enum: ['private', 'public', 'unlisted'],
    default: 'private'
  },
  tags: [String],
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  isTemplate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for faster queries
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ visibility: 1, createdAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
