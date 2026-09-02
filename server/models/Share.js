const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shareToken: {
    type: String,
    unique: true,
    required: true
  },
  shareType: {
    type: String,
    enum: ['public', 'link', 'private'],
    default: 'link'
  },
  expiresAt: Date,
  viewCount: { type: Number, default: 0 },
  allowDownload: { type: Boolean, default: false },
  allowComments: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Share', shareSchema);
