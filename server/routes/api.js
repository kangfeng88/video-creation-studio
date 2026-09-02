const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const axios = require('axios');
const Video = require('../models/Video');
const User = require('../models/User');

// Generate video using AI
router.post('/generate-video', authMiddleware, async (req, res) => {
  try {
    const { videoId, prompt, settings } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check credits
    if (user.subscription.credits < 1) {
      return res.status(402).json({ message: 'Insufficient credits' });
    }

    const video = await Video.findById(videoId);
    if (!video || video.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    video.status = 'generating';
    video.prompt = prompt;
    video.settings = settings;
    await video.save();

    // Trigger AI generation (async)
    generateVideoAsync(videoId, prompt, settings, req.userId).catch(err => {
      console.error('Video generation error:', err);
    });

    res.json({ message: 'Video generation started', video });
  } catch (error) {
    res.status(500).json({ message: 'Error generating video', error: error.message });
  }
});

// Async video generation
async function generateVideoAsync(videoId, prompt, settings, userId) {
  try {
    const video = await Video.findById(videoId);
    const startTime = Date.now();

    // Call Runway ML API
    const videoUrl = await callRunwayMLAPI(prompt, settings);

    // Update video
    video.videoUrl = videoUrl;
    video.status = 'completed';
    video.processingTime = Math.floor((Date.now() - startTime) / 1000);
    video.creditsUsed = 1;
    await video.save();

    // Deduct credits
    const user = await User.findById(userId);
    user.subscription.credits -= 1;
    await user.save();

    console.log('Video generation completed:', videoId);
  } catch (error) {
    const video = await Video.findById(videoId);
    video.status = 'failed';
    await video.save();
    console.error('Video generation failed:', error);
  }
}

// Call Runway ML API
async function callRunwayMLAPI(prompt, settings) {
  try {
    const response = await axios.post(
      'https://api.runwayml.com/v1/video_generations',
      {
        prompt,
        model: 'gen3',
        duration: settings.duration || 15,
        width: settings.aspectRatio === '16:9' ? 1280 : 720,
        height: settings.aspectRatio === '16:9' ? 720 : 1280
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.RUNWAY_ML_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.video_url || response.data.output[0];
  } catch (error) {
    console.error('Runway ML API error:', error.response?.data || error.message);
    throw error;
  }
}

// Generate image using Stability AI
router.post('/generate-image', authMiddleware, async (req, res) => {
  try {
    const { prompt, videoId } = req.body;

    const user = await User.findById(req.userId);
    if (user.subscription.credits < 0.5) {
      return res.status(402).json({ message: 'Insufficient credits' });
    }

    const response = await axios.post(
      'https://api.stability.ai/v1/generation/stable-diffusion-3-5-large/text-to-image',
      {
        prompt,
        aspect_ratio: '16:9',
        output_format: 'png'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.STABILITY_AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Deduct credits
    user.subscription.credits -= 0.5;
    await user.save();

    res.json({
      message: 'Image generated',
      imageUrl: response.data.artifacts[0].url
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating image', error: error.message });
  }
});

// Generate speech using ElevenLabs
router.post('/generate-speech', authMiddleware, async (req, res) => {
  try {
    const { text, voiceStyle } = req.body;

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceStyle || 'default'}`,
      {
        text,
        model_id: 'eleven_monolingual_v1'
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ message: 'Speech generated', audioUrl: response.data.url });
  } catch (error) {
    res.status(500).json({ message: 'Error generating speech', error: error.message });
  }
});

// Generate text using OpenAI
router.post('/generate-text', authMiddleware, async (req, res) => {
  try {
    const { prompt, style } = req.body;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{
          role: 'user',
          content: `Generate a video script for: ${prompt}. Style: ${style || 'professional'}`
        }],
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const generatedText = response.data.choices[0].message.content;
    res.json({ message: 'Text generated', text: generatedText });
  } catch (error) {
    res.status(500).json({ message: 'Error generating text', error: error.message });
  }
});

module.exports = router;
