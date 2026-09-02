const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const Video = require('../models/Video');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'))
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Get all videos (public + user's own)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    let query = { visibility: 'public' };
    if (req.userId) {
      query = {
        $or: [
          { visibility: 'public' },
          { userId: req.userId }
        ]
      };
    }

    const videos = await Video.find(query)
      .populate('userId', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments(query);

    res.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching videos', error: error.message });
  }
});

// Get user's videos
router.get('/user/my-videos', authMiddleware, async (req, res) => {
  try {
    const videos = await Video.find({ userId: req.userId })
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching videos', error: error.message });
  }
});

// Get single video
router.get('/:videoId', optionalAuth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId)
      .populate('userId', 'username avatar');
    
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Check access
    if (video.visibility === 'private' && video.userId._id.toString() !== req.userId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Increment view count
    video.views += 1;
    await video.save();

    res.json(video);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching video', error: error.message });
  }
});

// Create video
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, prompt, settings, visibility } = req.body;

    const video = new Video({
      title,
      description,
      prompt,
      settings,
      visibility: visibility || 'private',
      userId: req.userId,
      status: 'draft'
    });

    await video.save();
    res.status(201).json({ message: 'Video created', video });
  } catch (error) {
    res.status(500).json({ message: 'Error creating video', error: error.message });
  }
});

// Upload asset
router.post('/:videoId/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    
    if (!video || video.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const assetType = req.file.mimetype.split('/')[0];
    video.assets.push({
      type: `/uploads/${req.file.filename}`,
      assetType
    });

    await video.save();
    res.json({ message: 'Asset uploaded', file: req.file.filename, assets: video.assets });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading asset', error: error.message });
  }
});

// Update video
router.put('/:videoId', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    
    if (!video || video.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    Object.assign(video, req.body);
    video.updatedAt = Date.now();
    await video.save();

    res.json({ message: 'Video updated', video });
  } catch (error) {
    res.status(500).json({ message: 'Error updating video', error: error.message });
  }
});

// Delete video
router.delete('/:videoId', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    
    if (!video || video.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Video.findByIdAndDelete(req.params.videoId);
    res.json({ message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting video', error: error.message });
  }
});

module.exports = router;
