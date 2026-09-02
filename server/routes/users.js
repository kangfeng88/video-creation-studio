const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const User = require('../models/User');
const crypto = require('crypto');

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, email, avatar, settings } = req.body;
    const user = await User.findById(req.userId);
    
    if (username) user.username = username;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;
    if (settings) user.settings = { ...user.settings, ...settings };
    
    await user.save();
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Get API keys
router.get('/api-keys', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('apiKeys');
    res.json(user.apiKeys || []);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching API keys', error: error.message });
  }
});

// Add API key
router.post('/api-keys', authMiddleware, async (req, res) => {
  try {
    const { name, key, provider } = req.body;
    const user = await User.findById(req.userId);
    
    user.apiKeys.push({
      name,
      key,
      provider
    });
    
    await user.save();
    res.status(201).json({ message: 'API key added', apiKeys: user.apiKeys });
  } catch (error) {
    res.status(500).json({ message: 'Error adding API key', error: error.message });
  }
});

// Delete API key
router.delete('/api-keys/:keyId', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.apiKeys = user.apiKeys.filter(k => k._id.toString() !== req.params.keyId);
    await user.save();
    res.json({ message: 'API key deleted', apiKeys: user.apiKeys });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting API key', error: error.message });
  }
});

// Get subscription info
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('subscription');
    res.json(user.subscription);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription', error: error.message });
  }
});

module.exports = router;
